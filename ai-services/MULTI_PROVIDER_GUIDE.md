# Multi-Provider LLM Integration Guide

## Overview

The AI services now support automatic failover across multiple LLM providers:

1. **Gemini** (Primary) - Google's most capable model
2. **Groq** (Fallback 1) - Fast, high-quota alternative  
3. **Together AI** (Fallback 2) - Reliable backup option

When Gemini reaches quota limits or fails, the system automatically switches to Groq, then Together AI without breaking your application.

## Architecture

```
User Request
    ↓
GeminiClient (backward compatible)
    ↓
LLMProviderRouter (multi-provider logic)
    ↓
Try Gemini → If quota/fail → Try Groq (Llama-3.3-70B) → If fail → Try Together AI
    ↓
Response returned to user
```

**Groq Models Available:**
- **Llama-3.3-70B-Versatile** (Primary) - Latest flagship for reasoning, planning, analytics
- **Llama-3.1-8B-Instant** (Optional) - Fast model for high-volume, low-latency scoring

## Setup

### 1. Install Dependencies

The required Groq library has been added to `requirements.txt`:

```bash
cd ai-services
pip install -r requirements.txt --upgrade
```

Installs:
- `groq==0.4.2` - Groq API client
- `google-generativeai==0.3.0` - Gemini API client
- All other existing dependencies

### 2. Configure API Keys

Update `/ai-services/.env`:

```dotenv
# Primary provider
GEMINI_API_KEY=your_gemini_key_here

# Fallback providers
GROQ_API_KEY=your_groq_key_here
TOGETHER_API_KEY=your_together_ai_key_here
```

#### Getting API Keys:

**Gemini** (Google):
- Go to https://makersuite.google.com/app/apikey
- Click "Get API Key"
- Free tier: 20 requests/minute

**Groq**:
- Go to https://console.groq.com
- Sign up and create an API key
- Free tier: Very high quota, fast responses
- Latest model: `llama-3.3-70b-versatile` (reasoning, planning)
- Fast model: `llama-3.1-8b-instant` (high-volume, scoring)

**Together AI**:
- Go to https://www.together.ai
- Sign up for API key
- Free tier: Reasonable quota

