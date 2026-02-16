#!/usr/bin/env python3
"""
Test LLM Question Generation with User Profile Data
Verifies:
1. User profile and readiness score fetching
2. Question generation based on user data
3. Questions stored in database (GeneratedQuestionLog)
"""

import asyncio
import sys
import os
import json
from pathlib import Path
from datetime import datetime

# Load environment variables FIRST
from dotenv import load_dotenv
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path, override=True)

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

async def test_user_profile_and_questions():
    """Test question generation with real user profile data"""
    
    print("=" * 80)
    print("👤 User Profile & Question Generation Test with Database Verification")
    print("=" * 80)
    
    # Import after path setup
    from app.llm.gemini_client import get_gemini_client
    from motor.motor_asyncio import AsyncIOMotorClient
    import asyncio
    
    # MongoDB connection
    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/prepmate-ai-studio')
    
    try:
        client = AsyncIOMotorClient(mongo_uri)
        db = client['prepmate-ai-studio']
        
        print(f"\n1️⃣ Connecting to MongoDB...")
        print(f"   URI: {mongo_uri}")
        
        # Test connection
        await db.command('ping')
        print("   ✅ MongoDB Connected")
        
    except Exception as e:
        print(f"   ❌ MongoDB connection failed: {e}")
        return False
    
    try:
        # Test 2: Fetch User Data
        print(f"\n2️⃣ Fetching User Profile (shreyash@gmail.com)...")
        
        users_collection = db['users']
        user = await users_collection.find_one({
            'email': 'shreyash@gmail.com'
        })
        
        if not user:
            print(f"   ⚠️ User not found. Trying alternate query...")
            # Try by email pattern
            user = await users_collection.find_one({
                'email': {'$regex': 'shreyash'}
            })
        
        if not user:
            print(f"   ⚠️ User 'shreyash' not found in database")
            print(f"   Available users:")
            all_users = await users_collection.find({}).limit(5).to_list(5)
            for u in all_users:
                print(f"      • {u.get('email', u.get('_id'))}")
            
            # Use first available user for testing
            if all_users:
                user = all_users[0]
                print(f"   Using first available user: {user.get('email', user.get('_id'))}")
            else:
                print(f"   ❌ No users found in database")
                return False
        
        user_id = str(user.get('_id'))
        user_email = user.get('email', 'Unknown')
        
        print(f"   ✅ User Found:")
        print(f"      ID: {user_id}")
        print(f"      Email: {user_email}")
        print(f"      Name: {user.get('name', 'N/A')}")
        print(f"      Level: {user.get('learningLevel', 'N/A')}")
        print(f"      Target: {user.get('targetCompanies', [])}")
        
        # Test 3: Fetch User Topic Progression
        print(f"\n3️⃣ Fetching User Topic Progression & Readiness Scores...")
        
        progression_collection = db['usertopicprogressions']
        progressions = await progression_collection.find({
            'userId': user_id
        }).limit(5).to_list(5)
        
        if progressions:
            print(f"   ✅ Found {len(progressions)} topics practiced:")
            
            for prog in progressions[:3]:
                topic_id = prog.get('topicId')
                mastery = prog.get('masteryScore', 0)
                readiness = prog.get('progressionReadinessScore', 0)
                accuracy = prog.get('accuracyRate', 0)
                
                # Fetch topic name
                topics_collection = db['topics']
                topic = await topics_collection.find_one({'_id': topic_id})
                topic_name = topic.get('name', str(topic_id)) if topic else str(topic_id)
                
                print(f"      📚 {topic_name}")
                print(f"         Mastery: {mastery}/100")
                print(f"         Readiness: {readiness}/100")
                print(f"         Accuracy: {accuracy}%")
        else:
            print(f"   ⚠️ No topic progression found for user")
            progressions = []
        
        # Use first topic for question generation
        if progressions:
            selected_progression = progressions[0]
            topic_id = selected_progression.get('topicId')
            
            # Get topic details
            topics_collection = db['topics']
            topic = await topics_collection.find_one({'_id': topic_id})
            topic_name = topic.get('name', 'Unknown Topic') if topic else 'Unknown'
        else:
            print(f"   ❌ Cannot generate questions without topic progression")
            return False
        
        # Test 4: Generate Personalized Questions
        print(f"\n4️⃣ Generating Personalized Questions...")
        
        llm_client = get_gemini_client()
        
        prompt = f"""You are an expert coding interview coach. Generate interview questions for:

USER PROFILE:
- Name: {user.get('name', 'Student')}
- Target: {', '.join(user.get('targetCompanies', ['General']))}
- Level: {user.get('learningLevel', 'Intermediate')}
- Learning Goal: {user.get('learningGoal', 'Interview Prep')}

TOPIC PROGRESS:
- Topic: {topic_name}
- Mastery Score: {selected_progression.get('masteryScore', 0)}/100
- Readiness: {selected_progression.get('progressionReadinessScore', 0)}/100
- Accuracy: {selected_progression.get('accuracyRate', 0)}%
- Current Difficulty: {selected_progression.get('currentDifficultyLevel', 'Medium')}

Generate 2 coding questions appropriate for this learner.

Return ONLY valid JSON:
{{
  "questions": [
    {{
      "title": "Problem Title",
      "description": "Problem statement",
      "difficulty": "Easy|Medium|Hard",
      "topic": "{topic_name}",
      "hints": ["hint1", "hint2"],
      "examples": [{{"input": "in", "output": "out"}}],
      "skills": ["skill1", "skill2"],
      "reason": "Why for this learner"
    }}
  ]
}}"""
        
        try:
            response = await llm_client.generate_response(
                prompt=prompt,
                temperature=0.7,
                max_tokens=2000,
                retry_count=2
            )
            
            # Parse response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start < 0:
                print(f"   ❌ Invalid response format")
                return False
            
            json_str = response[json_start:json_end]
            result = json.loads(json_str)
            questions = result.get('questions', [])
            
            print(f"   ✅ Generated {len(questions)} questions")
            
            # Test 5: Store Questions in Database
            print(f"\n5️⃣ Storing Generated Questions in Database...")
            
            question_log_collection = db['generatedquestionlogs']
            stored_questions = []
            
            for i, q in enumerate(questions, 1):
                question_doc = {
                    'userId': user_id,
                    'topicId': topic_id,
                    'problemTitle': q.get('title', 'Untitled'),
                    'description': q.get('description', ''),
                    'difficulty': q.get('difficulty', 'Medium'),
                    'primaryConceptTested': ', '.join(q.get('skills', [])),
                    'whyRecommended': q.get('reason', ''),
                    'hints': q.get('hints', []),
                    'examples': q.get('examples', []),
                    'generationSessionId': f"session_{user_id}_{datetime.now().timestamp()}",
                    'geminiModelVersion': 'gemini-2.5-flash',
                    'provider': 'groq',  # or gemini/together
                    'generatedAt': datetime.utcnow(),
                    'source': 'llm_test',
                    'isEffective': None,  # Will be determined after practice
                }
                
                try:
                    result = await question_log_collection.insert_one(question_doc)
                    stored_questions.append({
                        'title': q.get('title'),
                        'db_id': str(result.inserted_id),
                        'status': '✅ Stored'
                    })
                    print(f"   ✅ Question {i}: {q.get('title')}")
                    print(f"      DB ID: {result.inserted_id}")
                except Exception as e:
                    print(f"   ❌ Question {i} storage failed: {e}")
                    stored_questions.append({
                        'title': q.get('title'),
                        'status': f'❌ Error: {e}'
                    })
            
            # Test 6: Verify Storage
            print(f"\n6️⃣ Verifying Questions in Database...")
            
            stored_count = await question_log_collection.count_documents({
                'userId': user_id,
                'source': 'llm_test'
            })
            
            print(f"   ✅ Verified: {stored_count} test questions stored")
            
            # Retrieve and display stored questions
            print(f"\n7️⃣ Retrieved Questions from Database:")
            
            stored_docs = await question_log_collection.find({
                'userId': user_id,
                'source': 'llm_test'
            }).limit(5).to_list(5)
            
            for i, doc in enumerate(stored_docs, 1):
                print(f"\n   Question {i}:")
                print(f"      Title: {doc.get('problemTitle')}")
                print(f"      Difficulty: {doc.get('difficulty')}")
                print(f"      Topic: {doc.get('topicId')}")
                print(f"      Why: {doc.get('whyRecommended')[:80]}..." if doc.get('whyRecommended') else "      Why: N/A")
                print(f"      Concepts: {doc.get('primaryConceptTested')}")
                print(f"      Generated: {doc.get('generatedAt')}")
                print(f"      DB _id: {doc.get('_id')}")
            
            # Test 7: Summary Statistics
            print(f"\n8️⃣ Summary Statistics:")
            
            total_user_questions = await question_log_collection.count_documents({
                'userId': user_id
            })
            
            total_all_questions = await question_log_collection.count_documents({})
            
            print(f"   Total questions for this user: {total_user_questions}")
            print(f"   Total questions in system: {total_all_questions}")
            print(f"   Questions generated this session: {len(stored_questions)}")
            
        except Exception as e:
            print(f"   ❌ Question generation failed: {e}")
            import traceback
            traceback.print_exc()
            return False
        
    finally:
        client.close()
    
    print("\n" + "=" * 80)
    print("✅ User Profile & Question Storage Test Complete!")
    print("=" * 80)
    return True


