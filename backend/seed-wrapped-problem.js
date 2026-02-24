/**
 * Seed wrapped execution problem
 * Creates a problem with schemaVersion 2, testCasesStructured, wrapperTemplate, etc.
 */

import mongoose from 'mongoose';
import QuestionBank from './src/models/QuestionBank.js';

// Set longer timeout for development
mongoose.set('connectTimeoutMS', 30000);
mongoose.set('socketTimeoutMS', 30000);

async function seedWrappedProblem() {
  let connected = false;
  try {
    console.log('🌱 Seeding wrapped execution problem...\n');
    console.log('Waiting for MongoDB connection...');
    
    // Wait for mongoose to be connected (it's auto-connected by app.js)
    // But if not, we need to handle the case
    let retries = 0;
    while (!mongoose.connection.readyState && retries < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }

    if (!mongoose.connection.readyState) {
      console.log('⚠️  MongoDB not connected, trying to connect...');
      // Try to connect explicitly if app didn't
      // Skip for now - problem likely already created from app
    }

    console.log('📦 Checking if problem exists...');
    const existing = await QuestionBank.findOne({ problemId: 'twosum-wrapped' });
    
    if (existing) {
      console.log('✅ Problem already exists!');
      console.log(`   ID: ${existing._id}`);
      console.log(`   Test cases: ${existing.testCasesStructured?.length || 0}`);
      process.exit(0);
    }

    console.log('Creating new problem...');

    // Create wrapped execution problem
    const problem = new QuestionBank({
      problemId: 'twosum-wrapped',
      title: 'Two Sum (Wrapped)',
      titleSlug: 'two-sum-wrapped',
      difficulty: 'Easy',
      category: 'Array',
      tags: ['array', 'hash-table'],
      source: 'LeetCode',
      sourceId: '1',

      // Wrapped execution fields
      schemaVersion: 2,
      wrapperTemplate: `def twoSum(nums: list[int], target: int) -> list[int]:
    __USER_CODE__`,

      starterCode: {
        python: `def twoSum(nums: list[int], target: int) -> list[int]:
    # Write your solution here
    pass`,
        javascript: `function twoSum(nums, target) {
    // Write your solution here
    return [];
}`,
        java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your solution here
        return new int[2];
    }
}`,
        cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your solution here
        return {};
    }
};`,
        go: `func twoSum(nums []int, target int) []int {
    // Write your solution here
    return []int{}
}`,
      },

      functionMetadata: {
        functionName: 'twoSum',
        parameters: [
          { name: 'nums', type: 'list[int]', description: 'Array of integers' },
          { name: 'target', type: 'int', description: 'Target sum' },
        ],
        returnType: 'list[int]',
        returnDescription: 'Indices of two numbers that add up to target',
      },

      testCasesStructured: [
        {
          input: { nums: [2, 7, 11, 15], target: 9 },
          expectedOutput: [0, 1],
          visibility: 'public',
          explanation: 'nums[0] + nums[1] == 9, return [0, 1]',
        },
        {
          input: { nums: [3, 2, 4], target: 6 },
          expectedOutput: [1, 2],
          visibility: 'public',
          explanation: 'nums[1] + nums[2] == 6, return [1, 2]',
        },
        {
          input: { nums: [3, 3], target: 6 },
          expectedOutput: [0, 1],
          visibility: 'public',
          explanation: 'Same element can be used twice is false, but indices can be',
        },
        {
          input: { nums: [2, 7, 11, 15, 3, 6], target: 9 },
          expectedOutput: [0, 1],
          visibility: 'hidden',
          explanation: 'More elements, same answer',
        },
      ],

      // Problem description
      content: `Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,

      constraints: [
        '2 <= nums.length <= 10^4',
        '-10^9 <= nums[i], target <= 10^9',
        'Only one valid answer exists.',
      ],

      hints: [
        'A really brute force way would be to search for complement of every element in the array.',
        'Two choices here: (1) Iterate through each element x and find if target - x exists elsewhere in array. (2) A hash table really helps when you want to search for something fast.',
      ],

      approaches: [
        {
          name: 'Brute Force',
          description: 'Two nested loops, O(n^2) time',
          timeComplexity: 'O(n^2)',
          spaceComplexity: 'O(1)',
        },
        {
          name: 'Hash Map',
          description: 'Single pass with hash map, O(n) time',
          timeComplexity: 'O(n)',
          spaceComplexity: 'O(n)',
        },
      ],

      relatedProblems: [],
      discussionUrl: 'https://leetcode.com/problems/two-sum/',
    });

    await problem.save();

    console.log('✅ Wrapped problem created successfully!');
    console.log('\n📊 Problem Details:');
    console.log(`  Problem ID: ${problem.problemId}`);
    console.log(`  Schema Version: ${problem.schemaVersion}`);
    console.log(`  Test Cases: ${problem.testCasesStructured.length}`);
    console.log(`  Starter Codes: ${Object.keys(problem.starterCode).join(', ')}`);
    console.log(`  Has Wrapper: ${problem.wrapperTemplate ? '✅' : '❌'}`);
    console.log('\n🎯 Use this problem ID in tests: "twosum-wrapped"');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    setTimeout(() => process.exit(1), 1000);
  }
}

seedWrappedProblem();
