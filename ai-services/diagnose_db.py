#!/usr/bin/env python3
"""
Database Structure & Data Diagnostic
"""

import asyncio
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent / '.env'
load_dotenv(env_path, override=True)
sys.path.insert(0, str(Path(__file__).parent))

async def diagnose_database():
    from motor.motor_asyncio import AsyncIOMotorClient
    
    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/prepmate-ai-studio')
    
    try:
        client = AsyncIOMotorClient(mongo_uri)
        db = client['prepmate-ai-studio']
        
        print("📊 Database Collections & Data")
        print("=" * 80)
        
        # List all collections
        collections = await db.list_collection_names()
        print(f"\n✅ Found {len(collections)} collections:")
        
        for coll in sorted(collections):
            count = await db[coll].count_documents({})
            print(f"   • {coll}: {count} documents")
        
        print("\n" + "=" * 80)
        
        # Check Users collection
        print(f"\n1️⃣ USERS Collection:")
        users = await db['users'].find({}).limit(3).to_list(3)
        print(f"   Total users: {await db['users'].count_documents({})}")
        for user in users:
            print(f"   • {user.get('email', user['_id'])}")
        
        # Check Topics collection
        print(f"\n2️⃣ TOPICS Collection:")
        topics = await db['topics'].find({}).limit(5).to_list(5)
        print(f"   Total topics: {await db['topics'].count_documents({})}")
        if topics:
            for topic in topics:
                print(f"   • {topic.get('name', topic['_id'])}")
        
        # Check UserTopicProgressions collection
        print(f"\n3️⃣ USERTOPICPROGRESSIONS Collection:")
        progressions = await db['usertopicprogressions'].find({}).limit(3).to_list(3)
        print(f"   Total progressions: {await db['usertopicprogressions'].count_documents({})}")
        if progressions:
            for prog in progressions:
                uid = prog.get('userId')
                tid = prog.get('topicId')
                print(f"   • User: {uid} → Topic: {tid}")
                print(f"     Mastery: {prog.get('masteryScore')}, Readiness: {prog.get('progressionReadinessScore')}")
        else:
            print("   ❌ No progressions found")
        
        # Check GeneratedQuestionLog collection
        print(f"\n4️⃣ GENERATEDQUESTIONLOGS Collection:")
        questions = await db['generatedquestionlogs'].find({}).limit(3).to_list(3)
        print(f"   Total generated questions: {await db['generatedquestionlogs'].count_documents({})}")
        if questions:
            for q in questions:
                print(f"   • {q.get('problemTitle', q['_id'])}")
                print(f"     User: {q.get('userId')}, Topic: {q.get('topicId')}")
        else:
            print("   ❌ No generated questions found")
        
        # Check PracticeQuestions collection
        print(f"\n5️⃣ PRACTICEQUESTIONS Collection:")
        pquestions = await db['practicequestions'].find({}).limit(3).to_list(3)
        print(f"   Total practice questions: {await db['practicequestions'].count_documents({})}")
        if pquestions:
            for q in pquestions[:2]:
                print(f"   • {q.get('problemTitle', q.get('title', q['_id']))}")
        
        # Check UserProfileAnswers collection
        print(f"\n6️⃣ USERPROFILEANSWERS Collection:")
        answers = await db['userprofileanswers'].find({}).limit(2).to_list(2)
        print(f"   Total profile answers: {await db['userprofileanswers'].count_documents({})}")
        if answers:
            for ans in answers:
                print(f"   • User: {ans.get('userId')}")
        
        # Get specific user with ID
        shreyash = await db['users'].find_one({'email': 'shreyash@gmail.com'})
        if shreyash:
            user_id = shreyash['_id']
            print(f"\n7️⃣ Shreyash's Data:")
            print(f"   User ID: {user_id}")
            
            # Check if shreyash has any data
            profile_data = await db['userprofileanswers'].find_one({'userId': user_id})
            if profile_data:
                print(f"   Profile Answer: ✅ Found")
            else:
                print(f"   Profile Answer: ❌ Not found")
            
            progressions = await db['usertopicprogressions'].find_one({'userId': str(user_id)})
            if progressions:
                print(f"   Topic Progression: ✅ Found")
            else:
                print(f"   Topic Progression: ❌ Not found")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(diagnose_database())