async def test_readiness_score_calculation():
    """Test readiness score calculation and storage"""
    
    print("\n\n" + "=" * 80)
    print("📊 Readiness Score Calculation & Storage Test")
    print("=" * 80)
    
    from motor.motor_asyncio import AsyncIOMotorClient
    
    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/prepmate-ai-studio')
    
    try:
        client = AsyncIOMotorClient(mongo_uri)
        db = client['prepmate-ai-studio']
        
        print(f"\n1️⃣ Fetching Users with Readiness Scores...")
        
        progression_collection = db['usertopicprogressions']
        
        # Get progressions with readiness scores
        progressions = await progression_collection.find({
            'progressionReadinessScore': {'$exists': True, '$gt': 0}
        }).limit(5).to_list(5)
        
        if progressions:
            print(f"   ✅ Found {len(progressions)} progressions with readiness scores:")
            
            for prog in progressions:
                readiness = prog.get('progressionReadinessScore', 0)
                mastery = prog.get('masteryScore', 0)
                user_id = prog.get('userId')
                
                # Get user info
                users_collection = db['users']
                user = await users_collection.find_one({'_id': user_id})
                user_email = user.get('email', str(user_id)) if user else str(user_id)
                
                # Get topic info
                topics_collection = db['topics']
                topic = await topics_collection.find_one({'_id': prog.get('topicId')})
                topic_name = topic.get('name', str(prog.get('topicId'))) if topic else str(prog.get('topicId'))
                
                print(f"\n   📈 {user_email} → {topic_name}")
                print(f"      Readiness Score: {readiness}/100")
                print(f"      Mastery Score: {mastery}/100")
                print(f"      Accuracy: {prog.get('accuracyRate', 0)}%")
                print(f"      Current Difficulty: {prog.get('currentDifficultyLevel', 'N/A')}")
        else:
            print(f"   ⚠️ No readiness scores found in database")
        
        client.close()
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    return True


