#!/usr/bin/env node
/**
 * TEST: Simple LLM Flow - End to End
 * 
 * Steps:
 * 1. Call backend to generate questions for a topic
 * 2. Check the response for problemId
 * 3. Search in database for those problemIds
 * 4. Try to start a session with first problem
 */

const axios = require('axios');
const { exec } = require('child_process');
const path = require('path');

const BACKEND_URL = 'http://localhost:5000/api';
const TOPIC = 'two-sum';  // Simple, well-known topic
const LIMIT = 1;  // Just get 1 question

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFlow() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`SIMPLE LLM FLOW TEST`);
  console.log(`${'='.repeat(70)}\n`);

  let userId = 'test-user-' + Date.now();

  try {
    // Step 1: Request generation
    console.log(`[STEP 1] Requesting questions from backend...`);
    console.log(`   URL: POST ${BACKEND_URL}/practice/topics/${TOPIC}/generate-questions`);
    console.log(`   Topic: ${TOPIC}`);
    console.log(`   Limit: ${LIMIT}`);
    console.log(`   User: ${userId}\n`);

    const genResponse = await axios.post(
      `${BACKEND_URL}/practice/topics/${TOPIC}/generate-questions`,
      { userId, limit: LIMIT },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    // Step 2: Parse response
    console.log(`[STEP 2] Parsing response...`);
    const responseData = genResponse.data;
    console.log(`   Status: ${genResponse.status}`);
    console.log(`   success: ${responseData.success}`);
    console.log(`   Response keys: ${Object.keys(responseData).join(', ')}`);

    const questions = responseData.data?.questions || responseData.questions || [];
    console.log(`   Questions found: ${questions.length}\n`);

    if (questions.length === 0) {
      console.log(`❌ No questions returned!\n`);
      console.log(`Full response:`, JSON.stringify(responseData, null, 2).substring(0, 500));
      return;
    }

    // Step 3: Check first question
    const firstQuestion = questions[0];
    console.log(`[STEP 3] Checking first question...`);
    console.log(`   problemTitle: ${firstQuestion.problemTitle || 'MISSING'}`);
    console.log(`   problemId: ${firstQuestion.problemId || 'MISSING'}`);
    console.log(`   schemaVersion: ${firstQuestion.schemaVersion || 'MISSING'}`);
    console.log(`   source: ${firstQuestion.source || 'MISSING'}`);
    console.log(`   Has testCases: ${Array.isArray(firstQuestion.testCases) && firstQuestion.testCases.length > 0}`);
    console.log('');

    if (!firstQuestion.problemId) {
      console.log(`❌ PROBLEM ID IS MISSING!`);
      console.log(`   This is why session creation fails.`);
      console.log(`   Question keys: ${Object.keys(firstQuestion).join(', ')}`);
      return;
    }

    const problemId = firstQuestion.problemId;

    // Step 4: Try to start session
    console.log(`[STEP 4] Starting a session with problematic use the problemId...`);
    console.log(`   problemId: ${problemId}`);
    console.log(`   topicId: ${TOPIC}`);

    try {
      const sessionResponse = await axios.post(
        `${BACKEND_URL}/practice/session/start`,
        {
          problemId,
          topicId: TOPIC,
          language: 'python',
          userId,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      if (sessionResponse.data.success) {
        console.log(`   ✅ Session created successfully!`);
        console.log(`   sessionId: ${sessionResponse.data.data?.sessionId}`);
        console.log(`   schemaVersion: ${sessionResponse.data.data?.schemaVersion}`);
        console.log('\n✅ ENTIRE FLOW PASSED!\n');
      } else {
        console.log(`   ❌ Session creation returned non-success`);
        console.log(`   Response:`, JSON.stringify(sessionResponse.data, null, 2).substring(0, 300));
      }
    } catch (err) {
      console.log(`   ❌ Session creation failed!`);
      console.log(`   Error: ${err.message}`);
      if (err.response?.status === 500) {
        console.log(`   Status: 500 (Server Error)`);
        console.log(`   Message: ${err.response.data?.message || err.response.data?.error}`);
      }
      console.log('');
    }
  } catch (error) {
    console.log(`❌ FATAL ERROR: ${error.message}\n`);
    if (error.response?.status === 500) {
      console.log(`Backend returned 500:`);
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testFlow();
