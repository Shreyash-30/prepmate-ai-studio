import Judge0Service from './src/services/judge0Service.js';

// Test data
const testData = {
  userCode: `def twoSum(nums, target):
    """Find two numbers that add up to target"""
    seen = {}
    for num in nums:
        complement = target - num
        if complement in seen:
            return [seen[complement], nums.index(num)]
        seen[num] = nums.index(num)
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
  const service = new Judge0Service();

  if (!service.isConfigured()) {
    console.error('❌ Judge0 not configured');
    process.exit(1);
  }

  console.log('🧪 Testing wrapped execution with stdin...');
  console.log('Input:', testData.testInput);
  console.log('Expected:', testData.expectedOutput);
  console.log('---');

  try {
    const result = await service.runWrappedTest({
      userCode: testData.userCode,
      language: testData.language,
      wrapperTemplate: testData.wrapperTemplate,
      testInput: testData.testInput,
      expectedOutput: testData.expectedOutput,
    });

    console.log('\n✅ Execution completed');
    console.log('Result:');
    console.log('  Verdict:', result.verdict);
    console.log('  Passed:', result.passedTest);
    console.log('  Actual output:', result.actualOutput);
    console.log('  Expected output:', result.expectedOutput);
    console.log('  Time:', result.time, 'ms');
    console.log('  Memory:', result.memory, 'KB');

    if (result.errorOutput) {
      console.log('  Error:', result.errorOutput);
    }
    if (result.parseError) {
      console.log('  Parse Error:', result.parseError);
    }

    process.exit(result.passedTest ? 0 : 1);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

test();
