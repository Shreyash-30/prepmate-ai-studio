import mongoose from 'mongoose';
import QuestionBank from '../backend/src/models/QuestionBank.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/prepmate-ai-studio';

const testProblem = {
  problemId: 'test-two-sum',
  title: 'Two Sum - Test Problem',
  titleSlug: 'test-two-sum',
  difficulty: 'Easy',
  topicTags: ['Array', 'Hash Table'],
  normalizedTopics: ['array', 'hash-table'],
  content: 'Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target.',
  hints: [
    'A really brute force way would be to search for complements of every element. That would take O(n²) time. Can we optimize it?',
    'So, if we fix one element, say x, we need to find another element, say y, which is value[target - x] where value is a map of elements we have seen so far.'
  ],
  exampleCases: [
    {
      input: 'nums = [2,7,11,15], target = 9',
      output: '[0,1]'
    }
  ],
  schemaVersion: 2,
  wrapperTemplate: {
    python: `import json
import sys

__USER_CODE__

if __name__ == "__main__":
    input_data = sys.stdin.read().strip()
    if input_data:
        data = json.loads(input_data)
    else:
        data = {"nums": [2, 7, 11, 15], "target": 9}
    
    result = twoSum(data["nums"], data["target"])
    print(json.dumps(result))`,
    javascript: `const readline = require('readline');

__USER_CODE__

if (typeof module !== 'undefined' && module.exports) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  let input = '';
  rl.on('line', (line) => { input += line; });
  rl.on('close', () => {
    const data = input.trim() ? JSON.parse(input) : {nums: [2,7,11,15], target: 9};
    const result = twoSum(data.nums, data.target);
    console.log(JSON.stringify(result));
  });
}`
  },
  starterCode: {
    python: `def twoSum(nums, target):
    """
    Find two numbers that add up to target
    Args:
        nums: List of integers
        target: Target sum
    Returns:
        List of two indices
    """
    pass`,
    javascript: `/**
 * Find two numbers that add up to target
 * @param {number[]} nums - List of integers
 * @param {number} target - Target sum
 * @return {number[]} - List of two indices
 */
function twoSum(nums, target) {
    // Write your code here
}`
  },
  functionMetadata: {
    functionName: 'twoSum',
    parameters: ['nums', 'target'],
    returnType: 'List[int] / number[]'
  },
  testCasesStructured: [
    {
      input: { nums: [2, 7, 11, 15], target: 9 },
      expectedOutput: [0, 1],
      visibility: 'public'
    },
    {
      input: { nums: [3, 2, 4], target: 6 },
      expectedOutput: [1, 2],
      visibility: 'public'
    },
    {
      input: { nums: [3, 3], target: 6 },
      expectedOutput: [0, 1],
      visibility: 'public'
    },
    {
      input: { nums: [1, 2, 3, 4, 5, 6, 7, 8, 9], target: 17 },
      expectedOutput: [8, 8],
      visibility: 'hidden'
    }
  ],
  constraints: '2 <= nums.length <= 10⁴, -10⁹ <= nums[i] <= 10⁹, -10⁹ <= target <= 10⁹, Only one valid answer exists.',
  isActive: true,
  isRecommended: true,
  acceptanceRate: 49.3,
  submissionCount: 15213012,
  isPremium: false,
  relatedProblems: [],
  contentVersion: 1
};

async function seedProblem() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // Check if already exists
    const existing = await QuestionBank.findOne({ problemId: 'test-two-sum'});
    if (existing) {
      console.log('Problem already exists, updating...');
      await QuestionBank.updateOne({ problemId: 'test-two-sum' }, testProblem);
      console.log('✓ Updated test-two-sum');
    } else {
      console.log('Creating new test problem...');
      const problem = new QuestionBank(testProblem);
      await problem.save();
      console.log('✓ Created test-two-sum');
    }

    // Verify
    const saved = await QuestionBank.findOne({ problemId: 'test-two-sum' });
    console.log('\n=== Verification ===');
    console.log('Title:', saved.title);
    console.log('Schema Version:', saved.schemaVersion);
    console.log('Test Cases (testCasesStructured):', saved.testCasesStructured?.length || 0);
    console.log('Wrapper Template (Python):', saved.wrapperTemplate?.python ? `${saved.wrapperTemplate.python.length} chars` : 'MISSING');
    console.log('Starter Code (Python):', saved.starterCode?.python ? `${saved.starterCode.python.length} chars` : 'MISSING');
    console.log('Function Metadata:', saved.functionMetadata?.functionName);
    console.log('Constraints:', saved.constraints);

    await mongoose.disconnect();
    console.log('\n✓ Done');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

seedProblem();
