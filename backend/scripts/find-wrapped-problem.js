/**
 * Find a wrapped (schemaVersion 2) problem for testing
 * Usage: node scripts/find-wrapped-problem.js
 */

import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function findWrappedProblem() {
  try {
    console.log('\n🔍 Finding wrapped (schemaVersion 2) problems...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepmate-ai-studio';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Import QuestionBank model
    const { default: QuestionBank } = await import('../src/models/QuestionBank.js');

    // Query for v2 questions
    const wrappedQuestions = await QuestionBank.find({
      isActive: true,
      schemaVersion: 2,
    })
      .limit(5)
      .select('problemId title description difficulty schemaVersion isActive');

    if (wrappedQuestions.length === 0) {
      console.log('❌ No wrapped (v2) problems found in database');
      console.log('\nTo create a test problem, run:');
      console.log('   node scripts/create-wrapped-test-problem.js\n');
      process.exit(1);
    }

    console.log(`📋 Found ${wrappedQuestions.length} wrapped problems:\n`);

    wrappedQuestions.forEach((q, i) => {
      console.log(`${i + 1}. ${q.title}`);
      console.log(`   Problem ID: ${q.problemId}`);
      console.log(`   Difficulty: ${q.difficulty}`);
      console.log(`   Schema Version: ${q.schemaVersion}`);
      console.log(`   Status: ${q.isActive ? 'Active' : 'Inactive'}`);
      console.log('');
    });

    // Use first problem for testing
    const testProblem = wrappedQuestions[0];
    console.log(`✅ Using for E2E test: ${testProblem.title}`);
    console.log(`   Problem ID: ${testProblem.problemId}\n`);

    // Export for use in E2E tests
    process.env.TEST_PROBLEM_ID = testProblem.problemId;

    // Show how to use
    console.log('To run E2E test with this problem:');
    console.log(`   node scripts/test-wrapped-execution-e2e.js "${testProblem.problemId}"\n`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

findWrappedProblem();
