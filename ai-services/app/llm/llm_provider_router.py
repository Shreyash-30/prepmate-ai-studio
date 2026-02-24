"""
Multi-Provider LLM Router
Supports Gemini (primary), Groq (fallback), and Together AI (fallback 2)
Handles automatic failover when quota limits are reached

Architecture:
- Gemini: Primary provider (highest quality, quota-limited)
- Groq: Fallback 1 (fast, high quota)
- Together AI: Fallback 2 (reliable alternative)
"""

import os
import asyncio
import logging
from typing import Optional, List
from enum import Enum
from pathlib import Path

# Load environment variables
try:
    from dotenv import load_dotenv
    env_file = Path(__file__).parent.parent.parent / '.env'
    if env_file.exists():
        load_dotenv(env_file, override=True)
except ImportError:
    pass

import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, DeadlineExceeded

logger = logging.getLogger(__name__)


class ProviderStatus(str, Enum):
    """Provider health status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"


class ProviderMetrics:
    """Track provider performance metrics"""
    def __init__(self, name: str):
        self.name = name
        self.status = ProviderStatus.HEALTHY
        self.failure_count = 0
        self.success_count = 0
        self.total_calls = 0
        self.avg_latency = 0.0
        self.last_error = None
        self.last_failure_time = None


class LLMProviderRouter:
    """
    Router for managing multiple LLM providers with automatic failover
    
    Priority order:
    1. Gemini (primary) - highest quality
    2. Groq (fallback) - fast, reliable
    3. Together AI (fallback 2) - alternative
    """

    def __init__(self):
        """Initialize all LLM providers"""
        self.providers = {}
        self.metrics = {}
        self.groq_client = None
        self._initialize_providers()

    def _initialize_providers(self):
        """Initialize all available providers"""
        # Gemini
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                genai.configure(api_key=gemini_key)
                self.providers['gemini'] = genai.GenerativeModel("gemini-2.5-flash")
                self.metrics['gemini'] = ProviderMetrics("Gemini")
                logger.info("✅ Gemini provider initialized")
            except Exception as e:
                logger.warning(f"⚠️ Failed to initialize Gemini: {e}")
                self.providers['gemini'] = None

        # Groq
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key:
            try:
                import groq
                self.groq_client = groq.Groq(api_key=groq_key)
                self.providers['groq'] = True  # Just marker
                self.metrics['groq'] = ProviderMetrics("Groq")
                logger.info("✅ Groq provider initialized")
            except ImportError:
                logger.warning("⚠️ Groq library not installed. Install with: pip install groq")
                self.providers['groq'] = None
                self.groq_client = None
            except Exception as e:
                logger.warning(f"⚠️ Failed to initialize Groq: {e}")
                self.providers['groq'] = None
                self.groq_client = None

        # Together AI
        together_key = os.getenv("TOGETHER_API_KEY")
        if together_key:
            try:
                import together
                together.api_key = together_key
                self.providers['together'] = True  # Just marker
                self.metrics['together'] = ProviderMetrics("Together AI")
                logger.info("✅ Together AI provider initialized")
            except ImportError:
                logger.warning("⚠️ Together library not installed. Install with: pip install together")
                self.providers['together'] = None
            except Exception as e:
                logger.warning(f"⚠️ Failed to initialize Together AI: {e}")
                self.providers['together'] = None

        # Safety settings (for Gemini)
        self.safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_LOW_AND_ABOVE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_LOW_AND_ABOVE"},
        ]

    async def generate_content(
        self,
        prompt: str,
        system_prompt: str = "",
        temperature: float = 0.4,
        max_tokens: int = 2048,
        retry_count: int = 2,
        timeout: int = 20,
        provider: Optional[str] = None,
    ) -> dict:
        """
        Generate response from LLM with automatic failover

        Args:
            prompt: The input prompt
            temperature: Randomness (0.0-1.0)
            max_tokens: Max response tokens
            retry_count: Number of retries per provider
            timeout: Timeout in seconds
            provider: Optional preferred provider (gemini, groq, together)

        Returns:
            {
                'success': bool,
                'content': str (the generated response),
                'provider': str (which provider was used),
                'latency': float (response time in ms),
                'status': str (healthy|degraded|unavailable)
            }
        """
        import time
        providers_to_try = self._get_provider_order(provider)

        for provider_name in providers_to_try:
            if provider_name not in self.providers or not self.providers[provider_name]:
                logger.debug(f"⏭️ {provider_name} not available, skipping")
                continue

            metrics = self.metrics.get(provider_name)
            if metrics and metrics.status == ProviderStatus.UNAVAILABLE:
                logger.debug(f"⏭️ {provider_name} marked unavailable, skipping")
                continue

            logger.info(f"🔄 Attempting {provider_name}...")
            start_time = time.time()

            try:
                if provider_name == 'gemini':
                    response = await self._call_gemini(
                        prompt, system_prompt, temperature, max_tokens, retry_count, timeout
                    )
                elif provider_name == 'groq':
                    response = await self._call_groq(
                        prompt, system_prompt, temperature, max_tokens, retry_count, timeout
                    )
                elif provider_name == 'together':
                    response = await self._call_together(
                        prompt, system_prompt, temperature, max_tokens, retry_count, timeout
                    )
                else:
                    continue

                latency = (time.time() - start_time) * 1000  # Convert to ms

                # Update metrics
                if metrics:
                    metrics.success_count += 1
                    metrics.total_calls += 1
                    metrics.status = ProviderStatus.HEALTHY
                    metrics.avg_latency = (metrics.avg_latency + latency) / 2
                    metrics.last_error = None

                logger.info(f"✅ {provider_name} responded in {latency:.0f}ms")

                return {
                    'success': True,
                    'content': response,
                    'provider': provider_name,
                    'latency': latency,
                    'status': 'healthy',
                }

            except ResourceExhausted as e:
                logger.warning(f"⚠️ {provider_name} quota exceeded: {str(e)}")
                if metrics:
                    metrics.failure_count += 1
                    metrics.status = ProviderStatus.DEGRADED
                    metrics.last_error = str(e)
                # Try next provider
                continue

            except DeadlineExceeded as e:
                logger.warning(f"⚠️ {provider_name} timeout: {str(e)}")
                if metrics:
                    metrics.failure_count += 1
                    metrics.status = ProviderStatus.DEGRADED
                # Try next provider
                continue

            except Exception as e:
                logger.warning(f"⚠️ {provider_name} error: {str(e)}")
                if metrics:
                    metrics.failure_count += 1
                    if metrics.failure_count >= 3:
                        metrics.status = ProviderStatus.UNAVAILABLE
                    metrics.last_error = str(e)
                # Try next provider
                continue

        # All providers failed
        logger.error("❌ All LLM providers failed")
        return {
            'success': False,
            'content': 'All LLM providers are currently unavailable. Please try again later.',
            'provider': None,
            'latency': None,
            'status': 'unavailable',
        }

    async def _call_gemini(
        self, prompt: str, system_prompt: str, temperature: float, max_tokens: int, retry_count: int, timeout: int
    ) -> str:
        """Call Gemini API"""
        # For Gemini 2.x, we should ideally use the system_instruction in GenerativeModel constructor,
        # but since the model is pre-initialized, we'll prepend it to the prompt or use a special chat object.
        # Alternatively, we can re-initialize if system_prompt changes, but that's expensive.
        # Let's use a simpler approach: if system_prompt exists, combine it.
        
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\nUser: {prompt}"
            
        model = self.providers['gemini']
        for attempt in range(retry_count):
            try:
                # Run in executor to prevent blocking
                loop = asyncio.get_event_loop()
                response = await asyncio.wait_for(
                    loop.run_in_executor(
                        None,
                        lambda: model.generate_content(
                            full_prompt,
                            generation_config=genai.types.GenerationConfig(
                                temperature=temperature,
                                max_output_tokens=max_tokens,
                                top_p=0.95,
                                top_k=40,
                            ),
                            safety_settings=self.safety_settings,
                        ),
                    ),
                    timeout=timeout,
                )

                if response.text:
                    return response.text.strip()
                else:
                    if attempt < retry_count - 1:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    raise Exception("Empty response from Gemini")

            except asyncio.TimeoutError:
                raise DeadlineExceeded("Gemini request timed out")
            except Exception as e:
                if "quota" in str(e).lower():
                    raise ResourceExhausted(str(e))
                if attempt < retry_count - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise

    async def _call_groq(
        self, prompt: str, system_prompt: str, temperature: float, max_tokens: int, retry_count: int, timeout: int
    ) -> str:
        """Call Groq API - Uses llama-3.3-70b-versatile with fallback to 8b-instant"""
        try:
            import groq
        except ImportError:
            raise Exception("Groq library not installed")

        models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-70b-8192"]
        
        last_error = None
        for model_name in models:
            for attempt in range(retry_count):
                try:
                    logger.info(f"💾 Groq: Trying model {model_name} (attempt {attempt+1})")
                    
                    messages = []
                    if system_prompt:
                        messages.append({"role": "system", "content": system_prompt})
                    messages.append({"role": "user", "content": prompt})
                    
                    loop = asyncio.get_event_loop()
                    response = await asyncio.wait_for(
                        loop.run_in_executor(
                            None,
                            lambda: self.groq_client.chat.completions.create(
                                model=model_name,
                                messages=messages,
                                temperature=temperature,
                                max_tokens=min(max_tokens, 8192),
                                top_p=0.95,
                            ),
                        ),
                        timeout=timeout,
                    )

                    if response.choices and response.choices[0].message.content:
                        return response.choices[0].message.content.strip()
                    else:
                        if attempt < retry_count - 1:
                            await asyncio.sleep(2 ** attempt)
                            continue
                        raise Exception(f"Empty response from Groq model {model_name}")

                except asyncio.TimeoutError:
                    last_error = DeadlineExceeded(f"Groq model {model_name} timed out")
                    break # Try next model
                except Exception as e:
                    last_error = e
                    error_msg = str(e).lower()
                    if "quota" in error_msg or "rate limit" in error_msg or "429" in error_msg:
                        logger.warning(f"⚠️ Groq model {model_name} rate limited: {error_msg}")
                        break # Try next model
                    
                    if attempt < retry_count - 1:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    break # Try next model
        
        # If all models failed
        if "quota" in str(last_error).lower():
            raise ResourceExhausted(str(last_error))
        raise last_error

    async def call_groq_fast(
        self, prompt: str, temperature: float = 0.4, max_tokens: int = 1024
    ) -> dict:
        """
        Call Groq with fast Llama-3.1-8B model
        
        Optimized for:
        - High-volume requests
        - Lightweight scoring / planners
        - Low-latency production needs
        
        Uses 128k context window for flexibility
        """
        result = await self.generate_content(
            prompt=prompt,
            temperature=temperature,
            max_tokens=min(max_tokens, 4096),  # Llama-3.1-8B has 128k context
            provider='groq',
        )
        
        # Log that fast model was used
        if result.get('provider') == 'groq':
            logger.info(f"📱 Groq fast model (Llama-3.1-8B) used for low-latency request")
        
        return result

    async def call_groq_flagship(
        self, prompt: str, temperature: float = 0.4, max_tokens: int = 2048
    ) -> dict:
        """
        Call Groq with flagship Llama-3.3-70B model
        
        Optimized for:
        - Complex reasoning pipelines
        - Adaptive planning
        - Analytics generation
        - High-quality outputs
        
        Successor to older llama3-70b-8192 - recommended for production
        """
        result = await self.generate_content(
            prompt=prompt,
            temperature=temperature,
            max_tokens=min(max_tokens, 8192),
            provider='groq',
        )
        
        if result.get('provider') == 'groq':
            logger.info(f"⭐ Groq flagship model (Llama-3.3-70B) used for complex reasoning")
        
        return result

    async def _call_together(
        self, prompt: str, system_prompt: str, temperature: float, max_tokens: int, retry_count: int, timeout: int
    ) -> str:
        """Call Together AI API"""
        import together

        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\nUser: {prompt}"

        for attempt in range(retry_count):
            try:
                loop = asyncio.get_event_loop()
                response = await asyncio.wait_for(
                    loop.run_in_executor(
                        None,
                        lambda: together.Complete.create(
                            prompt=full_prompt,
                            model="meta-llama/Llama-3-70b-chat-hf",
                            max_tokens=max_tokens,
                            temperature=temperature,
                            top_p=0.95,
                        ),
                    ),
                    timeout=timeout,
                )

                if response.output and response.output.choices:
                    return response.output.choices[0].text.strip()
                else:
                    if attempt < retry_count - 1:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    raise Exception("Empty response from Together AI")

            except asyncio.TimeoutError:
                raise DeadlineExceeded("Together AI request timed out")
            except Exception as e:
                if "quota" in str(e).lower():
                    raise ResourceExhausted(str(e))
                if attempt < retry_count - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise

    async def generate_content_stream(
        self,
        prompt: str,
        system_prompt: str = "",
        temperature: float = 0.4,
        max_tokens: int = 1024,
        provider: str = "groq",
        model: str = "llama-3.1-8b-instant"
    ):
        """
        Stream content from LLM (optimized for voice/chat)
        Currently only supports Groq for low-latency streaming
        """
        if provider == "groq" and self.groq_client:
            async for chunk in self._stream_groq(
                prompt, system_prompt, temperature, max_tokens, model
            ):
                yield chunk
        else:
            # Fallback to non-streaming or other provider if needed
            # For now, voice service expects a stream
            logger.warning(f"Streaming not fully implemented for {provider}. Using Groq fallback.")
            if self.groq_client:
                async for chunk in self._stream_groq(
                    prompt, system_prompt, temperature, max_tokens, "llama-3.1-8b-instant"
                ):
                    yield chunk

    async def _stream_groq(self, prompt, system_prompt, temperature, max_tokens, model_name):
        """Internal helper for Groq streaming"""
        try:
            full_prompt = []
            if system_prompt:
                full_prompt.append({"role": "system", "content": system_prompt})
            full_prompt.append({"role": "user", "content": prompt})

            # Groq Python SDK is synchronous for completion.create, 
            # we use run_in_executor to keep it async friendly.
            # But for streaming, we need the generator.
            
            def get_stream():
                return self.groq_client.chat.completions.create(
                    model=model_name,
                    messages=full_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True,
                )

            loop = asyncio.get_event_loop()
            stream = await loop.run_in_executor(None, get_stream)

            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield {"type": "chunk", "content": chunk.choices[0].delta.content}

        except Exception as e:
            logger.error(f"Groq streaming error: {e}")
            yield {"type": "error", "message": str(e)}

    def _get_provider_order(self, preferred: Optional[str] = None) -> List[str]:
        """Get provider order with preferred first"""
        default_order = ['gemini', 'groq', 'together']
        
        if preferred and preferred in default_order:
            return [preferred] + [p for p in default_order if p != preferred]
        
        return default_order

    def get_provider_status(self) -> dict:
        """Get status of all providers"""
        status = {
            'timestamp': str(asyncio.get_event_loop().time()),
            'providers': {},
        }
        
        for provider_name, metrics in self.metrics.items():
            status['providers'][provider_name] = {
                'status': metrics.status.value,
                'failures': metrics.failure_count,
                'successes': metrics.success_count,
                'total_calls': metrics.total_calls,
                'avg_latency_ms': round(metrics.avg_latency, 2),
                'last_error': metrics.last_error,
            }
        
        return status

    def reset_provider_metrics(self, provider: Optional[str] = None):
        """Reset health metrics for recovery"""
        if provider and provider in self.metrics:
            self.metrics[provider].status = ProviderStatus.HEALTHY
            self.metrics[provider].failure_count = 0
            logger.info(f"✅ Reset metrics for {provider}")
        else:
            for metrics in self.metrics.values():
                metrics.status = ProviderStatus.HEALTHY
                metrics.failure_count = 0
            logger.info("✅ Reset metrics for all providers")


# Global instance
_router_instance: Optional[LLMProviderRouter] = None


def get_llm_router() -> LLMProviderRouter:
    """Get or create global LLM router instance"""
    global _router_instance
    if _router_instance is None:
        _router_instance = LLMProviderRouter()
    return _router_instance
