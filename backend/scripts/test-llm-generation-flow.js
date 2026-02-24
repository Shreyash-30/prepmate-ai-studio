/**
 * Quick test to verify LLM question generation and saving flow
 * Usage: node scripts/test-llm-generation-flow.js
 */

import mongoose from 'mongoose';

async function testLLMFlow() {
  console.log('\n🧪 Testing LLM Question Generation Flow\n');

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepmate-ai-studio';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const { default: LLMQuestionGenerationService } = await import('../src/services/llmQuestionGenerationService.js');
    const { default: QuestionBank } = await import('../src/models/QuestionBank.js');

    // Mock question from LLM
    const mockLLMQuestion = {
      problemTitle: 'Test Question',
      description: 'A test question for validation',
      difficulty: 'Easy',
      primaryConceptTested: 'arrays',
      hints: ['Hint 1', 'Hint 2'],
      constraints: '1 <= n <= 100',
      testCases: [
        { input: '5', expectedOutput: '10', visibility: 'public' },
        { input: '10', expectedOutput: '20', visibility: 'public' },
      ],
      functionName: 'testFunction',
      isDuplicate: false,
    };

    console.log('📋 Step 1: Convert to wrapped format\n');
    const wrapped = await LLMQuestionGenerationService.convertToWrappedQuestions([mockLLMQuestion], 'test-topic');
    
    if (wrapped.length === 0) {
      console.error('❌ Conversion failed - no wrapped questions returned');
      process.exit(1);
    }

    const wrappedQuestion = wrapped[0];
    console.log(`✅ Converted question: ${wrappedQuestion.title}`);
    console.log(`   Problem ID: ${wrappedQuestion.problemId}`);
    console.log(`   Schema: v${wrappedQuestion.schemaVersion}`);
    console.log(`   Test cases: ${wrappedQuestion.testCasesStructured.length}`);
    console.log(`   Has wrapper template: ${!!wrappedQuestion.wrapperTemplate}`);
    console.log(`   Has starter code: ${!!wrappedQuestion.starterCode}`);
    console.log(`   Has function metadata: ${!!wrappedQuestion.functionMetadata}\n`);

    // Validate required fields
    const requiredFields = [
      'problemId', 'title', 'schemaVersion', 'isActive', 'wrapperTemplate',
      'starterCode', 'testCasesStructured', 'functionMetadata'
    ];

    const missingFields = requiredFields.filter(field => !wrappedQuestion[field]);
    if (missingFields.length > 0) {
      console.error(`❌ Missing fields: ${missingFields.join(', ')}`);
      process.exit(1);
    }
    console.log('✅ All required fields present\n');

    // Clean up any existing test question
    await QuestionBank.deleteOne({ problemId: wrappedQuestion.problemId });

    console.log('📋 Step 2: Save wrapped question to database\n');
    const saved = await LLMQuestionGenerationService.saveWrappedQuestionsToDatabase([wrappedQuestion]);
    
    if (saved.length === 0) {
      console.error('❌ Save failed - no questions returned');
      process.exit(1);
    }

    const savedQuestion = saved[0];
    console.log(`✅ Saved question: ${savedQuestion.title}`);
    console.log(`   Problem ID: ${savedQuestion.problemId}`);
    console.log(`   Schema: v${savedQuestion.schemaVersion}`);
    console.log(`   Active: ${savedQuestion.isActive}\n`);

    console.log('📋 Step 3: Retrieve from database\n');
    const retrieved = await QuestionBank.findOne({ problemId: savedQuestion.problemId });
    
    if (!retrieved) {
      console.error('❌ Retrieval failed - question not found in database');
      process.exit(1);
    }

    console.log(`✅ Retrieved question: ${retrieved.title}`);
    console.log(`   Schema: v${retrieved.schemaVersion}`);
    console.log(`   Active: ${retrieved.isActive}`);
    console.log(`   Test cases: ${retrieved.testCasesStructured.length}\n`);

    console.log('📋 Step 4: Simulate frontend return format\n');
    const plainQ = retrieved.toObject ? retrieved.toObject() : retrieved;
    const frontendFormat = {
      problemId: plainQ.problemId,
      problemTitle: plainQ.title,
      titleSlug: plainQ.titleSlug,
      difficulty: plainQ.difficulty,
      description: plainQ.content,
      constraints: plainQ.constraints,
      hints: Array.isArray(plainQ.hints) ? plainQ.hints : [],
      functionName: plainQ.functionMetadata?.functionName || 'solution',
      testCases: Array.isArray(plainQ.testCasesStructured) ? plainQ.testCasesStructured : [],
      schemaVersion: 2,
      source: 'llm',
    };

    console.log(`✅ Frontend format ready`);
    console.log(`   Problem ID: ${frontendFormat.problemId}`);
    console.log(`   Can be serialized to JSON: ${JSON.stringify(frontendFormat).length > 0}\n`);

    // Cleanup
    await QuestionBank.deleteOne({ problemId: savedQuestion.problemId });
    console.log('✅ Cleanup complete\n');

    console.log('═'.repeat(50));
    console.log('✅ ALL TESTS PASSED\n');
    console.log('LLM question generation flow is working correctly\n');

    await mongoose.disconnect();

  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

testLLMFlow();
