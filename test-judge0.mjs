/**
 * Test Judge0 Service Integration
 * Run with: node test-judge0.mjs
 */

import judge0Service from './backend/src/services/judge0Service.js';

async function testJudge0() {
  console.log('🚀 Testing Judge0 Service\n');

  try {
    // Test 1: Language mapping
    console.log('1️⃣  Testing language mapping...');
    console.log(`   Python -> ID: ${judge0Service.getLanguageId('python')}`);
    console.log(`   JavaScript -> ID: ${judge0Service.getLanguageId('javascript')}`);
    console.log(`   Java -> ID: ${judge0Service.getLanguageId('java')}\n`);

    // Test 2: Simple code execution
    console.log('2️⃣  Testing simple code execution...');
    const simpleCode = `
print("Hello, Judge0!")
print(1 + 1)
`;

    const result = await judge0Service.executeCode({
      code: simpleCode,
      language: 'python',
      testCases: [],
      timeLimit: 2,
      memoryLimit: 256000,
    });

    console.log(`   Status: ${result.statusDescription}`);
    console.log(`   Output: ${result.stdout}`);
    console.log(`   Time: ${result.executionTime}s\n`);

    // Test 3: Test case execution
    console.log('3️⃣  Testing with test cases...');
    const testCode = `
def add(a, b):
    return a + b

# Read test input
test_input = input().strip()
a, b = map(int, test_input.split())
print(add(a, b))
`;

    const tokens = await judge0Service.submitCodeWithTestCases({
      code: testCode,
      language: 'python',
      testCases: [
        { input: '2 3', output: '5' },
        { input: '10 20', output: '30' },
      ],
      timeLimit: 2,
      memoryLimit: 256000,
    });

    console.log(`   Submitted ${tokens.length} test cases\n`);

    const results = await judge0Service.getResults(tokens);
    const summary = judge0Service.formatBatchResults(results);

    console.log(`   Verdict: ${summary.verdict}`);
    console.log(`   Passed: ${summary.passedTests}/${summary.totalTests}`);
    console.log(`   Max time: ${summary.maxExecutionTime}s\n`);

    console.log('✅ All tests completed!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testJudge0();
