/**
 * Debug LLM Question Generation Flow
 * Usage: node scripts/debug-llm-generation.js
 */

import mongoose from 'mongoose';

async function debugLLMFlow() {
  console.log('\n🔍 Debugging LLM Question Generation Flow\n');

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepmate-ai-studio';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const { default: QuestionBank } = await import('../src/models/QuestionBank.js');
    const { default: GeneratedQuestionLog } = await import('../src/models/GeneratedQuestionLog.js');

    // Check what's in GeneratedQuestionLog
    console.log('📋 Step 1: Checking GeneratedQuestionLog\n');
    const generatedCount = await GeneratedQuestionLog.countDocuments({});
    console.log(`Total records in GeneratedQuestionLog: ${generatedCount}`);

    if (generatedCount > 0) {
      const recentGenerated = await GeneratedQuestionLog.find({})
        .limit(3)
        .select('problemTitle userId createdAt');
      
      console.log('\nRecent generated questions:');
      recentGenerated.forEach((q, i) => {
        console.log(`${i + 1}. ${q.problemTitle} (${q.userId})`);
      });
    }

    // Check what's in QuestionBank v2
    console.log('\n📋 Step 2: Checking QuestionBank (v2, active)\n');
    const v2Count = await QuestionBank.countDocuments({
      schemaVersion: 2,
      isActive: true,
      source: 'llm',
    });
    console.log(`V2 LLM questions in QuestionBank: ${v2Count}`);

    if (v2Count > 0) {
      const recentV2 = await QuestionBank.find({
        schemaVersion: 2,
        isActive: true,
        source: 'llm',
      })
        .limit(3)
        .select('problemId title schemaVersion isActive');
      
      console.log('\nRecent V2 wrapped questions:');
      recentV2.forEach((q, i) => {
        console.log(`${i + 1}. ${q.title}`);
        console.log(`   Problem ID: ${q.problemId}`);
        console.log(`   Schema: v${q.schemaVersion}, Active: ${q.isActive}`);
      });
    }

    // Check for any legacy LLM questions
    console.log('\n📋 Step 3: Checking for legacy LLM questions\n');
    const legacyCount = await QuestionBank.countDocuments({
      $or: [
        { schemaVersion: { $ne: 2 }, source: 'llm' },
        { isActive: false, source: 'llm' },
      ],
    });
    console.log(`Legacy LLM questions: ${legacyCount}`);

    if (legacyCount > 0) {
      const legacy = await QuestionBank.findOne({
        source: 'llm',
        $or: [
          { schemaVersion: { $ne: 2 } },
          { isActive: false },
        ],
      });
      
      console.log(`\nFound legacy LLM question: ${legacy.title}`);
      console.log(`   Schema: v${legacy.schemaVersion || 'undefined'}`);
      console.log(`   Active: ${legacy.isActive}`);
      console.log(`   Problem ID: ${legacy.problemId}`);
    }

    // Check if "contains-duplicate" exists anywhere
    console.log('\n📋 Step 4: Searching for "contains-duplicate"\n');
    const generated = await GeneratedQuestionLog.findOne({
      problemTitle: { $regex: 'contains-duplicate', $options: 'i' },
    });

    if (generated) {
      console.log(`Found in GeneratedQuestionLog:`);
      console.log(`   Title: ${generated.problemTitle}`);
      console.log(`   ID: ${generated._id}`);
    } else {
      console.log('Not found in GeneratedQuestionLog');
    }

    const wrappedContains = await QuestionBank.findOne({
      $or: [
        { title: { $regex: 'contains-duplicate', $options: 'i' } },
        { problemId: { $regex: 'contains-duplicate', $options: 'i' } },
      ],
    });

    if (wrappedContains) {
      console.log(`\nFound in QuestionBank:`);
      console.log(`   Title: ${wrappedContains.title}`);
      console.log(`   Problem ID: ${wrappedContains.problemId}`);
      console.log(`   Schema: v${wrappedContains.schemaVersion}`);
      console.log(`   Active: ${wrappedContains.isActive}`);
      console.log(`   Wrapper Template: ${wrappedContains.wrapperTemplate ? 'Yes' : 'No'}`);
      console.log(`   Test Cases: ${wrappedContains.testCasesStructured?.length || 0}`);
    } else {
      console.log('\nNot found in QuestionBank');
    }

    // Summary
    console.log('\n' + '═'.repeat(50));
    console.log('📊 SUMMARY\n');
    console.log(`GeneratedQuestionLog: ${generatedCount} records`);
    console.log(`QuestionBank v2 (LLM): ${v2Count} records`);
    console.log(`Legacy LLM questions: ${legacyCount} records`);
    console.log('\n✅ Debug complete\n');

    await mongoose.disconnect();

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

debugLLMFlow();
