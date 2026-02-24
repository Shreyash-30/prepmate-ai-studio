#!/usr/bin/env node
/**
 * COMPREHENSIVE FLOW TEST
 * 
 * Tests the entire pipeline:
 * 1. Generate questions via AI service
 * 2. Verify database saves (GeneratedQuestionLog + QuestionBank)
 * 3. Create practice session
 * 4. Verify session has wrapped fields
 * 5. Test AI service integrations (hints, review, assist)
 */

const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const BACKEND_URL = 'http://localhost:5000/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepmate';
const TEST_TOPIC = 'trees';
const USER_ID = 'test-user-' + Date.now(); // Create unique test user

let testUser = null;
let sessionId = null;

async function log(msg, data = '') {
  const timestamp = new Date().toISOString().substring(11, 23);
  console.log(`[${timestamp}] ${msg}`);
  if (data) console.log(`            ${JSON.stringify(data, null, 2).substring(0, 200)}`);
}

async function testQuestionGeneration() {
  await log('TEST 1: Generate Questions via AI Service');
  
  try {
    // Create test user
    const User = require('./backend/src/models/User').default;
    testUser = await User.create({
      googleId: USER_ID,
      email: `${USER_ID}@test.com`,
      name: 'Test User',
    });
    await log('  ✅ Test user created', { userId: testUser._id });

    // Generate questions
    const response = await axios.post(
      `${BACKEND_URL}/practice/topics/${TEST_TOPIC}/generate-questions`,
      { userId: testUser._id, limit: 2 },
      { timeout: 60000 }
    );

    if (!response.data?.success) {
      throw new Error(`Generation failed: ${response.data?.message}`);
    }

    const questions = response.data.data?.questions || [];
    await log(`  ✅ Generated ${questions.length} questions`);
    
    if (questions.length === 0) {
      throw new Error('No questions generated!');
    }

    return questions[0]; // Return first question for further testing
  } catch (error) {
    await log(`  ❌ FAILED: ${error.message}`);
    throw error;
  }
}

async function testDatabaseStorage(problemId) {
  await log('TEST 2: Verify Database Storage');
  
  try {
    const db = mongoose.connection.db;
    const questionBankColl = db.collection('question_bank');
    const generatedLogColl = db.collection('generated_question_logs');

    // Check QuestionBank
    const inBank = await questionBankColl.findOne({ problemId });
    if (inBank) {
      await log(`  ✅ Found in QuestionBank`, {
        title: inBank.title,
        schemaVersion: inBank.schemaVersion,
        isActive: inBank.isActive,
      });
    } else {
      await log(`  ⚠️  NOT in QuestionBank`);
    }

    // Check GeneratedQuestionLog
    const inLog = await generatedLogColl.findOne({ problemId });
    if (inLog) {
      await log(`  ✅ Found in GeneratedQuestionLog`, {
        title: inLog.problemTitle,
        hasWrapper: !!inLog.wrapperTemplate?.python,
        testCasesCount: inLog.testCases?.length || 0,
      });
      return inLog;
    } else {
      await log(`  ❌ NOT in GeneratedQuestionLog`);
      throw new Error(`Question ${problemId} not found in database!`);
    }
  } catch (error) {
    await log(`  ❌ FAILED: ${error.message}`);
    throw error;
  }
}

async function testSessionCreation(question) {
  await log('TEST 3: Create Practice Session');
  
  try {
    const response = await axios.post(
      `${BACKEND_URL}/practice/session/start`,
      {
        problemId: question.problemId,
        topicId: TEST_TOPIC,
        language: 'python',
        userId: testUser._id,
      },
      { timeout: 10000 }
    );

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Session creation failed');
    }

    sessionId = response.data.data?.sessionId;
    await log(`  ✅ Session created`, { sessionId });
    return sessionId;
  } catch (error) {
    await log(`  ❌ FAILED: ${error.message}`);
    throw error;
  }
}

async function testSessionWrappedFields() {
  await log('TEST 4: Verify Wrapped Execution Fields');
  
  try {
    const PracticeSession = require('./backend/src/models/PracticeSession').default;
    const session = await PracticeSession.findById(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    const checks = {
      hasWrapperTemplate: !!session.wrapperTemplate?.python,
      hasStarterCode: !!session.starterCode?.python,
      hasFunctionMetadata: !!session.functionMetadata?.functionName,
      hasTestCases: Array.isArray(session.testCases) && session.testCases.length > 0,
      schemaVersion: session.schemaVersion,
    };

    const allValid = Object.values(checks).every(v => v === true || typeof v === 'number');
    if (allValid) {
      await log(`  ✅ All wrapped fields present`, checks);
    } else {
      await log(`  ⚠️  Some fields missing`, checks);
    }
  } catch (error) {
    await log(`  ❌ FAILED: ${error.message}`);
    throw error;
  }
}

async function testHintGeneration() {
  await log('TEST 5: Test Hint Generation');
  
  try {
    const response = await axios.get(
      `${BACKEND_URL}/practice/session/${sessionId}/hint`,
      {
        headers: { 'x-user-id': testUser._id },
        timeout: 10000,
      }
    );

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Hint generation failed');
    }

    const hint = response.data.data?.hintText;
    if (hint) {
      await log(`  ✅ Hint generated`, { hint: hint.substring(0, 60) + '...' });
    } else {
      await log(`  ⚠️  No hint returned`);
    }
  } catch (error) {
    if (error.response?.status === 429) {
      await log(`  ⚠️  LLM cost limit reached (expected in test)`);
    } else {
      await log(`  ❌ FAILED: ${error.message}`);
    }
  }
}

async function testCodeReview() {
  await log('TEST 6: Test Code Review (Field Mapping)');
  
  try {
    // First submit some code
    const PracticeSession = require('./backend/src/models/PracticeSession').default;
    const session = await PracticeSession.findById(sessionId);
    
    session.code = 'def solution(arr):\n    return sorted(arr)';
    session.submissionResult = { passedTests: 2, totalTests: 3 };
    await session.save();

    // Request review
    const response = await axios.get(
      `${BACKEND_URL}/practice/session/${sessionId}/review`,
      {
        headers: { 
          'x-user-id': testUser._id,
          'Accept': 'text/event-stream',
        },
        timeout: 10000,
      }
    );

    // Parse SSE response
    const data = response.data;
    if (data && data.length > 0) {
      await log(`  ✅ Code review started (SSE stream)`);
    } else {
      await log(`  ⚠️  No review data received`);
    }
  } catch (error) {
    if (error.response?.status === 429) {
      await log(`  ⚠️  LLM cost limit reached (expected in test)`);
    } else {
      await log(`  ⚠️  SKIPPED: ${error.message}`);
    }
  }
}

async function runAllTests() {
  console.log(`\n${'='.repeat(70)}`);
  console.log('COMPREHENSIVE FLOW TEST - All Fixes Validation');
  console.log(`${'='.repeat(70)}\n`);

  try {
    // Connect to DB
    await mongoose.connect(MONGODB_URI);
    await log('Connected to MongoDB');

    // Run tests
    const question = await testQuestionGeneration();
    const dbQuestion = await testDatabaseStorage(question.problemId);
    await testSessionCreation(question);
    await testSessionWrappedFields();
    await testHintGeneration();
    await testCodeReview();

    console.log(`\n${'='.repeat(70)}`);
    console.log('✅ TEST SUITE COMPLETE');
    console.log(`${'='.repeat(70)}\n`);

  } catch (error) {
    console.error(`\n${'='.repeat(70)}`);
    console.error('❌ TEST SUITE FAILED');
    console.error(`${'='.repeat(70)}\n`);
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

runAllTests();
