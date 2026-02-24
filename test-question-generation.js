#!/usr/bin/env node

/**
 * End-to-End Test: Question Generation and Session Creation
 * Tests the complete flow from AI generation to session creation
 */

import axios from 'axios';
import crypto from 'crypto';

const API_BASE = 'http://localhost:8000/api';
// Generate a valid MongoDB ObjectId (24-character hex string)
const DEMO_USER_ID = crypto.randomBytes(12).toString('hex');
const TOPIC_ID = 'arrays';
const LANGUAGE = 'python';

// Create a simple JWT token without jsonwebtoken dependency
// Format: header.payload.signature
function createJWT(userId) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { userId: userId, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 };
  const secret = 'your_jwt_secret_key_here';
  
  const headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64url');
  
  return `${signatureInput}.${signature}`;
}

const validToken = createJWT(DEMO_USER_ID);

async function test() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 END-TO-END TEST: Question Generation & Session Creation');
    console.log('='.repeat(80));
    console.log(`\nTest User ID: ${DEMO_USER_ID}`);

    // Step 1: Generate questions
    console.log('\n📝 STEP 1: Generating questions...');
    console.log(`   URL: POST ${API_BASE}/practice/topics/${TOPIC_ID}/generate-questions`);
    console.log(`   Waiting for response (may take 30-60 seconds)...`);

    const genResponse = await axios.post(
      `${API_BASE}/practice/topics/${TOPIC_ID}/generate-questions?limit=5`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true,
        timeout: 120000,
      }
    );

    console.log(`\n   Status: ${genResponse.status}`);
    console.log(`   Success: ${genResponse.data.success}`);

    if (genResponse.status !== 200 || !genResponse.data.success) {
      console.error(`\n❌ GENERATION FAILED!`);
      console.error(`   Status: ${genResponse.status}`);
      console.error(`   Message: ${genResponse.data.message || genResponse.data.error}`);
      if (genResponse.data.data) {
        const data = JSON.stringify(genResponse.data.data, null, 2);
        console.error(`   Details: ${data.substring(0, 500)}`);
      }
      return false;
    }

    const questions = genResponse.data.data?.questions || [];
    console.log(`\n   Questions count: ${questions.length}`);

    if (!questions || questions.length === 0) {
      console.error(`\n❌ NO QUESTIONS RETURNED!`);
      return false;
    }

    console.log(`\n   ✅ Generated ${questions.length} questions:`);
    questions.forEach((q, i) => {
      console.log(`     [${i+1}] ${q.problemTitle} (ID: ${q.problemId})`);
    });

    // Step 2: Get first question
    const firstQuestion = questions[0];
    if (!firstQuestion || !firstQuestion.problemId) {
      console.error(`\n❌ First question missing problemId!`);
      console.error(`   Question:`, JSON.stringify(firstQuestion, null, 2));
      return false;
    }

    console.log(`\n📌 STEP 2: Creating session for first question...`);
    console.log(`   Problem: ${firstQuestion.problemTitle}`);
    console.log(`   Problem ID: ${firstQuestion.problemId}`);
    console.log(`   Topic: ${TOPIC_ID}`);
    console.log(`   Language: ${LANGUAGE}`);

    // Step 3: Create practice session
    const sessionResponse = await axios.post(
      `${API_BASE}/practice/session/start`,
      {
        problemId: firstQuestion.problemId,
        topicId: TOPIC_ID,
        language: LANGUAGE,
      },
      {
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true,
        timeout: 30000,
      }
    );

    console.log(`\n   Status: ${sessionResponse.status}`);
    console.log(`   Success: ${sessionResponse.data.success}`);

    if (sessionResponse.status !== 201 || !sessionResponse.data.success) {
      console.error(`\n❌ SESSION CREATION FAILED!`);
      console.error(`   Status: ${sessionResponse.status}`);
      console.error(`   Message: ${sessionResponse.data.message}`);
      console.error(`   Error: ${sessionResponse.data.error}`);
      return false;
    }

    const sessionId = sessionResponse.data.data?.sessionId;
    console.log(`\n   ✅ Session created!`);
    console.log(`     Session ID: ${sessionId}`);
    console.log(`     Schema Version: ${sessionResponse.data.data?.schemaVersion}`);
    console.log(`     Execution Type: ${sessionResponse.data.data?.executionType}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TESTS PASSED! Full flow works correctly.');
    console.log('='.repeat(80));
    return true;

  } catch (error) {
    console.error(`\n❌ TEST ERROR!`);
    console.error(`   ${error.message}`);
    if (error.response?.data) {
      console.error(`   Response:`, JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// Run test
test().then(success => {
  process.exit(success ? 0 : 1);
});