#### Recommended Setup:
1. Use **Gemini** as primary (it's free with decent quota)
2. Add **Groq** key as fallback (faster when available)
3. Add **Together AI** as last resort (most reliable availability)

### 3. Start the AI Service

```bash
cd ai-services
python main.py
```

You'll see startup logs showing which providers are initialized:
```
✅ Gemini provider initialized
✅ Groq provider initialized
✅ Together AI provider initialized
```

## Usage

### From Python Services

All existing services (MentorService, PracticeReviewService, etc.) automatically use the multi-provider router:

```python
from app.llm.gemini_client import get_gemini_client

client = get_gemini_client()
response = await client.generate_response(
    prompt="Your prompt here",
    temperature=0.7,
    max_tokens=2048
)
# Automatically tries: Gemini → Groq → Together AI
```

### Monitoring Provider Health

#### Check Provider Status

```bash
GET http://localhost:8001/ai/providers/health
```

Response:
```json
{
  "status": "healthy",
  "providers": {
    "gemini": {
      "status": "healthy",
      "failures": 0,
      "successes": 15,
      "total_calls": 15,
      "avg_latency_ms": 1250.5,
      "last_error": null
    },
    "groq": {
      "status": "healthy",
      "failures": 0,
      "successes": 0,
      "total_calls": 0,
      "avg_latency_ms": 0,
      "last_error": null
    },
    "together": {
      "status": "healthy",
      "failures": 0,
      "successes": 0,
      "total_calls": 0,
      "avg_latency_ms": 0,
      "last_error": null
    }
  }
}
```

#### Reset Provider Metrics

If a provider needs recovery from repeated failures:

```bash
# Reset specific provider
POST http://localhost:8001/ai/providers/reset/groq

# Reset all providers
POST http://localhost:8001/ai/providers/reset/all
```

## What Happens When Gemini Quota Is Exceeded

### Before (Single Provider):
```
Request → Gemini API → Quota exceeded (429) → ❌ Error to user
```

### After (Multi-Provider):
```
Request → Gemini API → Quota exceeded (429)
       → Router detects 429
       → Automatically switches to Groq
       → Groq API → ✅ Success with same response format
```

The user never sees an error - they just get a response from an alternative provider.

## Automatic Failover Logic

The router implements intelligent failover:

1. **Provider Status Tracking**: Each provider tracks failures, successes, and latency
2. **Automatic Degradation**: After 3 consecutive failures, a provider is marked "unavailable" and skipped
3. **Exponential Backoff**: Retries use 2^attempt second delays to respect rate limits
4. **Health Recovery**: Providers marked unavailable are automatically tried again after subsequent requests
5. **Consistent Response Schema**: All providers return the same JSON structure

## Configuration Options

### Temperature & Max Tokens

Control response quality:

```python
await client.generate_response(
    prompt="...",
    temperature=0.4,  # 0.0 = deterministic, 1.0 = creative
    max_tokens=2048,  # Max response length
)
```

### Groq Flagship Model (Llama-3.3-70B-Versatile)

For complex reasoning, planning, and analytics generation:

```python
from app.llm.llm_provider_router import get_llm_router

router = get_llm_router()
result = await router.call_groq_flagship(
    prompt="Complex reasoning and adaptive planning prompt",
    temperature=0.5,
    max_tokens=2048
)

print(f"Response: {result['content']}")
print(f"Model: {result['provider']}")
print(f"Latency: {result['latency']:.0f}ms")
```

**Best for**: Detailed analysis, adaptive planners, complex reasoning

### Groq Fast Model (Llama-3.1-8B-Instant)

For high-volume requests with low-latency requirements:

```python
# Fast model optimized for scoring and lightweight operations
result = await router.call_groq_fast(
    prompt="Quick scoring prompt",
    temperature=0.3,
    max_tokens=512  # Typical for scoring
)

print(f"Response: {result['content']}")
print(f"Latency: {result['latency']:.0f}ms")
```

**Best for**: 
- High-volume scoring requests
- Lightweight planners
- Real-time responses
- Low-latency production pipelines

### Retry Behavior

```python
await client.generate_response(
    prompt="...",
    retry_count=3,  # Retries per provider
    timeout=30,     # Timeout in seconds per provider
)
```

### Preferred Provider

Force a specific provider (for testing/specific use cases):

```python
result = await router.generate_response(
    prompt="...",
    preferred_provider='groq'  # Will try groq first
)
print(f"Used provider: {result['provider']}")
```

## Performance Metrics

### Expected Latencies:

- **Gemini**: 1-2 seconds (higher quality outputs)
- **Groq (Llama-3.3-70B)**: 600-900ms (reasoning, planning, flagship)
- **Groq (Llama-3.1-8B)**: 200-400ms (fast, low-latency scoring)
- **Together AI**: 1-1.5 seconds (reliable alternative)

**Model Selection Guide:**

| Use Case | Recommended | Latency | Quality |
|----------|------------|---------|---------|
| Complex reasoning | Groq Flagship (3.3-70B) | 600-900ms | ⭐⭐⭐⭐⭐ |
| Adaptive planning | Groq Flagship (3.3-70B) | 600-900ms | ⭐⭐⭐⭐⭐ |
| High-volume scoring | Groq Fast (3.1-8B) | 200-400ms | ⭐⭐⭐⭐ |
| Real-time responses | Groq Fast (3.1-8B) | 200-400ms | ⭐⭐⭐⭐ |
| Fallback/backup | Together AI | 1-1.5s | ⭐⭐⭐⭐ |

The router tracks and reports average latency per provider via the health endpoint.

## Logging

View detailed logs in `ai-services` output:

```
🔄 Attempting gemini...
✅ gemini responded in 1250ms

🔄 Attempting groq...
⏭️ groq not available, skipping

✅ Groq responded in 650ms
```

Log levels:
- `DEBUG`: Each attempt, provider switch
- `INFO`: Successful responses, provider initialization
- `WARNING`: Rate limits, failures, provider marking unhealthy
- `ERROR`: Unexpected exceptions

## Backward Compatibility

**All existing code continues to work without changes:**

```python
# Old code - still works! Now with automatic failover
client = get_gemini_client()
response = await client.generate_response(prompt)
```

The new multi-provider router is completely transparent to existing services.

## Troubleshooting

### "No LLM providers configured"

**Problem**: No API keys are set in `.env`

**Solution**: Add at least one API key to `.env`:
```dotenv
GEMINI_API_KEY=your_key_here
```

### Provider Marked Unavailable

**Problem**: A provider failed 3 times and was marked unavailable

**Solution**: Reset its metrics:
```bash
POST http://localhost:8001/ai/providers/reset/gemini
```

### High Latency

**Problem**: Responses are slow

**Solution**: 
1. Check health endpoint to see which provider is being used
2. If using Gemini or Together AI (slower), Groq could be faster
3. Or add a Groq key to fallback to it

### Still Using Gemini When Quota Exceeded

**Problem**: Getting "quota exceeded" errors

**Solution**:
1. Add a `GROQ_API_KEY` to enable fallback
2. Check provider health - Gemini should show degraded status
3. Call `POST /ai/providers/reset/groq` if stuck

## Performance Optimization

### Recommended Settings for Production

```python
result = await router.generate_response(
    prompt=prompt,
    temperature=0.5,    # Balanced quality/consistency
    max_tokens=1024,    # Limit response size for speed
    retry_count=2,      # Quick failover on retry
    timeout=25,         # Prevent hanging
    preferred_provider='groq'  # Start with fast provider
)
```

### Cost Optimization

If using paid APIs:

1. **Groq is free** - use as first choice when accurate
2. **Gemini is free** (limited quota) - use for simple requests
3. **Together AI** - check their pricing, may degrade gracefully

Configure preferred provider per request type:
- Simple tasks → Groq (fast, free)
- Complex tasks → Gemini (better quality)
- Critical requests → Multiple retries enabled

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/ai/providers/health` | GET | Check provider status |
| `/ai/providers/reset/{provider}` | POST | Reset provider metrics |
| `/ai/mentor/chat` | POST | Mentor chat (auto-fails over) |
| `/ai/practice/review` | POST | Code review (auto-fails over) |
| `/ai/interview/simulate` | POST | Interview (auto-fails over) |
| `/ai/learning/explain` | POST | Learning content (auto-fails over) |

All `/ai/*` endpoints automatically use the multi-provider router.

## Implementation Details

### Files Modified/Created:

1. **`llm_provider_router.py`** (NEW)
   - Core multi-provider routing logic
   - Provider initialization and health tracking
   - Failover implementation

2. **`gemini_client.py`** (MODIFIED)
   - Now wraps the LLMProviderRouter
   - Maintains backward compatibility
   - Added health check methods

3. **`routers.py`** (MODIFIED)
   - Added `/ai/providers/health` endpoint
   - Added `/ai/providers/reset/{provider}` endpoint

4. **`requirements.txt`** (MODIFIED)
   - Added `groq==0.4.2` dependency

5. **`.env`** (MODIFIED)
   - Added `GROQ_API_KEY` configuration
   - Added `TOGETHER_API_KEY` configuration

### No Breaking Changes

- All existing service imports work unchanged
- Response format identical across providers
- Database integration unchanged
- Controller logic unchanged

## Future Enhancements

Potential improvements (not yet implemented):

1. **Provider-specific optimization** - Pass different prompts to different providers based on their strengths
2. **Load balancing** - Distribute requests across providers based on health/speed
3. **Cost tracking** - Monitor API costs per provider
4. **Smart caching** - Cache identical prompts across providers
5. **Batch processing** - Queue requests and optimize provider selection
6. **Custom models** - Support fine-tuned models per provider

## Support

### Debugging

Enable debug logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Common Issues

Q: **"AttributeError: module 'groq' has no attribute 'Groq'"**
A: Groq library version mismatch. Run: `pip install groq==0.4.2 --force-reinstall`

Q: **"All LLM providers failed"**
A: No API keys configured. Check `.env` has at least one valid key.

Q: **"Provider continuously marked unavailable"**
A: Check API key validity. Some keys may be revoked or have permission issues.

---

**Last Updated**: February 2026
**System**: Adaptive Learning Platform AI Services
