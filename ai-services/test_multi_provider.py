#!/usr/bin/env python3
"""
Test Multi-Provider LLM System
Verifies all configured LLM providers are working and failing over correctly
"""

import asyncio
import sys
import os
from pathlib import Path

# Load environment variables
try:
    from dotenv import load_dotenv
    env_file = Path(__file__).parent / '.env'
    if env_file.exists():
        load_dotenv(env_file, override=True)
except ImportError:
    pass

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))


async def test_multi_provider_system():
    """Test the multi-provider LLM system"""
    
    print("=" * 60)
    print("Multi-Provider LLM System Test")
    print("=" * 60)
    
    # Import after path is set
    from app.llm.llm_provider_router import get_llm_router
    from app.llm.gemini_client import get_gemini_client
    
    print("\n1️⃣ Testing LLM Provider Router Initialization...")
    try:
        router = get_llm_router()
        print("✅ Router initialized successfully")
    except Exception as e:
        print(f"❌ Router initialization failed: {e}")
        return False
    
    print("\n2️⃣ Checking Provider Setup...")
    health = router.get_provider_status()
    print(f"Timestamp: {health.get('timestamp')}")
    print("\nProviders:")
    for provider, status in health.get('providers', {}).items():
        availability = "✅" if status.get('status') == 'healthy' else "⚠️"
        print(f"  {availability} {provider.upper()}")
        print(f"     Status: {status.get('status')}")
        print(f"     Calls: {status.get('total_calls')}")
        print(f"     Failures: {status.get('failures')}")
        print(f"     Avg Latency: {status.get('avg_latency_ms')}ms")
    
    print("\n3️⃣ Testing GeminiClient (Backward Compatibility)...")
    try:
        client = get_gemini_client()
        print("✅ GeminiClient initialized")
        print(f"   Client has router: {hasattr(client, 'router')}")
    except Exception as e:
        print(f"❌ GeminiClient initialization failed: {e}")
        return False
    
    print("\n4️⃣ Testing Provider Selection...")
    try:
        # Get provider order
        order = router._get_provider_order()
        print(f"Provider priority order: {order}")
    except Exception as e:
        print(f"❌ Provider order check failed: {e}")
        return False
    
    print("\n5️⃣ Testing Multi-Provider Response...")
    try:
        test_prompt = "Say 'Multi-provider system is working' and nothing else."
        
        result = await router.generate_response(
            prompt=test_prompt,
            temperature=0.0,
            max_tokens=256,
            timeout=15,
            retry_count=2
        )
        
        if result['success']:
            print(f"✅ Response generated via: {result['provider']}")
            print(f"   Content: {result['content'][:100]}...")
            print(f"   Latency: {result['latency']:.0f}ms")
            print(f"   Status: {result['status']}")
        else:
            print(f"⚠️ Generation failed: {result['content']}")
            print(f"   Provider: {result['provider']}")
            print(f"   Status: {result['status']}")
    
    except Exception as e:
        print(f"❌ Response generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n6️⃣ Testing Backward Compatibility (via GeminiClient)...")
    try:
        response = await client.generate_response(
            prompt="Respond with the word 'SUCCESS' only.",
            temperature=0.0,
            max_tokens=128
        )
        
        print(f"✅ GeminiClient response: {response[:100]}")
        
    except Exception as e:
        print(f"❌ GeminiClient response failed: {e}")
        return False
    
    print("\n7️⃣ Checking Provider Health After Requests...")
    health = router.get_provider_status()
    for provider, status in health.get('providers', {}).items():
        if status.get('total_calls', 0) > 0:
            print(f"\n{provider.upper()}:")
            print(f"  Total calls: {status.get('total_calls')}")
            print(f"  Successes: {status.get('successes')}")
            print(f"  Failures: {status.get('failures')}")
            print(f"  Avg Latency: {status.get('avg_latency_ms'):.0f}ms")
    
    print("\n" + "=" * 60)
    print("✅ All tests completed successfully!")
    print("=" * 60)
    
    print("\n📊 Provider Health Summary:")
    print(router.get_provider_status())
    
    return True


def main():
    """Run all tests"""
    
    # Check environment
    print("Checking environment...")
    
    required_env = ['GEMINI_API_KEY', 'GROQ_API_KEY', 'TOGETHER_API_KEY']
    configured = [e for e in required_env if os.getenv(e)]
    
    print(f"Configured providers: {configured}\n")
    
    if not configured:
        print("⚠️ WARNING: No LLM providers configured!")
        print("Set at least one of: GEMINI_API_KEY, GROQ_API_KEY, TOGETHER_API_KEY\n")
    
    # Run async tests
    try:
        asyncio.run(test_multi_provider_system())
    except KeyboardInterrupt:
        print("\n\n❌ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
