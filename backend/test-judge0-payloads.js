#!/usr/bin/env node
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const JUDGE0_BASE_URL = process.env.JUDGE0_BASE_URL || 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_RAPIDAPI_KEY = process.env.JUDGE0_RAPIDAPI_KEY;
const JUDGE0_RAPIDAPI_HOST = process.env.JUDGE0_RAPIDAPI_HOST || 'judge0-ce.p.rapidapi.com';

const headers = {
  'Content-Type': 'application/json',
  'X-RapidAPI-Key': JUDGE0_RAPIDAPI_KEY,
  'X-RapidAPI-Host': JUDGE0_RAPIDAPI_HOST,
};

const testPayloads = [
  {
    name: 'Simple JavaScript (Hello World)',
    payload: {
      language_id: 63,
      source_code: 'console.log("Hello World");',
      stdin: '',
      expected_output: 'Hello World',
      cpu_time_limit: 2,
      cpu_extra_time: 1,
      wall_time_limit: 4,
      memory_limit: 256000,
      stack_limit: 131072,
    },
  },
  {
    name: 'JavaScript with stdin input',
    payload: {
      language_id: 63,
      source_code: `const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

let input = '';
rl.on('line', (line) => { input += line; });
rl.on('close', () => {
  const data = JSON.parse(input);
  console.log(JSON.stringify([data.a, data.b]));
});`,
      stdin: JSON.stringify({ a: 1, b: 2 }),
      expected_output: '[1,2]',
      cpu_time_limit: 2,
      cpu_extra_time: 1,
      wall_time_limit: 4,
      memory_limit: 256000,
      stack_limit: 131072,
    },
  },
];

async function testPayload(testCase) {
  try {
    console.log(`\n✓ Testing: ${testCase.name}`);
    console.log(`Payload size: ${JSON.stringify(testCase.payload).length} bytes`);
    
    const response = await axios.post(
      `${JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=false`,
      testCase.payload,
      { headers, timeout: 10000 }
    );
    
    console.log('✅ SUCCESS - Token:', response.data.token);
    return response.data.token;
  } catch (error) {
    console.log('❌ ERROR');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Message:', error.message);
    }
    return null;
  }
}

async function main() {
  console.log('Judge0 API Testing');
  console.log('==================');
  console.log('API Key configured:', !!JUDGE0_RAPIDAPI_KEY);
  console.log('Base URL:', JUDGE0_BASE_URL);
  
  for (const testCase of testPayloads) {
    await testPayload(testCase);
  }
  
  process.exit(0);
}

main();
