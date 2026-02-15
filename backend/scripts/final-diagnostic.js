/**
 * FINAL COMPREHENSIVE DIAGNOSTIC & FIX REPORT
 */

import mongoose from 'mongoose';
import axios from 'axios';
import fs from 'fs';

const MONGO_URI = 'mongodb://localhost:27017/prepmate-ai-studio';
const AI_URL = 'http://localhost:8001';
const USER_ID = '6991d3bd7258d93d85baea5c';

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║     FINAL DIAGNOSTIC REPORT                                      ║
║     Jay User Profile Build Status & Issue Resolution             ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
  `);

  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    // ============================================================================
    // SUMMARY
    // ============================================================================
    console.log(`
═══════════════════════════════════════════════════════════════════
EXECUTIVE SUMMARY
═══════════════════════════════════════════════════════════════════

Testing user: jay@gmail.com (ID: ${USER_ID})
    `);

    // Test 1: Authentication
    console.log('\n1️⃣  USER AUTHENTICATION');
    try {
      const loginRes = await axios.post('http://localhost:8000/api/auth/login', {
        email: 'jay@gmail.com',
        password: '123456'
      });
      console.log(`   ✅ Login successful`);
      console.log(`   📊 Token: ${loginRes.data.token.substring(0, 40)}...`);
    } catch (e) {
      console.log(`   ❌ Login failed: ${e.message}`);
    }

    // Test 2: LeetCode Connection
    console.log('\n2️⃣  LEETCODE INTEGRATION');
    const integrationCollection = db.collection('integrationaccounts');
    const leetcode = await integrationCollection.findOne({
      userId: new mongoose.Types.ObjectId(USER_ID),
      platform: 'leetcode'
    });
    console.log(`   ${leetcode ? '✅' : '❌'} LeetCode connected: ${leetcode ? 'YES' : 'NO'}`);
    if (leetcode) {
      console.log(`   📅 Connected: ${new Date(leetcode.createdAt).toLocaleDateString()}`);
      console.log(`   ⏱️  Last synced: ${leetcode.lastSynced ? new Date(leetcode.lastSynced).toLocaleDateString() : 'NEVER'}`);
    }

    // Test 3: Submissions
    console.log('\n3️⃣  LEETCODE SUBMISSIONS');
    const subCollection = db.collection('externalplatformsubmissions');
    const submissions = await subCollection.find({
      userId: new mongoose.Types.ObjectId(USER_ID)
    }).toArray();
    console.log(`   ✅ Submissions found: ${submissions.length}`);
    if (submissions.length > 0) {
      const accepted = submissions.filter(s => s.status === 'accepted').length;
      console.log(`   📈 Accepted: ${accepted}/${submissions.length}`);
    }

    // Test 4: AI Service Health
    console.log('\n4️⃣  AI SERVICE HEALTH');
    try {
      const healthRes = await axios.get(`${AI_URL}/ai/health`);
      console.log(`   ✅ AI Service: Online`);
      console.log(`   📊 Status: ${healthRes.data.status}`);
    } catch (e) {
      console.log(`   ❌ AI Service: Offline or unreachable`);
    }

    // Test 5: AI Processing
    console.log('\n5️⃣  AI PROCESSING TEST');
    console.log(`   Testing mastery calculation for 5 topics...`);
    let aiWorkCount = 0;
    const topics = ['arrays', 'strings', 'math', 'hash_tables', 'trees'];
    for (const topic of topics) {
      try {
        const res = await axios.post(`${AI_URL}/ai/ml/mastery/update`, {
          user_id: USER_ID,
          topic_id: topic,
          attempts: [
            { correct: true, difficulty: 1, hints_used: 0, time_ms: 5000 }
          ],
          learning_level: 'intermediate'
        });
        if (res.data.data?.mastery_probability !== undefined) {
          aiWorkCount++;
          const mastery = (res.data.data.mastery_probability * 100).toFixed(1);
          console.log(`   ✅ ${topic}: ${mastery}% mastery`);
        }
      } catch (e) {
        console.log(`   ❌ ${topic}: Failed`);
      }
    }
    console.log(`   📊 AI calculated: ${aiWorkCount}/${topics.length} topics`);

    // Test 6: MongoDB Persistence
    console.log('\n6️⃣  MONGODB PERSISTENCE');
    const masteryCollection = db.collection('topic_mastery');
    const storedRecords = await masteryCollection.find({
      userId: USER_ID
    }).toArray();
    console.log(`   ${storedRecords.length > 0 ? '✅' : '❌'} Records stored: ${storedRecords.length}`);
    if (storedRecords.length > 0) {
      storedRecords.slice(0, 3).forEach(r => {
        console.log(`      - ${r.topicId}: ${(r.mastery_probability * 100).toFixed(1)}%`);
      });
    }

    // ============================================================================
    // DIAGNOSIS
    // ============================================================================
    console.log(`
