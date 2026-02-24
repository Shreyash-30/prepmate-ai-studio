#!/usr/bin/env node

/**
 * Judge0 Diagnostic Script
 * Tests Judge0 API connectivity and configuration
 * Usage: node scripts/test-judge0-connection.js
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const JUDGE0_BASE_URL = process.env.JUDGE0_BASE_URL || 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_RAPIDAPI_KEY = process.env.JUDGE0_RAPIDAPI_KEY;
const JUDGE0_RAPIDAPI_HOST = process.env.JUDGE0_RAPIDAPI_HOST || 'judge0-ce.p.rapidapi.com';

console.log('🔍 Judge0 Diagnostic Test');
console.log('='.repeat(60));
console.log('');

// Check configuration
console.log('📋 Configuration Check:');
console.log(`  Base URL: ${JUDGE0_BASE_URL}`);
console.log(`  API Host: ${JUDGE0_RAPIDAPI_HOST}`);
console.log(`  API Key Present: ${JUDGE0_RAPIDAPI_KEY ? '✅ YES' : '❌ NO - MISSING!'}`);
console.log('');

if (!JUDGE0_RAPIDAPI_KEY) {
  console.log('❌ ERROR: JUDGE0_RAPIDAPI_KEY is not configured!');
  console.log('');
  console.log('📝 To fix:');
  console.log('  1. Copy .env.example to .env');
  console.log('  2. Get your RapidAPI key from: https://rapidapi.com/judge0-official/api/judge0');
  console.log('  3. Set JUDGE0_RAPIDAPI_KEY in .env file');
  console.log('');
  process.exit(1);
}

// Test connectivity
async function testJudge0() {
  console.log('🧪 Running Judge0 Test Submission...');
  console.log('');

  try {
    const testCode = `
print("test output")
print("123")
`;

    const headers = {
      'Content-Type': 'application/json',
      'x-rapidapi-key': JUDGE0_RAPIDAPI_KEY,
      'x-rapidapi-host': JUDGE0_RAPIDAPI_HOST,
    };

    console.log('  → Submitting test code to Judge0...');

    const submitResponse = await axios.post(
      `${JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=false`,
      {
        language_id: 71, // Python
        source_code: testCode,
        stdin: '',
        expected_output: 'test output\n123',
      },
      { headers, timeout: 10000 }
    );

    const token = submitResponse.data.token;
    console.log(`  ✅ Submission successful! Token: ${token}`);
    console.log('');

    // Poll for result
    console.log('  → Polling for result (max 20 seconds)...');
    let result;
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pollResponse = await axios.get(
        `${JUDGE0_BASE_URL}/submissions/${token}?base64_encoded=false`,
        { headers, timeout: 10000 }
      );

      result = pollResponse.data;
      attempts++;

      if (result.status.id > 2) {
        // Status > 2 means complete
        break;
      }

      console.log(`    Attempt ${attempts}: Status = ${result.status.description}`);
    }

    console.log('');
    console.log('✅ TEST EXECUTION COMPLETE:');
    console.log('');
    console.log(`  Status: ${result.status.description} (ID: ${result.status.id})`);
    console.log(`  Language: Python`);
    console.log(`  Execution Time: ${result.time}s`);
    console.log(`  Memory Used: ${result.memory}KB`);
    console.log(`  Output:\n${result.stdout ? '    ' + result.stdout.split('\n').join('\n    ') : '    (none)'}`);
    if (result.stderr) {
      console.log(`  Error:\n${result.stderr.split('\n').join('    ')}`);
    }
    console.log('');
    console.log('🎉 Judge0 API is working correctly!');
    console.log('');
    process.exit(0);
  } catch (error) {
    console.log('');
    console.log('❌ TEST FAILED:');
    console.log('');

    if (error.response) {
      console.log(`  HTTP Status: ${error.response.status}`);
      console.log(`  Response: ${JSON.stringify(error.response.data, null, 2)}`);

      if (error.response.status === 401) {
        console.log('');
        console.log('  ⚠️ Authentication failed! Your JUDGE0_RAPIDAPI_KEY may be invalid.');
        console.log('  Get a valid key from: https://rapidapi.com/judge0-official/api/judge0');
      } else if (error.response.status === 429) {
        console.log('');
        console.log('  ⚠️ Rate limited! You may have exceeded API quota.');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`  Cannot connect to Judge0 at ${JUDGE0_BASE_URL}`);
      console.log('  Check your internet connection or Judge0 service status.');
    } else {
      console.log(`  Error: ${error.message}`);
      if (error.stack) {
        console.log(`  Stack: ${error.stack}`);
      }
    }

    console.log('');
    console.log('📝 Troubleshooting:');
    console.log('  1. Check JUDGE0_RAPIDAPI_KEY in .env file');
    console.log('  2. Verify key is valid: https://rapidapi.com/judge0-official/api/judge0');
    console.log('  3. Check internet connection');
    console.log('  4. Try again in a few moments if rate limited');
    console.log('');
    process.exit(1);
  }
}

testJudge0();