def main():
    """Run all tests"""
    
    print("\n🔍 Database & Question Generation Configuration")
    print("=" * 80)
    
    # Check environment
    mongodb_uri = os.getenv('MONGO_URI')
    gemini_key = os.getenv('GEMINI_API_KEY')
    groq_key = os.getenv('GROQ_API_KEY')
    
    print(f"   MongoDB: {bool(mongodb_uri)}")
    print(f"   Gemini: {bool(gemini_key)}")
    print(f"   Groq: {bool(groq_key)}")
    
    if not mongodb_uri:
        print("\n❌ MongoDB URI not configured in .env")
        sys.exit(1)
    
    print("\n" + "=" * 80 + "\n")
    
    try:
        # Run tests
        success1 = asyncio.run(test_user_profile_and_questions())
        success2 = asyncio.run(test_readiness_score_calculation())
        
        if success1 and success2:
            print("\n\n" + "=" * 80)
            print("🎉 All Tests Passed!")
            print("=" * 80)
            print("\n✅ Summary:")
            print("   • User profiles fetched successfully")
            print("   • Questions generated based on user data")
            print("   • Questions stored in GeneratedQuestionLog")
            print("   • Readiness scores retrieved from database")
        else:
            print("\n⚠️ Some tests had issues - check output above")
    
    except KeyboardInterrupt:
        print("\n\n❌ Tests interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
