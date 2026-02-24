import mongoose from 'mongoose';
import GeneratedQuestionLog from '../backend/src/models/GeneratedQuestionLog.js';
import QuestionBank from '../backend/src/models/QuestionBank.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/prepmate-ai-studio';

async function checkDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected\n');

    // Check GeneratedQuestionLog
    console.log('=== GeneratedQuestionLog ===');
    const generatedCount = await GeneratedQuestionLog.countDocuments();
    console.log(`Total: ${generatedCount}`);
    
    if (generatedCount > 0) {
      const generatedQuestions = await GeneratedQuestionLog.find().limit(5);
      generatedQuestions.forEach((q, i) => {
        console.log(`${i+1}. ID: ${q._id}`);
        console.log(`   problemId: ${q.problemId}`);
        console.log(`   schemaVersion: ${q.schemaVersion}`);
        console.log(`   has wrapperTemplate: ${!!q.wrapperTemplate}`);
        console.log(`   testCases count: ${q.testCases?.length || 0}`);
      });
    }

    // Check QuestionBank
    console.log('\n=== QuestionBank ===');
    const bankCount = await QuestionBank.countDocuments();
    console.log(`Total: ${bankCount}`);
    
    if (bankCount > 0) {
      const bankQuestions = await QuestionBank.find().limit(5);
      bankQuestions.forEach((q, i) => {
        console.log(`${i+1}. ID: ${q._id}`);
        console.log(`   problemId: ${q.problemId}`);
        console.log(`   schemaVersion: ${q.schemaVersion}`);
        console.log(`   has wrapperTemplate: ${!!q.wrapperTemplate}`);
        console.log(`   testCases count: ${q.testCases?.length || 0}`);
      });
    }

    // Check for specific problem
    console.log('\n=== Searching for "two-sum" ===');
    const twoSum = await GeneratedQuestionLog.findOne({ problemId: 'two-sum' });
    if (twoSum) {
      console.log('✓ Found in GeneratedQuestionLog');
      console.log(`  Schema: ${twoSum.schemaVersion}`);
      console.log(`  Wrapper: ${!!twoSum.wrapperTemplate}`);
      console.log(`  Test cases: ${twoSum.testCases?.length}`);
    } else {
      const twoSumBank = await QuestionBank.findOne({ problemId: 'two-sum' });
      if (twoSumBank) {
        console.log('✓ Found in QuestionBank');
        console.log(`  Schema: ${twoSumBank.schemaVersion}`);
        console.log(`  Wrapper: ${!!twoSumBank.wrapperTemplate}`);
        console.log(`  Test cases: ${twoSumBank.testCases?.length}`);
      } else {
        console.log('✗ Not found');
      }
    }

    await mongoose.disconnect();
    console.log('\n✓ Disconnected');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
