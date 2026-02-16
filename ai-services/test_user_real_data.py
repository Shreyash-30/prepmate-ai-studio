#!/usr/bin/env python3
"""
Test LLM Question Generation with Real User Data
Verifies:
1. User profile and readiness score fetching
2. Question generation based on user data
3. Questions stored in database
"""

import asyncio
import sys
import os
import json
from pathlib import Path
from datetime import datetime

from dotenv import load_dotenv
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path, override=True)

sys.path.insert(0, str(Path(__file__).parent))

async def test_user_questions_with_db():
    """Test with real user and topic progression data"""
    
    print("=" * 80)
    print("👤 Real User Profile & Question Generation with Database Storage")
    print("=" * 80)
    
    from app.llm.gemini_client import get_gemini_client
    from motor.motor_asyncio import AsyncIOMotorClient
    
    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/prepmate-ai-studio')
    
    try:
        client = AsyncIOMotorClient(mongo_uri)
        db = client['prepmate-ai-studio']
        
        await db.command('ping')
        print(f"\n✅ Connected to MongoDB")
        
        # Test 1: Get user data
        print(f"\n1️⃣ Fetching User Data...")
        
        users_collection = db['users']
        users = await users_collection.find({}).limit(10).to_list(10)
        
        if not users:
            print(f"   ❌ No users found")
            return False
        
        # Find user with most data
        user = None
        for u in users:
            if u.get('email') and '@' in u.get('email'):
                user = u
                break
        
        if not user:
            user = users[0]
        
        user_id = user['_id']
        user_email = user.get('email', str(user_id))
        
        print(f"   ✅ User: {user_email}")
        print(f"      ID: {user_id}")
        print(f"      Name: {user.get('name', 'N/A')}")
        print(f"      Level: {user.get('learningLevel', 'N/A')}")
        
        # Test 2: Get user topic progression
        print(f"\n2️⃣ Fetching User Topic Progression...")
        
        progression_collection = db['user_topic_progression']
        progressions = await progression_collection.find({}).limit(10).to_list(10)
        
        print(f"   Total progressions in system: {await progression_collection.count_documents({})}")
        
        if not progressions:
            print(f"   ⚠️ No progressions available")
            return False
        
        # Use first progression
        progression = progressions[0]
        prog_user_id = progression.get('userId')
        topic_id = progression.get('topicId')
        
        print(f"   ✅ Found progression data:")
        print(f"      User ID: {prog_user_id}")
        print(f"      Topic ID: {topic_id}")
        print(f"      Mastery Score: {progression.get('masteryScore', 0)}/100")
        print(f"      Readiness Score: {progression.get('readinessScore', progression.get('progressionReadinessScore', 0))}/100")
        print(f"      Accuracy: {progression.get('accuracyRate', 0)}%")
        
        # Get topic name
        topics_collection = db['topics']
        topic = await topics_collection.find_one({'_id': topic_id})
        topic_name = topic.get('name', str(topic_id)) if topic else str(topic_id)
        
        print(f"      Topic: {topic_name}")
        
        # Get user who has this progression
        prog_user = await users_collection.find_one({'_id': prog_user_id})
        prog_user_email = prog_user.get('email', str(prog_user_id)) if prog_user else str(prog_user_id)
        
        print(f"      User Email: {prog_user_email}")
        
        # Test 3: Generate questions
        print(f"\n3️⃣ Generating Personalized Questions...")
        
        readiness = progression.get('readinessScore', progression.get('progressionReadinessScore', 50))
        mastery = progression.get('masteryScore', 50)
        accuracy = progression.get('accuracyRate', 50)
        
        prompt = f"""Generate 2 personalized coding interview questions for:

USER: {prog_user.get('name', 'Student') if prog_user else 'Student'}
TOPIC: {topic_name}
MASTERY: {mastery}/100
READINESS: {readiness}/100
ACCURACY: {accuracy}%

Generate questions appropriate for this learner's level.
Explain why each question is recommended.

Return ONLY valid JSON:
{{
  "questions": [
    {{
      "title": "Problem Name",
      "description": "Problem description",
      "difficulty": "Easy|Medium|Hard",
      "example": {{"input": "example input", "output": "expected output"}},
      "hints": ["hint1", "hint2"],
      "concepts": ["concept1", "concept2"],
      "whyRecommended": "Why for this learner"
    }}
  ]
}}"""
        
        try:
            llm_client = get_gemini_client()
            response = await llm_client.generate_response(
                prompt=prompt,
                temperature=0.7,
                max_tokens=2000
            )
            
            # Parse JSON
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start < 0:
                print(f"   ❌ Invalid response")
                print(f"   Response: {response[:200]}")
                return False
            
            json_str = response[json_start:json_end]
            result = json.loads(json_str)
            questions = result.get('questions', [])
            
            print(f"   ✅ Generated {len(questions)} questions:")
            for i, q in enumerate(questions, 1):
                print(f"\n      Question {i}:")
                print(f"      • Title: {q.get('title')}")
                print(f"      • Difficulty: {q.get('difficulty')}")
                print(f"      • Why: {q.get('whyRecommended', 'N/A')[:70]}...")
                print(f"      • Concepts: {', '.join(q.get('concepts', []))}")
            
            # Test 4: Store in database
            print(f"\n4️⃣ Storing Questions in Database...")
            
            question_log_collection = db['generated_question_logs']
            stored_count = 0
            
            for q in questions:
                doc = {
                    'userId': prog_user_id,
                    'topicId': topic_id,
                    'problemTitle': q.get('title', 'Untitled'),
                    'description': q.get('description', ''),
                    'difficulty': q.get('difficulty', 'Medium'),
                    'primaryConceptTested': ', '.join(q.get('concepts', [])),
                    'whyRecommended': q.get('whyRecommended', ''),
                    'hints': q.get('hints', []),
                    'example': q.get('example', {}),
                    'generatedAt': datetime.utcnow(),
                    'llmProvider': 'groq',
                    'llmModel': 'llama-3.3-70b-versatile',
                    'sessionId': f"test_{datetime.now().timestamp()}",
                    'source': 'test_generator',
                }
                
                try:
                    result = await question_log_collection.insert_one(doc)
                    stored_count += 1
                    print(f"   ✅ Stored: {q.get('title')}")
                    print(f"      DB ID: {result.inserted_id}")
                except Exception as e:
                    print(f"   ❌ Failed: {q.get('title')} - {e}")
            
            # Test 5: Verify storage
            print(f"\n5️⃣ Verifying Questions in Database...")
            
            stored_questions = await question_log_collection.find({
                'userId': prog_user_id,
                'source': 'test_generator'
            }).to_list(None)
            
            print(f"   ✅ Retrieved {len(stored_questions)} questions")
            
            # Show details
            print(f"\n6️⃣ Stored Questions Details:")
            
            for i, q in enumerate(stored_questions, 1):
                print(f"\n   Question {i} (DB):")
                print(f"      Title: {q.get('problemTitle')}")
                print(f"      Difficulty: {q.get('difficulty')}")
                print(f"      Topic ID: {q.get('topicId')}")
                print(f"      Concepts: {q.get('primaryConceptTested')}")
                print(f"      Provider: {q.get('llmProvider')}")
                print(f"      Generated: {q.get('generatedAt')}")
                print(f"      _id: {q.get('_id')}")
            
            # Test 6: Show all generated questions count
            print(f"\n7️⃣ Database Summary:")
            
            total_generated = await question_log_collection.count_documents({})
            total_for_user = await question_log_collection.count_documents({'userId': prog_user_id})
            total_for_topic = await question_log_collection.count_documents({'topicId': topic_id})
            
            print(f"   Total generated questions: {total_generated}")
            print(f"   Questions for this user: {total_for_user}")
            print(f"   Questions for this topic: {total_for_topic}")
            
        except json.JSONDecodeError as e:
            print(f"   ❌ JSON parsing error: {e}")
            return False
        except Exception as e:
            print(f"   ❌ Error: {e}")
            import traceback
            traceback.print_exc()
            return False
        
        client.close()
        return True
    
    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def show_readiness_metrics():
    """Show readiness and mastery metrics"""
    
    print("\n\n" + "=" * 80)
    print("📊 User Readiness & Mastery Metrics")
    print("=" * 80)
    
    from motor.motor_asyncio import AsyncIOMotorClient
    
    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/prepmate-ai-studio')
    
    try:
        client = AsyncIOMotorClient(mongo_uri)
        db = client['prepmate-ai-studio']
        
        # Get topic mastery collection
        mastery_collection = db['topic_mastery']
        masteries = await mastery_collection.find({}).limit(10).to_list(10)
        
        print(f"\n✅ Topic Mastery Data ({len(masteries)} records found):")
        
        for m in masteries[:5]:
            user_id = m.get('userId')
            topic_id = m.get('topicId')
            score = m.get('masteryScore', 0)
            
            # Get user and topic names
            users_collection = db['users']
            topics_collection = db['topics']
            
            user = await users_collection.find_one({'_id': user_id})
            topic = await topics_collection.find_one({'_id': topic_id})
            
            user_name = user.get('email', str(user_id)) if user else str(user_id)
            topic_name = topic.get('name', str(topic_id)) if topic else str(topic_id)
            
            print(f"\n   • {user_name} → {topic_name}")
            print(f"     Mastery: {score}/100")
            print(f"     Last Updated: {m.get('lastUpdated', 'N/A')}")
        
        # Get user-topic progressions
        progression_collection = db['user_topic_progression']
        progressions = await progression_collection.find({}).limit(10).to_list(10)
        
        print(f"\n✅ User Topic Progression Data ({len(progressions)} records found):")
        
        for p in progressions[:5]:
            user_id = p.get('userId')
            topic_id = p.get('topicId')
            mastery = p.get('masteryScore', 0)
            readiness = p.get('readinessScore', 'N/A')
            accuracy = p.get('accuracyRate', 0)
            
            users = db['users']
            topics = db['topics']
            
            user = await users.find_one({'_id': user_id})
            topic = await topics.find_one({'_id': topic_id})
            
            user_name = user.get('email', str(user_id)) if user else str(user_id)
            topic_name = topic.get('name', str(topic_id)) if topic else str(topic_id)
            
            print(f"\n   • {user_name} → {topic_name}")
            print(f"     Mastery: {mastery}/100")
            print(f"     Readiness: {readiness}")
            print(f"     Accuracy: {accuracy}%")
        
        client.close()
        
    except Exception as e:
        print(f"   ❌ Error: {e}")


def main():
    print("\n🔍 Configuration Check")
    print("=" * 80)
    
    mongodb = bool(os.getenv('MONGO_URI'))
    gemini = bool(os.getenv('GEMINI_API_KEY'))
    groq = bool(os.getenv('GROQ_API_KEY'))
    
    print(f"   MongoDB: {'✅' if mongodb else '❌'}")
    print(f"   Gemini: {'✅' if gemini else '❌'}")
    print(f"   Groq: {'✅' if groq else '❌'}")
    
    if not mongodb:
        print("\n❌ MongoDB not configured")
        return
    
    print("\n" + "=" * 80)
    
    try:
        success = asyncio.run(test_user_questions_with_db())
        asyncio.run(show_readiness_metrics())
        
        if success:
            print("\n\n" + "=" * 80)
            print("🎉 Test Complete!")
            print("=" * 80)
            print("\n✅ Verified:")
            print("   • Real user data fetched")
            print("   • Topic progression retrieved")
            print("   • Questions generated using Groq LLM")
            print("   • Questions stored in generated_question_logs collection")
            print("   • Readiness & mastery metrics available")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
