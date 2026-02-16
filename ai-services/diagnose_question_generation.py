#!/usr/bin/env python3
"""
Simple Frontend → Backend Flow Test
Checks why questions aren't being generated when clicking on a topic
"""

import asyncio
import sys
import os
import json
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent / '.env'
load_dotenv(env_path, override=True)
sys.path.insert(0, str(Path(__file__).parent))

async def test_question_generation():
    """Test question generation endpoint"""
    
    print("=" * 90)
    print("🔍 Testing: Why Questions Not Generated When Clicking Topic")
    print("=" * 90)
    
    import httpx
    from motor.motor_asyncio import AsyncIOMotorClient
    
    backend_url = os.getenv('BACKEND_URL', 'http://localhost:8000/api')
    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/prepmate-ai-studio')
    
    print(f"\n📍 Configuration:")
    print(f"   Backend: {backend_url}")
    print(f"   MongoDB: {mongo_uri}")
    
    # Get first user from database
    print(f"\n1️⃣ STEP 1: Get Test User Data")
    print("-" * 90)
    
    try:
        client_mongo = AsyncIOMotorClient(mongo_uri)
        db = client_mongo['prepmate-ai-studio']
        
        user = await db['users'].find_one({})
        if not user:
            print(f"   ❌ No users in database")
            return False
        
        user_id = user['_id']
        user_email = user.get('email', 'unknown')
        
        print(f"   ✅ Test User: {user_email}")
        print(f"      ID: {user_id}")
        
        # Get first topic
        topic = await db['topics'].find_one({})
        if not topic:
            print(f"   ❌ No topics in database")
            return False
        
        topic_id = topic.get('topicId', topic.get('_id'))
        topic_name = topic.get('name', topic_id)
        
        print(f"   ✅ Test Topic: {topic_name}")
        print(f"      ID: {topic_id}")
        
        # Get user progression for this topic
        progression = await db['user_topic_progression'].find_one({
            'topicId': topic_id
        })
        
        if progression:
            print(f"\n   📊 User Progression Stats:")
            print(f"      Mastery: {progression.get('masteryScore', 0)}/100")
            print(f"      Readiness: {progression.get('readinessScore', 'N/A')}")
            print(f"      Accuracy: {progression.get('accuracyRate', 0)}%")
        
        client_mongo.close()
        
    except Exception as e:
        print(f"   ❌ Database error: {e}")
        return False
    
    # Test the endpoint WITHOUT auth (to isolate the issue)
    print(f"\n2️⃣ STEP 2: Call Generate Questions Endpoint")
    print("-" * 90)
    
    endpoint = f"{backend_url}/practice/topics/{topic_id}/generate-questions?limit=5"
    print(f"   Endpoint: POST {endpoint}")
    print(f"   Note: Testing without auth first to isolate issue")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        # First try without auth to see if that's the issue
        print(f"\n   🔍 Attempt 1: Without Authorization Header")
        try:
            response = await client.post(
                endpoint,
                json={},
            )
            
            print(f"      Status: {response.status_code}")
            print(f"      Response: {response.text[:500]}")
            
            if response.status_code == 401:
                print(f"      ⚠️ Unauthorized - Need valid JWT token")
            elif response.status_code == 404:
                print(f"      ❌ Endpoint not found - Check if backend is running")
                print(f"      Make sure: cd backend && npm start")
                return False
            elif response.status_code == 200:
                data = response.json()
                questions = data.get('data', {}).get('questions', [])
                print(f"      ✅ Questions generated: {len(questions)}")
                
                # Show structure
                if questions:
                    print(f"\n      Sample question structure:")
                    q = questions[0]
                    print(f"         Title: {q.get('problemTitle')}")
                    print(f"         Difficulty: {q.get('difficulty')}")
                    print(f"         Topic: {q.get('topic')}")
        except Exception as e:
            print(f"      ❌ Request failed: {e}")
    
    # Now check backend logs/health
    print(f"\n3️⃣ STEP 3: Check Backend & AI Service Health")
    print("-" * 90)
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Check if backend is running
        try:
            health = await client.get(f"{backend_url.replace('/api', '')}/health", follow_redirects=True)
            print(f"   Backend: Running (health status: {health.status_code})")
        except:
            print(f"   ❌ Backend not responding")
            print(f"      Start backend: cd backend && npm start")
            return False
        
        # Check AI service
        try:
            ai_health = await client.get("http://localhost:8001/health", timeout=5.0)
            print(f"   AI Service: Running (status: {ai_health.status_code})")
        except:
            print(f"   ⚠️ AI Service not responding on port 8001")
            print(f"      Start AI service: cd ai-services && python main.py")
    
    # Test AI service directly
    print(f"\n4️⃣ STEP 4: Test AI Service Directly")
    print("-" * 90)
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            ai_response = await client.post(
                "http://localhost:8001/ai/practice/generate-questions",
                json={
                    "learnerProfile": {
                        "topicId": topic_name,
                        "learningLevel": "intermediate",
                        "masteryScore": 50,
                        "progressionReadinessScore": 50,
                    },
                    "limit": 3
                }
            )
            
            if ai_response.status_code == 200:
                data = ai_response.json()
                print(f"   ✅ AI Service Responding")
                print(f"      Success: {data.get('success')}")
                print(f"      Questions: {len(data.get('questions', []))}")
            else:
                print(f"   ❌ AI Service Error: {ai_response.status_code}")
                print(f"      Response: {ai_response.text[:300]}")
        except Exception as e:
            print(f"   ❌ Could not reach AI service: {e}")
    
    # Summary and troubleshooting
    print(f"\n5️⃣ STEP 5: Troubleshooting Guide")
    print("-" * 90)
    
    print(f"""
    If questions aren't generating when you click a topic in the frontend:
    
    ✅ Checklist:
    1. Is the BACKEND running?
       → cd backend && npm start
       
    2. Is the AI SERVICE running?
       → cd ai-services && python main.py
       
    3. Is MongoDB running?
       → Check your MongoDB connection
       
    4. Do you have valid LLM API keys?
       → GEMINI_API_KEY: {bool(os.getenv('GEMINI_API_KEY'))}
       → GROQ_API_KEY: {bool(os.getenv('GROQ_API_KEY'))}
       
    5. Check browser console (F12) for network errors
       → Look for failed API calls
       
    6. Check browser network tab
       → POST /api/practice/topics/<topicId>/generate-questions
       → Look at response (should contain questions array)
       
    ⚠️ Common Issues:
    
    Issue 1: "Network Error" or "Cannot reach backend"
       Solution: Make sure backend is running on port 8000
       
    Issue 2: "401 Unauthorized"  
       Solution: Check if auth_token is stored in localStorage
       
    Issue 3: "Empty questions array"
       Solution: Check AI service is running and API keys configured
       
    Issue 4: "Gemini quota exceeded"
       Solution: System uses Groq as fallback automatically
    """)
    
    return True


def main():
    print("\n🚀 Diagnosing Question Generation Issue...\n")
    
    try:
        success = asyncio.run(test_question_generation())
        
        if success:
            print(f"\n\n" + "=" * 90)
            print(f"✅ Diagnostic Complete")
            print(f"=" * 90)
            print(f"\nNext steps:")
            print(f"1. Ensure both backend and AI service are running")
            print(f"2. Check browser console (F12) for errors when clicking a topic")
            print(f"3. Look at Network tab to see API response structure")
        else:
            print(f"\n\n❌ Diagnostic incomplete - fix issues above")
    
    except KeyboardInterrupt:
        print(f"\n\n❌ Test interrupted")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
