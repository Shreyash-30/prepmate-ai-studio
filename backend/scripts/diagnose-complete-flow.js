#!/usr/bin/env node
/**
 * DIAGNOSTIC: Comprehensive Flow Trace
 * 
 * Traces the entire flow and identifies where things break:
 * 1. Generate questions via LLM
 * 2. Check what's saved in database
 * 3. Try to fetch for session creation
 * 4. Identify mismatch
 */

const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const BACKEND_URL = 'http://localhost:5000/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepmate';
const TOPIC_ID = 'trees'; // DSA Topic

async function diagnose() {
  console.log(`\n${'='.repeat(80)}`);
  console.log('DIAGNOSTIC: Complete Flow Trace');
  console.log(`${'='.repeat(80)}\n`);

  try {
    // 1. Connect to MongoDB
    console.log(`[1/7] Connecting to MongoDB...`);
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ Connected\n`);

    const db = mongoose.connection.db;

    // 2. Create test user
    console.log(`[2/7] Setting up test user...`);
    const User = require('./backend/src/models/User').default;
    let user = await User.findOne().lean();
    if (!user) {
      user = await User.create({
        googleId: `diag-${Date.now()}`,
        email: `diag${Date.now()}@example.com`,
        name: 'Diagnostic User',
      });
    }
    const userId = user._id;
    console.log(`✅ Using user: ${userId}\n`);

    // 3. Call generation endpoint
    console.log(`[3/7] Calling LLM generation endpoint...`);
    console.log(`   POST ${BACKEND_URL}/practice/topics/${TOPIC_ID}/generate-questions\n`);

    const genResponse = await axios.post(
      `${BACKEND_URL}/practice/topics/${TOPIC_ID}/generate-questions`,
      { userId, limit: 2 },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    if (!genResponse.data?.success) {
      throw new Error(`Generation failed: ${genResponse.data?.message}`);
    }

    const generatedQuestions = genResponse.data?.data?.questions || [];
    console.log(`✅ Backend returned ${generatedQuestions.length} questions\n`);

    if (generatedQuestions.length === 0) {
      throw new Error('No questions generated!');
    }

    // 4. Check database for saved questions
    console.log(`[4/7] Checking database for saved questions...`);

    // List all collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log(`   Collections: ${collectionNames.join(', ')}`);

    // Find questions collection  
    const qColl = db.collection('questions');
    const gColl = db.collection('generatedquestionlogs');

    const totalQs = await qColl.countDocuments({});
    const llmQs = await qColl.countDocuments({ source: 'llm' });
    const v2Qs = await qColl.countDocuments({ schemaVersion: 2 });
    const activeQs = await qColl.countDocuments({ isActive: true });

    console.log(`   QuestionBank counts:`);
    console.log(`     - Total: ${totalQs}`);
    console.log(`     - source='llm': ${llmQs}`);
    console.log(`     - schemaVersion=2: ${v2Qs}`);
    console.log(`     - isActive=true: ${activeQs}`);
    console.log('');

    // 5. Look for generated questions by problemId
    console.log(`[5/7] Searching for generated questions...`);

    for (const q of generatedQuestions.slice(0, 2)) {
      const problemId = q.problemId;
      console.log(`\n   Question 1: "${q.problemTitle}"`);
      console.log(`   problemId: ${problemId}`);

      // Search QuestionBank
      const inBank = await qColl.findOne({ problemId });
      if (inBank) {
        console.log(`   ✅ Found in QuestionBank:`);
        console.log(`      schemaVersion: ${inBank.schemaVersion}`);
        console.log(`      isActive: ${inBank.isActive}`);
        console.log(`      source: ${inBank.source}`);
        console.log(`      title: ${inBank.title}`);
        console.log(`      testCasesStructured: ${inBank.testCasesStructured ? 'YES' : 'NO'}`);
        console.log(`      wrapperTemplate: ${inBank.wrapperTemplate ? 'YES' : 'NO'}`);
      } else {
        console.log(`   ❌ NOT in QuestionBank`);
        
        // Search GeneratedQuestionLog
        const inLog = await gColl.findOne({ problemId });
        if (inLog) {
          console.log(`   ✅ Found in GeneratedQuestionLog:`);
          console.log(`      schemaVersion: ${inLog.schemaVersion}`);
          console.log(`      isActive: ${inLog.isActive}`);
        } else {
          console.log(`   ❌ NOT in GeneratedQuestionLog either`);
        }
      }
    }
    console.log('');

    // 6. Simulate session creation query
    console.log(`[6/7] Simulating session creation query...`);
    const testProblemId = generatedQuestions[0].problemId;
    console.log(`   Looking for problemId: ${testProblemId}\n`);

    const query1 = await gColl.findOne({ problemId: testProblemId });
    if (query1) {
      console.log(`   ✅ GeneratedQuestionLog.findOne() found it`);
    } else {
      console.log(`   ❌ GeneratedQuestionLog.findOne() - NOT FOUND`);
    }

    const query2 = await qColl.findOne({
      problemId: testProblemId,
      isActive: true,
      schemaVersion: 2,
    });
    if (query2) {
      console.log(`   ✅ QuestionBank.findOne(v2 filter) found it`);
    } else {
      console.log(`   ❌ QuestionBank.findOne(v2 filter) - NOT FOUND`);

      // Debug why
      const withoutFilter = await qColl.findOne({ problemId: testProblemId });
      if (withoutFilter) {
        console.log(`   ⚠️  Question exists WITHOUT v2 filter:`);
        console.log(`       schemaVersion: ${withoutFilter.schemaVersion}`);
        console.log(`       isActive: ${withoutFilter.isActive}`);
      } else {
        console.log(`   ⚠️  Question doesn't exist in DB at all`);
      }
    }
    console.log('');

    // 7. Try actual session creation
    console.log(`[7/7] Attempting session creation...`);
    try {
      const sessionResponse = await axios.post(
        `${BACKEND_URL}/practice/session/start`,
        {
          problemId: testProblemId,
          topicId: TOPIC_ID,
          language: 'python',
          userId,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      if (sessionResponse.data?.success) {
        console.log(`✅ Session created successfully!`);
        console.log(`   sessionId: ${sessionResponse.data.data.sessionId}\n`);
      } else {
        console.log(`❌ Session creation returned failure:`);
        console.log(`   ${sessionResponse.data?.message}\n`);
      }
    } catch (err) {
      console.log(`❌ Session creation failed:`);
      console.log(`   ${err.response?.data?.message || err.message}\n`);
    }

    // Summary
    console.log(`${'='.repeat(80)}`);
    console.log('CONCLUSION');
    console.log(`${'='.repeat(80)}`);
    console.log(`✅ Questions generated: ${generatedQuestions.length}`);
    console.log(`✅ Questions in database: ${inBank ? 'YES' : 'NO'}`);
    console.log(`✅ Session creation: ${sessionResponse?.data?.success ? 'YES' : 'NO'}\n`);

  } catch (error) {
    console.error(`\n❌ DIAGNOSTIC FAILED:`);
    console.error(`   ${error.message}\n`);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

diagnose();
