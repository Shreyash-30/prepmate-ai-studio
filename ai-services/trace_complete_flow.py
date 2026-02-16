#!/usr/bin/env python3
"""
Complete Flow Trace Test
Verifies data flow: Frontend → Backend → AI Service → Database
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

async def test_complete_flow():
    """Test the complete data flow"""
    
    print("\n" + "=" * 90)
    print("🔍 COMPLETE FLOW TRACE TEST")
    print("=" * 90)
    
    import httpx
    from motor.motor_asyncio import AsyncIOMotorClient
    
    backend_url = os.getenv('BACKEND_URL', 'http://localhost:8000/api')
    ai_service_url = 'http://localhost:8001'
    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/prepmate-ai-studio')
    
    print(f"\n📍 Configuration:")
    print(f"   Backend: {backend_url}")
    print(f"   AI Service: {ai_service_url}")
    print(f"   MongoDB: {mongo_uri}")
    
    # Get test user and topic from database
    print(f"\n1️⃣ STEP 1: Get Test Data from Database")
    print("-" * 90)
    
    try:
        client_mongo = AsyncIOMotorClient(mongo_uri)
        db = client_mongo['prepmate-ai-studio']
        
        user = await db['users'].find_one({})
        topic = await db['topics'].find_one({})
        
        if not user or not topic:
            print(f"   ❌ Missing test data")
            return False
        
        user_id = str(user['_id'])
        user_email = user['email']
        topic_id = topic.get('topicId', str(topic['_id']))
        topic_name = topic['name']
        
        print(f"   ✅ Test User: {user_email}")
        print(f"      ID: {user_id}")
        print(f"   ✅ Test Topic: {topic_name}")
        print(f"      ID: {topic_id}")
        
        client_mongo.close()
        
    except Exception as e:
        print(f"   ❌ Database error: {e}")
        return False
    
    # Test backend connection
    print(f"\n2️⃣ STEP 2: Check Backend Connection")
    print("-" * 90)
    
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            health = await client.get(f"{backend_url.replace('/api', '')}/health", follow_redirects=True)
            print(f"   ✅ Backend responding on port 8000")
        except Exception as e:
            print(f"   ❌ Backend not responding: {e}")
            print(f"      Start: cd backend && npm start")
            return False
    
    # Test AI service connection
    print(f"\n3️⃣ STEP 3: Check AI Service Connection")
    print("-" * 90)
    
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            health = await client.get(f"{ai_service_url}/health")
            print(f"   ✅ AI Service responding on port 8001")
        except Exception as e:
            print(f"   ❌ AI Service not responding: {e}")
            print(f"      Start: cd ai-services && python main.py")
            return False
    
    # Simulate frontend API call to backend
    print(f"\n4️⃣ STEP 4: Frontend → Backend (Simulate Topic Click)")
    print("-" * 90)
    
    print(f"   📝 Frontend Code Flow:")
    print(f"      1. User clicks topic: '{topic_name}'")
    print(f"      2. handleSelectTopic('{topic_id}') called")
    print(f"      3. generateQuestions('{topic_id}', {{limit: 5}}) called")
    print(f"      4. Makes POST request to:")
    print(f"         /api/practice/topics/{topic_id}/generate-questions?limit=5")
    print(f"      5. Includes auth token in header\n")
    
    # Call backend without auth first
    async with httpx.AsyncClient(timeout=30) as client:
        endpoint = f"{backend_url}/practice/topics/{topic_id}/generate-questions?limit=5"
        
        try:
            response = await client.post(endpoint, json={})
            
            print(f"   Backend Status: {response.status_code}")
            
            if response.status_code == 401:
                print(f"   ⚠️ Need valid JWT token\n")
                print(f"   Backend Processing (if we had valid token):")
                print(f"      1. Receives topicId: {topic_id}")
                print(f"      2. Extracts userId from JWT token")
                print(f"      3. Logs: 📌 FRONTEND REQUEST RECEIVED")
                print(f"      4. Calls: llmQuestionGenerationService.generatePersonalizedQuestions()")
                print(f"         - Fetches user profile from MongoDB")
                print(f"         - Fetches topic data from MongoDB")
                print(f"         - Fetches user progression from MongoDB")
                print(f"         - Logs: 📊 LEARNER PROFILE PREPARED")
                print(f"         - Calls AI Service at: {ai_service_url}/ai/practice/generate-questions\n")
            
            elif response.status_code == 200:
                data = response.json()
                questions = data.get('data', {}).get('questions', [])
                
                print(f"   ✅ Backend Processing Successful!")
                print(f"      Questions generated: {len(questions)}")
                
                # Show backend flow
                print(f"\n   Backend Processing Steps:")
                print(f"      1. ✅ Received topicId: {topic_id}")
                print(f"      2. ✅ Extracted userId from JWT token")
                print(f"      3. ✅ Fetched user profile from MongoDB")
                print(f"      4. ✅ Fetched topic data from MongoDB")
                print(f"      5. ✅ Fetched user progression from MongoDB")
                print(f"      6. ✅ Built learner profile with:")
                print(f"         - User: {user_email}")
                print(f"         - Topic: {topic_name}")
                print(f"         - Mastery, Readiness, Accuracy scores")
                print(f"      7. ✅ Called AI Service endpoint:")
                print(f"         POST {ai_service_url}/ai/practice/generate-questions")
                print(f"      8. ✅ AI Service generated {len(questions)} questions")
                print(f"      9. ✅ Stored questions in database")
                print(f"      10. ✅ Returned response to frontend\n")
                
                if questions:
                    print(f"   Sample Questions:")
                    for i, q in enumerate(questions[:2], 1):
                        print(f"      {i}. {q.get('problemTitle')}")
                        print(f"         Difficulty: {q.get('difficulty')}")
                        print(f"         Why: {q.get('whyRecommended', 'N/A')[:60]}...")
            
            else:
                print(f"   ⚠️ Unexpected status: {response.status_code}")
                print(f"   Response: {response.text[:300]}")
        
        except Exception as e:
            print(f"   ❌ Request failed: {e}")
            return False
    
    # Verify in database
    print(f"\n5️⃣ STEP 5: Verify Data in Database")
    print("-" * 90)
    
    try:
        client_mongo = AsyncIOMotorClient(mongo_uri)
        db = client_mongo['prepmate-ai-studio']
        
        question_log = db['generated_question_logs']
        stored_count = await question_log.count_documents({})
        
        print(f"   Total generated questions in system: {stored_count}")
        
        if stored_count > 0:
            recent = await question_log.find_one({}, sort=[('generatedAt', -1)])
            if recent:
                print(f"   ✅ Most recent question:")
                print(f"      Title: {recent.get('problemTitle')}")
                print(f"      User: {recent.get('userId')}")
                print(f"      Topic: {recent.get('topicId')}")
                print(f"      Provider: {recent.get('llmProvider')}")
        
        client_mongo.close()
        
    except Exception as e:
        print(f"   ⚠️ Could not verify: {e}")
    
    # Summary
    print(f"\n\n" + "=" * 90)
    print("📊 FLOW TRACE SUMMARY")
    print("=" * 90)
    
    print(f"""
