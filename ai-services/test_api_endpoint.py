#!/usr/bin/env python3
"""
Test the actual API endpoint response
"""
import asyncio
import aiohttp
import json
from pathlib import Path
from dotenv import load_dotenv
from urllib.parse import urljoin

# Load environment
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path, override=True)

async def test_api_endpoint():
    """Test the /ai/practice/generate-questions endpoint"""
    
    backend_url = "http://localhost:8001"
    endpoint = "/ai/practice/generate-questions"
    full_url = urljoin(backend_url, endpoint)
    
    # Sample learner profile
    request_body = {
        "learnerProfile": {
            "topicId": "arrays",
            "learningLevel": "beginner",
            "targetCompanies": "Google,Facebook",
            "preparationGoal": "interview",
            "masteryScore": 0.5,
            "progressionReadinessScore": 0.6,
            "weakSubtopics": "General concepts",
            "recentMistakePatterns": "Standard mistakes",
            "recommendedDifficulty": "Medium",
            "desiredQuestionCount": 5
        },
        "limit": 5
    }
    
    print("=" * 60)
    print("Testing Backend API Endpoint")
    print("=" * 60)
    print(f"\n🌐 URL: POST {full_url}")
    print(f"📝 Request Body:")
    print(json.dumps(request_body, indent=2))
    
    try:
        async with aiohttp.ClientSession() as session:
            print("\n⏳ Waiting for response...")
            async with session.post(full_url, json=request_body, timeout=aiohttp.ClientTimeout(total=60)) as response:
                status = response.status
                content_type = response.headers.get('Content-Type', 'unknown')
                
                print(f"\n✅ Response Status: {status}")
                print(f"📌 Content-Type: {content_type}")
                
                # Get response text
                text = await response.text()
                
                print(f"📦 Response Body ({len(text)} chars):")
                print("-" * 60)
                
                try:
                    # Try to parse as JSON
                    data = json.loads(text)
                    print(json.dumps(data, indent=2))
                    
                    # Analysis
                    print("\n" + "=" * 60)
                    print("📊 Response Analysis:")
                    print("=" * 60)
                    print(f"  ✅ Valid JSON")
                    print(f"  Success: {data.get('success')}")
                    print(f"  Source: {data.get('source', 'N/A')}")
                    print(f"  Questions: {len(data.get('questions', []))}")
                    print(f"  Error: {data.get('error', 'None')}")
                    
                    if data.get('questions'):
                        print(f"\n  Questions Generated:")
                        for i, q in enumerate(data.get('questions', []), 1):
                            print(f"    {i}. {q.get('problemTitle', 'N/A')} ({q.get('difficulty', 'N/A')})")
                    
                except json.JSONDecodeError:
                    print("❌ Response is not valid JSON")
                    print(text[:500])
                    
    except asyncio.TimeoutError:
        print("❌ Request timeout (60 seconds)")
    except aiohttp.ClientConnectorError:
        print(f"❌ Cannot connect to {backend_url}")
        print("   Make sure the AI service is running on port 8001")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_api_endpoint())
