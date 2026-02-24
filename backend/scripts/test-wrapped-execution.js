#!/usr/bin/env node

/**
 * Test Wrapped Code Execution
 * Tests the fixed wrapped execution with JSON input/output
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the Judge0 service
const judge0Path = dirname(__dirname) + '/src/services/judge0Service.js';
const { default: judge0Service } = await import('file://' + judge0Path);

console.log('🧪 Wrapped Code Execution Test');
console.log('='.repeat(60));
console.log('');

// Test 1: Python wrapped execution
console.log('Test 1: Python Wrapped Execution');
console.log('-'.repeat(60));

const pythonWrapper = `def two_sum(nums: list[int], target: int) -> list[int]:
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []

__USER_CODE__
import sys, json
input_data = json.loads(sys.argv[1])
result = two_sum(input_data['nums'], input_data['target'])
print(json.dumps(result))`;

const testInput = { nums: [2, 7, 11, 15], target: 9 };
const expectedOutput = [0, 1];

try {
  console.log('Submitting wrapped Python test...');
  const result = await judge0Service.runWrappedTest({
    userCode: `def two_sum(nums: list[int], target: int) -> list[int]:
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []`,
    language: 'python',
    wrapperTemplate: pythonWrapper,
    testInput,
    expectedOutput,
    timeLimit: 2,
    memoryLimit: 256,
  });

  console.log('Result:', result);
  console.log('');

  if (result.passedTest) {
    console.log('✅ Test PASSED - Output matched expected: [0, 1]');
  } else {
    console.log(`❌ Test FAILED - Expected [0, 1], got ${JSON.stringify(result.actualOutput)}`);
  }
} catch (error) {
  console.log('❌ ERROR:', error.message);
  console.log(error.stack);
}

console.log('');
console.log('Test Complete');
