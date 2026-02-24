"""
Gemini AI Client (Enhanced with Multi-Provider Fallback)
Handles initialization and communication with Google Gemini API
Falls back to Groq and Together AI if Gemini quota/limits exceeded

Architecture:
- Primary: Google Gemini (highest quality)
- Fallback 1: Groq (fast, high quota) - If Gemini fails
- Fallback 2: Together AI (reliable alternative)
"""
import os
import time
from typing import Optional
import logging
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, DeadlineExceeded

# Import the multi-provider router
from .llm_provider_router import get_llm_router

logger = logging.getLogger(__name__)


class GeminiClient:
    """Client for interacting with Google Gemini API with fallback providers
    
    Maintains backward compatibility while adding automatic failover to Groq and Together AI
    """

    def __init__(self, api_key: Optional[str] = None):
        """Initialize Gemini client with fallback to Groq/Together AI
        
        Args:
            api_key: Optional API key. If not provided, attempts to load from environment.
                    If no key is available, initializes in degraded mode.
        """
        if api_key is None:
            api_key = os.getenv("GEMINI_API_KEY")
        
        self.api_key = api_key
        self.model = None
        self.available = False
        
        # Initialize multi-provider router
        self.router = get_llm_router()
        
        if api_key:
            try:
                genai.configure(api_key=api_key)
                self.model = genai.GenerativeModel("gemini-2.5-flash")
                self.available = True
                logger.info("✅ Gemini client initialized successfully")
            except Exception as e:
                logger.warning(f"⚠️ Failed to configure Gemini: {str(e)}")
                self.available = False
        else:
            logger.warning("⚠️ GEMINI_API_KEY not configured. Will fallback to Groq/Together AI.")
            self.available = False
        
        self.safety_settings = [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_LOW_AND_ABOVE",
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_LOW_AND_ABOVE",
            },
        ]

    async def generate_content(
        self,
        prompt: str,
        system_prompt: str = "",
        temperature: float = 0.4,
        max_tokens: int = 2048,
        retry_count: int = 3,
        timeout: int = 30,
        provider: Optional[str] = None,
    ) -> str:
        """
        Generate response from Gemini or fallback providers with automatic failover

        Args:
            prompt: The input prompt for the model
            temperature: Controls randomness (0.0-1.0), lower = more deterministic
            max_tokens: Maximum tokens in response
            retry_count: Number of retries on failure
            timeout: Timeout in seconds
            provider: Optional preferred provider (gemini, groq, together)

        Returns:
            Generated response text, or fallback message if all APIs unavailable
        """
        # Use multi-provider router
        result = await self.router.generate_content(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            retry_count=retry_count,
            timeout=timeout,
            provider=provider or 'gemini'
        )

        if result['success']:
            logger.debug(f"Response generated via {result['provider']} in {result['latency']:.0f}ms")
            return result['content']
        else:
            logger.warning(f"All LLM providers failed: {result['content']}")
            return result['content']

    @staticmethod
    async def _wait_before_retry(attempt: int):
        """Wait before retrying with exponential backoff"""
        import asyncio
        wait_time = 2 ** attempt
        await asyncio.sleep(wait_time)

    @staticmethod
    def _exponential_backoff(attempt: int) -> int:
        """Calculate exponential backoff time"""
        return min(2 ** attempt, 60)  # Cap at 60 seconds

    @staticmethod
    def _get_fallback_response(message: str) -> str:
        """Return fallback response when Gemini fails"""
        logger.warning(f"Using fallback response: {message}")
        return message

    async def generate_streaming_response(
        self,
        prompt: str,
        temperature: float = 0.4,
    ):
        """
        Generate streaming response from Gemini (for real-time interaction)

        Args:
            prompt: The input prompt
            temperature: Temperature setting

        Returns:
            Async generator yielding response chunks
        """
        try:
            import asyncio
            loop = asyncio.get_event_loop()
            
            response = await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    lambda: self.model.generate_content(
                        prompt,
                        generation_config=genai.types.GenerationConfig(
                            temperature=temperature,
                            max_output_tokens=2048,
                        ),
                        safety_settings=self.safety_settings,
                        stream=True,
                    ),
                ),
                timeout=30,
            )

            for chunk in response:
                if chunk.text:
                    yield chunk.text

        except Exception as e:
            logger.error(f"Error in streaming generation: {str(e)}")
            logger.info("Falling back to non-streaming response...")
            
            # Fall back to non-streaming
            result = await self.generate_content(prompt=prompt, temperature=temperature)
            yield result

    async def generate_structured_response(
        self,
        prompt: str,
        expected_format: str = "json",
        temperature: float = 0.4,
    ) -> str:
        """
        Generate structured response in expected format

        Args:
            prompt: The input prompt
            expected_format: Format of expected response (json, markdown, yaml)
            temperature: Temperature setting

        Returns:
            Structured response text
        """
        format_instruction = {
            "json": "Return the response as valid JSON only, no additional text.",
            "markdown": "Format the response using markdown syntax.",
            "yaml": "Return the response as valid YAML format.",
        }.get(expected_format, "")

        full_prompt = f"{prompt}\n\n{format_instruction}" if format_instruction else prompt

        return await self.generate_content(prompt=full_prompt, temperature=temperature)

    def get_provider_health(self) -> dict:
        """Get health status of all LLM providers"""
        return self.router.get_provider_status()

    def reset_provider_health(self, provider: Optional[str] = None):
        """Reset health metrics for a provider (for recovery)"""
        self.router.reset_provider_metrics(provider)


# Global instance
_gemini_client: Optional[GeminiClient] = None


def get_gemini_client() -> GeminiClient:
    """Get or create Gemini client instance (now with multi-provider fallback)"""
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = GeminiClient()
    return _gemini_client


async def initialize_gemini() -> None:
    """Initialize Gemini client on application startup
    
    Non-fatal initialization - logs warning if unavailable but doesn't crash startup
    Now includes multi-provider health check
    """
    try:
        client = get_gemini_client()
        
        # Check provider status
        health = client.get_provider_health()
        logger.info(f"📊 Provider Health: {health}")
        
        # Test with multi-provider router
        if any(health['providers'].values()):
            test_response = await client.generate_content(
                "Say 'LLM system is working' in exactly these words.",
                temperature=0.0,
            )
            if test_response and "working" in test_response.lower():
                logger.info("✅ Multi-provider LLM system verified")
            else:
                logger.warning("⚠️ LLM test returned unexpected response")
        else:
            logger.warning("⚠️ No LLM providers configured - LLM features will be unavailable")

    except Exception as e:
        logger.warning(f"⚠️ Failed to initialize LLM system: {str(e)}. Features will be unavailable.")
        # Don't re-raise - allow app to start with degraded functionality


def is_gemini_available() -> bool:
    """Check if any LLM provider is available
    
    Returns:
        True if at least one LLM provider (Gemini, Groq, or Together AI) is configured
    """
    try:
        client = get_gemini_client()
        health = client.get_provider_health()
        
        # Check if any provider is healthy
        return any(
            status['status'] == 'healthy'
            for status in health['providers'].values()
        )
    except Exception:
        return False