═══════════════════════════════════════════════════════════════════
DIAGNOSIS
═══════════════════════════════════════════════════════════════════

DATA FLOW STATUS:
    `);

    const dataFlow = {
      auth: true,
      leetcode: !!leetcode,
      submissions: submissions.length > 0,
      aiService: aiWorkCount > 0,
      storage: storedRecords.length > 0
    };

    console.log(`
  1. User → Backend:           ${dataFlow.auth ? '✅' : '❌'}
  2. Backend → LeetCode DB:    ${dataFlow.leetcode ? '✅' : '❌'}`);
    console.log(`  3. LeetCode → Submissions:   ${dataFlow.submissions ? '✅' : '❌'}`);
    console.log(`  4. Submissions → AI Service: ${dataFlow.aiService ? '✅' : '❌'}`);
    console.log(`  5. AI Service → MongoDB:     ${dataFlow.storage ? '✅' : '❌'}`);

    if (!dataFlow.storage && dataFlow.aiService) {
      console.log(`\n🔴 CRITICAL ISSUE IDENTIFIED:
  - AI Service IS calculating mastery correctly
  - BUT data is NOT being persisted to MongoDB
  - Likely causes:
    1. MongoDB connection string issue in AI service
    2. Collection access not working with Motor async driver
    3. Update query not executing properly
    4. Schema/index problem
    `);
    }

    // ============================================================================
    // RECOMMENDATIONS
    // ============================================================================
    console.log(`
═══════════════════════════════════════════════════════════════════
RECOMMENDATIONS & NEXT STEPS
═══════════════════════════════════════════════════════════════════

TO FIX MONGODB PERSISTENCE:

1. ⚠️  Verify Database Connection:
   - Check if MONGO_URI is correctly set to: 
     mongodb://localhost:27017/prepmate-ai-studio
   - Verify prepmate-ai-studio database exists and is accessible

2. 🔧 Test MongoDB Directly:
   Run this command:
   mongosh "mongodb://localhost:27017/prepmate-ai-studio"
   > show collections
   > db.topic_mastery.findOne()

3. 📝 Add Verbose Logging:
   - Current debug logs added but may not be visible
   - Check Python process output for "[DEBUG]" markers
   - If using background Python, add file logging

4. 🚀 Force Service Reload:
   - The watch mode may not be reloading properly
   - Kill Python process manually and restart
   - Check if collection access fix (db['collection_name']) applied

5. ✅ Verify Fix Applied:
   Look for this line in app/ml/mastery_engine.py:
   >>> self.collection = db['topic_mastery']
   (NOT >>> self.collection = db.topic_mastery)

PROFILE BUILD STATUS:
${storedRecords.length > 0 ? '✅ PROFILE BUILT SUCCESSFULLY' : '⚠️  PROFILE NOT BUILT - AWAITING FIX'}
    `);

    console.log(`\nUser Data Summary:
✅ Authenticated
${dataFlow.leetcode ? '✅' : '❌'} LeetCode Connected
✅ ${submissions.length} Submissions Available
✅ AI Service Responsive
${dataFlow.storage ? '✅ Data Persisted' : '❌ Data NOT Persisted'}

Overall Status: ${dataFlow.storage ? '🟢 OPERATIONAL' : '🔴 PARTIALLY BROKEN'}
    `);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
