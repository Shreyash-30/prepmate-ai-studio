"""
Gemini AI Client
Handles initialization and communication with Google Gemini API
"""
import os
import time
from typing import Optional
import logging
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, DeadlineExceeded

logger = logging.getLogger(__name__)


class GeminiClient:
    """Client for interacting with Google Gemini API"""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize Gemini client with API key from environment or parameter
        
        Args:
            api_key: Optional API key. If not provided, attempts to load from environment.
                    If no key is available, initializes in degraded mode.
        """
        if api_key is None:
            api_key = os.getenv("GEMINI_API_KEY")
        
        self.api_key = api_key
        self.model = None
        self.available = False
        
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
            logger.warning("⚠️ GEMINI_API_KEY not configured. LLM features will be unavailable.")
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

    async def generate_response(
        self,
        prompt: str,
        temperature: float = 0.4,
        max_tokens: int = 2048,
        retry_count: int = 3,
        timeout: int = 30,
    ) -> str:
        """
        Generate response from Gemini API with retry and timeout handling

        Args:
            prompt: The input prompt for the model
            temperature: Controls randomness (0.0-1.0), lower = more deterministic
            max_tokens: Maximum tokens in response
            retry_count: Number of retries on failure
            timeout: Timeout in seconds

        Returns:
            Generated response text, or fallback message if API unavailable
        """
        # Check if Gemini is available
        if not self.available or not self.model:
            logger.warning("⚠️ Gemini API not available. Returning degraded response.")
            return self._get_fallback_response(
                "LLM service is currently unavailable. This feature requires Gemini API configuration."
            )
        
        for attempt in range(retry_count):
            try:
                logger.debug(f"Gemini generation attempt {attempt + 1}/{retry_count}")

                response = self.model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=temperature,
                        max_output_tokens=max_tokens,
                        top_p=0.95,
                        top_k=40,
                    ),
                    safety_settings=self.safety_settings,
                )

                # Check if response is valid
                if response.text:
                    logger.debug("Successfully generated response from Gemini")
                    return response.text.strip()
                else:
                    logger.warning(
                        f"Empty response from Gemini: {response.prompt_feedback}"
                    )
                    if attempt < retry_count - 1:
                        await self._wait_before_retry(attempt)
                        continue
                    return self._get_fallback_response(
                        "I need more context to provide a helpful response. Please provide additional details."
                    )

            except ResourceExhausted as e:
                logger.warning(f"Rate limit exceeded (attempt {attempt + 1}): {str(e)}")
                if attempt < retry_count - 1:
                    wait_time = self._exponential_backoff(attempt)
                    logger.info(f"Waiting {wait_time} seconds before retry...")
                    await self._wait_before_retry(attempt)
                else:
                    return self._get_fallback_response(
                        "Service is currently busy. Please try again in a moment."
                    )

            except DeadlineExceeded as e:
                logger.warning(f"Request timeout (attempt {attempt + 1}): {str(e)}")
                if attempt < retry_count - 1:
                    await self._wait_before_retry(attempt)
                else:
                    return self._get_fallback_response(
                        "Request timed out. Please try with a simpler prompt."
                    )

            except Exception as e:
                logger.error(f"Unexpected error in Gemini generation: {str(e)}")
                if attempt < retry_count - 1:
                    await self._wait_before_retry(attempt)
                else:
                    return self._get_fallback_response(
                        f"An error occurred: {str(e)[:100]}"
                    )

        return self._get_fallback_response(
            "Unable to generate response after multiple attempts."
        )

    @staticmethod
    async def _wait_before_retry(attempt: int):
        """Wait before retrying with exponential backoff"""
        wait_time = 2 ** attempt
        await __import__("asyncio").sleep(wait_time)

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
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=2048,
                ),
                safety_settings=self.safety_settings,
                stream=True,
            )

            for chunk in response:
                if chunk.text:
                    yield chunk.text

        except Exception as e:
            logger.error(f"Error in streaming generation: {str(e)}")
            yield f"Error: {str(e)}"

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

        return await self.generate_response(prompt=full_prompt, temperature=temperature)


# Global instance
_gemini_client: Optional[GeminiClient] = None


def get_gemini_client() -> GeminiClient:
    """Get or create Gemini client instance"""
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = GeminiClient()
    return _gemini_client


async def initialize_gemini() -> None:
    """Initialize Gemini client on application startup
    
    Non-fatal initialization - logs warning if unavailable but doesn't crash startup
    """
    try:
        client = get_gemini_client()
        
        # Skip test if not available
        if not client.available:
            logger.warning("⚠️ Gemini API not configured - LLM features will be unavailable")
            return
        
        # Test connection if available
        test_response = await client.generate_response(
            "Say 'Gemini API is working' in exactly these words.",
            temperature=0.0,
        )
        if test_response and "working" in test_response.lower():
            logger.info("✅ Gemini API connection verified")
        else:
            logger.warning("⚠️ Gemini API test returned unexpected response")
    except Exception as e:
        logger.warning(f"⚠️ Failed to initialize Gemini: {str(e)}. LLM features will be unavailable.")
        # Don't re-raise - allow app to start with degraded functionality


def is_gemini_available() -> bool:
    """Check if Gemini API is available and ready to use
    
    Returns:
        True if Gemini is configured and available, False otherwise
    """
    try:
        client = get_gemini_client()
        return client.available
    except Exception:
        return False