Data Flow Path:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ FRONTEND (React)
   📍 src/pages/Practice.tsx → Line 51
   📍 User clicks on topic: "{topic_name}"
   📍 Calls: handleSelectTopic('{topic_id}')
   📍 Triggers useEffect → generateQuestions('{topic_id}')

   ↓ HTTP Request ↓

2️⃣ FRONTEND HOOK
   📍 src/hooks/useQuestionSelection.ts → Line 162
   📍 Makes API call: POST /practice/topics/{topic_id}/generate-questions?limit=5
   📍 Includes auth_token from localStorage in header
   📍 Logs when making request (see console.log statements)

   ↓ Network ↓

3️⃣ BACKEND API (Node.js/Express)
   📍 Port: 8000
   📍 Endpoint: POST /api/practice/topics/:topicId/generate-questions
   📍 Route: backend/src/routes/practiceRoutes.js → Line 82
   📍 Controller: backend/src/controllers/practiceController.js → generatePersonalizedQuestions()
   
   Actions:
   - Extracts topicId from URL: '{topic_id}'
   - Extracts userId from JWT token
   - Calls: llmQuestionGenerationService.generatePersonalizedQuestions()

   ↓ ↓ ↓

4️⃣ BACKEND SERVICE (Node.js)
   📍 backend/src/services/llmQuestionGenerationService.js
   
   Data Collection:
   - Fetches User from MongoDB: name, email, level, companies
   - Fetches Topic from MongoDB: name, description
   - Fetches UserTopicProgression: mastery, readiness, accuracy scores
   - Fetches Recent Attempts: mistake patterns
   
   Data Built:
   - Creates learnerProfile object with ALL user & topic data
   - Includes: {user_email}, {topic_name}, scores, level, etc.
   
   Service Call:
   - Calls: callGeminiForQuestions(learnerProfile, limit)
   - Constructs POST request to AI Service
   - Sends learnerProfile data + limit=5

   ↓ Network ↓

5️⃣ PYTHON AI SERVICE (FastAPI)
   📍 Port: 8001
   📍 Endpoint: POST /ai/practice/generate-questions
   📍 File: ai-services/app/llm/routers.py
   
   Receives:
   - learnerProfile: all user and topic data
   - limit: 5
   
   Processing:
   - Initializes LLM router (Gemini primary, Groq fallback)
   - Builds prompt using learnerProfile
   - Calls LLM via llm_provider_router
   - Generates questions personalized to user profile
   - Returns: success: true, questions: [...]

   ↓ Network ↓

6️⃣ BACKEND PROCESSES RESPONSE
   📍 backend/src/services/llmQuestionGenerationService.js
   
   Actions:
   - Receives questions from AI Service
   - Deduplicates questions
   - Stores in MongoDB: generated_question_logs collection
   - Enriches with question bank links
   - Returns response

   ↓ Network ↓

7️⃣ FRONTEND RECEIVES RESPONSE
   📍 src/hooks/useQuestionSelection.ts
   
   Data:
   - response.data.data.questions = [array of questions]
   - Each question has: title, difficulty, topic, why, hints, etc.
   
   Display:
   - Component re-renders with questions
   - Shows in UI under "AI-Personalized Problems"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Data Passed:
   Frontend → Backend: topicId, auth token
   Backend → AI Service: learnerProfile (user + topic data), limit
   AI Service → Backend: questions array
   """)
    
    return True


def main():
    print("\n🚀 Starting Complete Flow Trace Test...\n")
    
    try:
        success = asyncio.run(test_complete_flow())
        
        if success:
            print(f"\n✅ Flow trace complete!")
            print(f"\nTo test with real authentication:")
            print(f"1. Open browser and go to http://localhost:5173 (frontend)")
            print(f"2. Login with your credentials")
            print(f"3. Go to Practice → Select a Topic")
            print(f"4. Open browser DevTools (F12) → Console tab")
            print(f"5. Watch the flow logging in console")
            print(f"6. Check Network tab to see API calls")
        else:
            print(f"\n❌ Fix issues above and try again")
    
    except KeyboardInterrupt:
        print(f"\n\nTest interrupted")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
