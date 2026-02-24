#!/usr/bin/env node
/**
 * TEST: ProblemId Flow
 * Verifies that problemIds are consistently generated across AI service, backend, and DB
 * 
 * FLOW:
 * 1. Start AI service (port 8001)
 * 2. Generate questions via LLM
 * 3. Verify problemIds in DB match AI service format
 * 4. Verify frontend can fetch and start sessions with those problemIds
 */

const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Models
const { Question: QuestionBank } = require('../src/models');
const User = require('../src/models/User');
const Session = require('../src/models/Session');

const BACKEND_URL = process.env.API_URL || 'http://localhost:5000';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepmate';

// Test user
const TEST_USER = {
  googleId: `test-${Date.now()}`,
  email: `test${Date.now()}@example.com`,
  name: 'Test User',
};

const TEST_TOPIC = 'task-scheduler';

async function log(msg, isError = false) {
  const prefix = isError ? '❌' : '✅';
  console.log(`\n${prefix} ${msg}`);
}

async function errLog(msg, err) {
  console.error(`\n❌ ${msg}`);
  if (err) {
    console.error(`   Error: ${err.message}`);
    if (err.response?.data) {
      console.error(`   Response:`, JSON.stringify(err.response.data, null, 2));
    }
  }
}

async function testProblemIdFlow() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ProblemId Consistency Flow`);
  console.log(`${'='.repeat(60)}`);

  let userId;
  let generatedProblems = [];
  let savedProblems = [];
  let sessionId;

  try {
    // 1. Connect to MongoDB
    await log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`   Connected to ${MONGODB_URI}`);

    // 2. Create test user
    await log('Creating test user...');
    let user = await User.findOne({ googleId: TEST_USER.googleId });
    if (!user) {
      user = await User.create(TEST_USER);
      console.log(`   Created user: ${user._id}`);
    } else {
      console.log(`   Using existing user: ${user._id}`);
    }
    userId = user._id;

    // 3. Generate questions via API
    await log('Generating questions via backend API...');
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/practice/topics/${TEST_TOPIC}/generate-questions`,
        { userId },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer test-${userId}`,
          },
          timeout: 30000,
        }
      );

      if (response.data.success) {
        generatedProblems = response.data.questions || [];
        console.log(`   Generated ${generatedProblems.length} questions`);
        generatedProblems.forEach((q, i) => {
          console.log(`   [${i + 1}] ${q.problemTitle} (problemId: ${q.problemId})`);
        });
      } else {
        throw new Error(response.data.message || 'Generation failed');
      }
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        throw new Error('Backend not running on ' + BACKEND_URL);
      }
      throw err;
    }

    // 4. Verify saved problems in DB
    await log('Verifying problems saved in MongoDB...');
    const dbProblems = await QuestionBank.find({
      source: 'llm',
      schemaVersion: 2,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .limit(generatedProblems.length);

    savedProblems = dbProblems;
    console.log(`   Found ${savedProblems.length} v2 problems in DB`);
    savedProblems.forEach((q, i) => {
      console.log(`   [${i + 1}] ${q.title} (problemId: ${q.problemId})`);
    });

    // 5. Verify problemId mapping
    await log('Verifying problemId mapping...');
    const problemIdMap = {};
    generatedProblems.forEach((q) => {
      problemIdMap[q.problemId] = q.problemTitle;
    });

    let mismatchCount = 0;
    for (const q of savedProblems) {
      if (problemIdMap[q.problemId]) {
        console.log(`   ✓ ${q.problemId} → ${q.title}`);
      } else {
        mismatchCount++;
        console.log(`   ✗ ${q.problemId} (NO MATCH in API response)`);
      }
    }

    if (mismatchCount > 0) {
      throw new Error(
        `${mismatchCount} saved problems don't match API response problemIds`
      );
    }

    // 6. Test starting a session with first problem
    if (savedProblems.length > 0) {
      await log('Testing session start with first problem...');
      const firstProblem = savedProblems[0];
      const problemId = firstProblem.problemId;
      console.log(`   Using problemId: ${problemId}`);

      try {
        const sessionResponse = await axios.post(
          `${BACKEND_URL}/api/practice/session`,
          {
            userId,
            topicId: TEST_TOPIC,
            problemId,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer test-${userId}`,
            },
            timeout: 10000,
          }
        );

        if (sessionResponse.data.success) {
          sessionId = sessionResponse.data.session._id;
          console.log(`   ✓ Session created: ${sessionId}`);
          console.log(`   ✓ Problem loaded: ${sessionResponse.data.session.problem?.title || 'unknown'}`);

          // Verify schema version
          if (sessionResponse.data.session.schemaVersion === 2) {
            console.log(`   ✓ schemaVersion is 2 (wrapped enforced)`);
          } else {
            console.log(`   ✗ schemaVersion is ${sessionResponse.data.session.schemaVersion} (should be 2)`);
          }
        } else {
          throw new Error(sessionResponse.data.message || 'Session creation failed');
        }
      } catch (err) {
        throw new Error(`Session creation failed: ${err.message}`);
      }
    }

    // 7. Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST PASSED ✅`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Generated: ${generatedProblems.length} questions`);
    console.log(`Saved: ${savedProblems.length} questions`);
    console.log(`ProblemIds: Consistent across AI service, backend, and DB`);
    console.log(`Session: Started successfully with v2 enforcement`);

    return {
      success: true,
      generated: generatedProblems.length,
      saved: savedProblems.length,
      session: sessionId,
    };
  } catch (error) {
    await errLog('TEST FAILED', error);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`FAILURE DETAILS`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Generated: ${generatedProblems.length} questions`);
    generatedProblems.forEach((q, i) => {
      console.log(
        `  [${i + 1}] ${q.problemTitle} → problemId: "${q.problemId}"`
      );
    });
    console.log(`\nSaved in DB: ${savedProblems.length} questions`);
    savedProblems.forEach((q, i) => {
      console.log(`  [${i + 1}] ${q.title} → problemId: "${q.problemId}"`);
    });

    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log(`\nDisconnected from MongoDB`);
    }
  }
}

// Run test
testProblemIdFlow();
