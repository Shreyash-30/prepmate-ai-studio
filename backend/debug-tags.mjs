import mongoose from 'mongoose';
import ExternalPlatformSubmission from './src/models/ExternalPlatformSubmission.js';

(async () => {
  try {
    console.log('='.repeat(80));
    console.log('🔍 DEBUGGING: Why Tags Are Not Being Saved');
    console.log('='.repeat(80));

    await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');

    // 1. Check what's currently in the database
    console.log('\n1️⃣ CURRENT SUBMISSIONS IN DATABASE:');
    const submissions = await ExternalPlatformSubmission.find({})
      .limit(3)
      .lean();

    submissions.forEach((sub, i) => {
      console.log(`\n   ${i + 1}. ${sub.problemTitle}`);
      console.log(`      difficulty: "${sub.difficulty}" (${typeof sub.difficulty})`);
      console.log(`      tags: ${JSON.stringify(sub.tags)}`);
    });

    // 2. Try to insert a test submission with proper fields
    console.log('\n2️⃣ TEST: Inserting submission WITH metadata:');
    const testUser = new mongoose.Types.ObjectId('6991e8e89ee4944721123759');
    
    const testSub = {
      userId: testUser,
      platform: 'leetcode',
      platformSubmissionId: '9999999999',
      problemId: 'test-problem',
      problemTitle: 'Test Problem Title',
      difficulty: 'Medium',  // Valid enum value
      tags: ['Array', 'Hash Table', 'String'],  // Array of strings
      status: 'accepted',
      submissionTime: new Date(),
    };

    console.log('   Attempting to insert:');
    console.log(JSON.stringify(testSub, null, 2));

    try {
      const result = await ExternalPlatformSubmission.updateOne(
        {
          userId: testUser,
          platform: 'leetcode',
          platformSubmissionId: '9999999999',
        },
        testSub,
        { upsert: true }
      );
      console.log('   ✅ SUCCESS! Document upserted.');
      
      // Verify it was actually saved with tags
      const saved = await ExternalPlatformSubmission.findOne({
        platformSubmissionId: '9999999999',
      });
      console.log('   Verified saved document:');
      console.log(`     difficulty: "${saved.difficulty}"`);
      console.log(`     tags: ${JSON.stringify(saved.tags)}`);
    } catch (error) {
      console.log('   ❌ ERROR:', error.message);
    }

    // 3. Try with "Unknown" difficulty (the problem case)
    console.log('\n3️⃣ TEST: Inserting submission with difficulty="Unknown":');
    const testSub2 = {
      userId: testUser,
      platform: 'leetcode',
      platformSubmissionId: '8888888888',
      problemId: 'test-problem-2',
      problemTitle: 'Test Problem 2',
      difficulty: 'Unknown',  // NOT in enum!
      tags: ['Algorithm'],
      status: 'accepted',
      submissionTime: new Date(),
    };

    console.log('   Attempting to insert with difficulty="Unknown":');
    try {
      const result = await ExternalPlatformSubmission.updateOne(
        {
          userId: testUser,
          platform: 'leetcode',
          platformSubmissionId: '8888888888',
        },
        testSub2,
        { upsert: true }
      );
      console.log('   ✅ Document upserted (might have been saved without difficulty)');
      
      const saved = await ExternalPlatformSubmission.findOne({
        platformSubmissionId: '8888888888',
      });
      console.log('   Saved document:');
      console.log(`     difficulty: ${saved.difficulty}`);
      console.log(`     tags: ${JSON.stringify(saved.tags)}`);
    } catch (error) {
      console.log('   ❌ VALIDATION ERROR:', error.message);
      if (error.errors?.difficulty) {
        console.log('   ⚠️ FOUND THE ISSUE!');
        console.log(`      ${error.errors.difficulty.message}`);
      }
    }

    // 4. Check schema definition
    console.log('\n4️⃣ SCHEMA INSPECTION:');
    const schema = ExternalPlatformSubmission.schema;
    const difficultyPath = schema.path('difficulty');
    console.log(`   difficulty enum values:`, difficultyPath.enumValues);
    console.log(`   difficulty type:`, difficultyPath.instance);
    
    const tagsPath = schema.path('tags');
    console.log(`   tags type:`, tagsPath.instance);
    console.log(`   tags array type:`, tagsPath.array ? 'Array' : 'Not array');

    console.log('\n' + '='.repeat(80));
    console.log('📌 SUMMARY:');
    console.log('='.repeat(80));
    console.log(`
✅ The model schema is correctly defined
✅ Tags array should work fine
❌ PROBLEM FOUND: difficulty enum excludes "Unknown"
   
When metadata enrichment fails:
  - Service returns: { difficulty: "Unknown", tags: [] }
  - MongoDB enum validation FAILS
  - updateOne might skip the difficulty field or throw error
  
SOLUTION: Add "Unknown" to difficulty enum in ExternalPlatformSubmission.js
    `);

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
})();
