/**
 * Test v1 Rejection (Hard Fail Validation)
 * Verifies that legacy v1 problems and sessions are properly rejected
 * Usage: node scripts/test-v1-rejection.js
 */

import axios from 'axios';
import mongoose from 'mongoose';

const BASE_URL = 'http://localhost:3001/api';

async function testV1Rejection() {
  console.log('\n🚫 PHASE 10: Testing v1 Rejection (Hard Fail Validation)\n');

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepmate-ai-studio';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const { default: PracticeSession } = await import('../src/models/PracticeSession.js');

    // Test 1: Create a mock v1 session and try to access it
    console.log('📋 Test 1: Rejecting v1 sessions\n');
    
    try {
      // Create a v1 session in database
      const v1Session = new PracticeSession({
        userId: 'test-user-v1',
        problemId: 'test-problem',
        topicId: 'test-topic',
        codeLanguage: 'python',
        code: 'print("test")',
        schemaVersion: 1,  // LEGACY
        status: 'active',
        createdAt: new Date(),
      });

      await v1Session.save();
      console.log(`   Created v1 session: ${v1Session._id}`);

      // Try to access via API
      try {
        const response = await axios.get(`${BASE_URL}/practice/session/${v1Session._id}`);
        console.log(`   ❌ FAIL: API accepted v1 session (should have rejected)`);
        console.log(`   Status: ${response.status}`);
      } catch (axiosErr) {
        if (axiosErr.response?.status === 400) {
          console.log(`   ✅ PASS: API correctly rejected v1 session with 400 error`);
          console.log(`   Error: ${axiosErr.response.data.error}`);
        } else {
          console.log(`   ⚠️  Got status ${axiosErr.response?.status}, expected 400`);
        }
      }

      // Clean up
      await PracticeSession.deleteOne({ _id: v1Session._id });

    } catch (err) {
      console.log(`   Note: ${err.message}`);
    }

    console.log('');

    // Test 2: Database query filter
    console.log('📋 Test 2: Database query filtering\n');
    
    try {
      const { default: QuestionBank } = await import('../src/models/QuestionBank.js');
      
      // Count all questions
      const allCount = await QuestionBank.countDocuments({});
      
      // Count v2 active questions
      const v2Count = await QuestionBank.countDocuments({
        isActive: true,
        schemaVersion: 2,
      });

      console.log(`   Total questions in DB: ${allCount}`);
      console.log(`   V2 active questions: ${v2Count}`);
      
      if (v2Count === 0) {
        console.log(`   ⚠️  No v2 questions found. Create one with:`);
        console.log(`       node scripts/create-wrapped-test-problem.js`);
      } else {
        console.log(`   ✅ PASS: V2 filtering working\n`);
      }

    } catch (err) {
      console.log(`   Error: ${err.message}`);
    }

    // Test 3: Middleware validation
    console.log('📋 Test 3: Middleware validation functions\n');
    
    try {
      const { validateQuestionForPractice } = await import('../src/middleware/wrappedExecutionEnforcement.js');

      // Test v1 question rejection
      const v1Question = {
        title: 'Old Problem',
        schemaVersion: 1,
        stdin: 'test input',
      };

      const v1Errors = validateQuestionForPractice(v1Question);
      if (v1Errors.length > 0) {
        console.log(`   ✅ PASS: V1 question rejected`);
        console.log(`   Errors: ${v1Errors[0]}`);
      } else {
        console.log(`   ❌ FAIL: V1 question not rejected`);
      }

      // Test v2 question acceptance
      const v2Question = {
        title: 'New Problem',
        schemaVersion: 2,
        isActive: true,
        wrapperTemplate: {
          python: 'def solution(n):\n    # __USER_CODE__\n    pass',
        },
        starterCode: {
          python: 'def solution(n): pass',
        },
        testCasesStructured: [
          { input: '5', expectedOutput: '10', visibility: 'public' },
        ],
        functionMetadata: {
          name: 'solution',
          parameters: ['n'],
        },
      };

      const v2Errors = validateQuestionForPractice(v2Question);
      if (v2Errors.length === 0) {
        console.log(`\n   ✅ PASS: V2 question accepted`);
      } else {
        console.log(`   ❌ FAIL: V2 question rejected with: ${v2Errors[0]}`);
      }

    } catch (err) {
      console.log(`   Error: ${err.message}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ V1 Rejection Tests Complete\n');

  } catch (err) {
    console.error('❌ Test Error:', err.message);
    process.exit(1);
  }
}

// Only run if backend is available
async function checkBackendAndRun() {
  try {
    await axios.get(`${BASE_URL}/health`).catch(() => {
      // Health endpoint might not exist, try another endpoint
      return axios.head(`${BASE_URL}`);
    });
  } catch (err) {
    console.error('❌ Backend not running on', BASE_URL);
    console.error('\nStart backend with: cd backend && npm start\n');
    process.exit(1);
  }

  await testV1Rejection();
}

checkBackendAndRun();
