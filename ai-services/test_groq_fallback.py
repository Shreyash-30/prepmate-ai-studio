#!/usr/bin/env python3
"""
Test script to verify Groq fallback is working
"""
import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Load environment
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path, override=True)

# Setup logging
import logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_providers():
    """Test all LLM providers"""
    
    # Check environment variables
    print("\n📋 Environment Check:")
    print(f"  GEMINI_API_KEY: {'✅ Set' if os.getenv('GEMINI_API_KEY') else '❌ Not set'}")
    print(f"  GROQ_API_KEY: {'✅ Set' if os.getenv('GROQ_API_KEY') else '❌ Not set'}")
    print(f"  TOGETHER_API_KEY: {'✅ Set' if os.getenv('TOGETHER_API_KEY') else '❌ Not set'}")
    
    # Test router initialization
    print("\n🔧 Testing LLM Provider Router:")
    try:
        from app.llm.llm_provider_router import LLMProviderRouter
        router = LLMProviderRouter()
        
        print(f"  Gemini: {'✅ Available' if router.providers.get('gemini') else '❌ Not available'}")
        print(f"  Groq: {'✅ Available' if router.providers.get('groq') else '❌ Not available'}")
        print(f"  Together: {'✅ Available' if router.providers.get('together') else '❌ Not available'}")
        
        # Test provider order
        provider_order = router._get_provider_order()
        print(f"  Provider order: {provider_order}")
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Test Gemini client
    print("\n🔍 Testing Gemini Client:")
    try:
        from app.llm.gemini_client import get_gemini_client
        client = get_gemini_client()
        
        if client:
            print(f"  Available: {client.available}")
            print(f"  Has router: {client.router is not None}")
            
            # Try to generate a response
            print("\n  Testing response generation:")
            test_prompt = "Say 'Hello' in one word"
            
            response = await client.generate_response(
                prompt=test_prompt,
                temperature=0.5,
                max_tokens=50
            )
            
            print(f"  Response: {response}")
        else:
            print("  ❌ Client is None")
            
    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Test question generation service
    print("\n❓ Testing Question Generation Service:")
    try:
        from app.llm.question_generation_service import QuestionGenerationService
        
        test_profile = {
            "topicId": "arrays",
            "learningLevel": "beginner",
            "masteryScore": 0.5,
            "progressionReadinessScore": 0.6,
            "targetCompanies": "Google,Facebook",
            "preparationGoal": "interview",
            "recommendedDifficulty": "Medium"
        }
        
        result = await QuestionGenerationService.generate_questions(
            learner_profile=test_profile,
            limit=2
        )
        
        print(f"  Success: {result.get('success')}")
        print(f"  Source: {result.get('source')}")
        print(f"  Questions count: {len(result.get('questions', []))}")
        
        if result.get('error'):
            print(f"  Error: {result.get('error')}")
        
        if result.get('questions'):
            print(f"  First question: {result['questions'][0].get('problemTitle', 'N/A')}")
            
    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("=" * 60)
    print("Testing LLM Provider Fallback System")
    print("=" * 60)
    
    asyncio.run(test_providers())
    
    print("\n" + "=" * 60)
    print("Test Complete")
    print("=" * 60)
