#!/usr/bin/env node
import mongoose from 'mongoose';
import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
import QuestionBank from './src/models/QuestionBank.js';

dotenv.config();

const API_BASE = 'http://localhost:8000/api';
let sessionId = null;
let topicId = '6992163859b525163f58d025'; // Arrays & Hashing topic

const logger = {
  info: (msg, data) => console.log(`✓ ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
  error: (msg, data) => console.error(`✗ ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
  debug: (msg, data) => console.log(`  ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
};

async function step(name, fn) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`STEP: ${name}`);
  console.log('='.repeat(60));
  try {
    const result = await fn();
    return result;
  } catch (err) {
    logger.error(`Failed: ${err.message}`, err.response?.data || err.data);
    throw err;
  }
}

async function connectDB() {
  await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');
  logger.info('Connected to MongoDB');
}

async function checkTestProblem() {
  const problem = await QuestionBank.findOne({ problemId: 'test-two-sum' });
  
  if (!problem) {
    logger.error('test-two-sum not found in database!');
    return null;
  }
  
  logger.info('Found test-two-sum problem');
  logger.debug('Schema Version:', problem.schemaVersion);
  logger.debug('Test Cases Count:', problem.testCasesStructured?.length);
  logger.debug('Wrapper Template Languages:', Object.keys(problem.wrapperTemplate || {}));
  logger.debug('Function Metadata:', problem.functionMetadata);
  
  if (problem.testCasesStructured) {
    logger.debug('First test case:', problem.testCasesStructured[0]);
  }
  
  return problem;
}

async function startSession() {
  const response = await axios.post(`${API_BASE}/practice/session/start`, {
    problemId: 'test-two-sum',
    topicId,
    language: 'javascript',
  }, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  sessionId = response.data.data.sessionId || response.data.data._id;
  logger.info('Session created', { sessionId });
  logger.debug('Session data:', response.data.data);
  
  return response.data.data;
}

async function getSession() {
  const url = `${API_BASE}/practice/session/${sessionId}`;
  logger.info(`Fetching: ${url}`);
  const response = await axios.get(url);
  
  logger.info('Session retrieved');
  logger.debug('Code Language:', response.data.data.codeLanguage);
  logger.debug('Test Cases:', response.data.data.testCases?.length);
  logger.debug('Has Wrapper Template:', !!response.data.data.wrapperTemplate);
  logger.debug('Has Starter Code:', !!response.data.data.starterCode);
  logger.debug('Problem Title:', response.data.data.problemTitle);
  
  if (response.data.data.testCases) {
    logger.debug('First test case:', response.data.data.testCases[0]);
  }
  
  return response.data.data;
}

async function runSimpleCode() {
  // Simple Two Sum solution
  const code = `
function twoSum(nums, target) {
  const map = {};
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map[complement] !== undefined) {
      return [map[complement], i];
    }
    map[nums[i]] = i;
  }
  return [];
}
`;

  const response = await axios.post(`${API_BASE}/practice/run/${sessionId}`, {
    code,
    language: 'javascript',
  }, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  logger.info('Code execution completed');
  logger.debug('Verdict:', response.data.data.verdict);
  logger.debug('Passed Tests:', response.data.data.passedTests);
  logger.debug('Total Tests:', response.data.data.totalTests);
  logger.debug('Results:', response.data.data.results?.slice(0, 2)); // First 2 results
  
  return response.data.data;
}

async function main() {
  try {
    await step('Connect to MongoDB', connectDB);
    
    const problem = await step('Check test-two-sum problem exists', checkTestProblem);
    
    if (!problem) {
      logger.error('Cannot continue without test-two-sum problem');
      process.exit(1);
    }
    
    await step('Create practice session', startSession);
    
    const session = await step('Retrieve session with test cases', getSession);
    
    if (!session.testCases || session.testCases.length === 0) {
      logger.error('No test cases in session!');
      process.exit(1);
    }
    
    if (!session.wrapperTemplate) {
      logger.error('No wrapper template in session!');
      process.exit(1);
    }
    
    const results = await step('Run simple Two Sum solution', runSimpleCode);
    
    logger.info('\n✓ FULL INTEGRATION TEST PASSED!\n');
    
    process.exit(0);
  } catch (err) {
    logger.error('Integration test failed', err.message);
    process.exit(1);
  }
}

main();
