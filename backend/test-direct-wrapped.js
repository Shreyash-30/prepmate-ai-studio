// Direct test of wrapped execution logic
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables FIRST
import dotenv from 'dotenv';
const envPath = resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

console.log('Loaded .env from:', envPath);
console.log('JUDGE0_RAPIDAPI_KEY loaded:', process.env.JUDGE0_RAPIDAPI_KEY ? 'YES' : 'NO');

// Import the service AFTER loading env
import Judge0Service from './src/services/judge0Service.js';

const testData = {
  userCode: `def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`,

  wrapperTemplate: `import json
import sys

__USER_CODE__

if __name__ == "__main__":
    input_data = json.loads(sys.argv[1])
    nums = input_data.get('nums', [])
    target = input_data.get('target', 0)
    result = twoSum(nums, target)
    print(json.dumps(result))`,

  testInput: { nums: [2, 7, 11, 15], target: 9 },
  expectedOutput: [0, 1],
  language: 'python'
};

async function test() {
  console.log('Testing wrapped execution...');
  console.log('API Key configured:', !!process.env.JUDGE0_RAPIDAPI_KEY);

  if (!Judge0Service.isConfigured()) {
    console.error('Judge0 not configured!');
    process.exit(1);
  }

  try {
    console.log('\n📝 Test input:', testData.testInput);
    console.log('📝 Expected output:', testData.expectedOutput);

    const result = await Judge0Service.runWrappedTest({
      userCode: testData.userCode,
      language: testData.language,
      wrapperTemplate: testData.wrapperTemplate,
      testInput: testData.testInput,
      expectedOutput: testData.expectedOutput,
    });

    console.log('\n✅ Execution result:');
    console.log('   Verdict:', result.verdict);
    console.log('   Passed:', result.passedTest);
    console.log('   Actual output:', result.actualOutput);
    if (result.errorOutput) console.log('   Error:', result.errorOutput.substring(0, 500));
    if (result.parseError) console.log('   Parse error:', result.parseError);

    process.exit(result.passedTest ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

test();
