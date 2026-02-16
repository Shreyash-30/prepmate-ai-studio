#!/usr/bin/env python3
"""
Test to see what the AI service returns with a complete learner profile
"""
import asyncio
import aiohttp
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment
env_path = Path(__file__).parent / 'ai-services' / '.env'
load_dotenv(env_path, override=True)

async def test_with_complete_profile():
    """Test with a complete learner profile like backend would send"""
    
    # This is the kind of profile the backend would send
    complete_learner_profile = {
        "userId": "user123",
        "userName": "Test User",
        "learningLevel": "intermediate",
        "targetCompanies": "Google, Meta, Amazon",
        "preparationGoal": "interview",
        "topicId": "Dynamic Programming",  # Note: this is the topic NAME, not ID
        "topicDescription": "Learn dynamic programming techniques",
        "masteryScore": 45,  # Out of 100
        "progressionReadinessScore": 60,  # Out of 100
        "retentionProbability": 0.55,
        "currentDifficultyLevel": "Easy",
        "totalAttempts": 12,
        "successfulAttempts": 7,
        "weakSubtopics": "Memoization, Tabulation",
        "recentMistakePatterns": "Off-by-one errors, incorrect base cases",
        "recommendedDifficulty": "Easy",
        "desiredQuestionCount": 5,
    }
    
    payload = {
        "learnerProfile": complete_learner_profile,
        "limit": 5
    }
    
    print("=" * 70)
    print("Testing AI Service with Complete Backend Learner Profile")
    print("=" * 70)
    print(f"\n📤 Sending request to: http://localhost:8001/ai/practice/generate-questions")
    print(f"\n📋 Learner Profile:")
    print(json.dumps(complete_learner_profile, indent=2))
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "http://localhost:8001/ai/practice/generate-questions",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                status = resp.status
                data = await resp.json()
                
                print(f"\n{'='*70}")
                print(f"📥 Response Status: {status}")
                print(f"{'='*70}")
                print(f"\n✅ Success: {data.get('success')}")
                print(f"📝 Message: {data.get('message', 'N/A')}")
                print(f"❌ Error: {data.get('error', 'None')}")
                print(f"📊 Questions: {len(data.get('questions', []))}")
                print(f"🔄 Source: {data.get('source', 'N/A')}")
                
                if not data.get('success'):
                    print(f"\n⚠️ FAILURE DETAILS:")
                    print(json.dumps(data, indent=2))
                else:
                    print(f"\n✅ SUCCESS! Generated questions:")
                    for i, q in enumerate(data.get('questions', [])[:2], 1):
                        print(f"  {i}. {q.get('problemTitle')} ({q.get('difficulty')})")
                    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_with_complete_profile())
