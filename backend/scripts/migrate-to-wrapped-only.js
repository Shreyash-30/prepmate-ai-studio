/**
 * PHASE 7: Migration Script
 * Convert legacy problems (schemaVersion 1) to schemaVersion 2 or mark as inactive
 * 
 * Usage: node migrate-to-wrapped-only.js
 */

import mongoose from 'mongoose';
import QuestionBank from '../src/models/QuestionBank.js';
import logger from '../src/utils/logger.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/prepmate_ai_studio';

async function migrateQuestions() {
  try {
    // 🔌 Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected\n');

    // 📊 Find all legacy problems
    console.log('📊 Scanning for legacy problems...');
    const legacyQuestions = await QuestionBank.find({
      $or: [
        { schemaVersion: { $lt: 2 } },
        { schemaVersion: { $exists: false } },
      ],
    });

    console.log(`Found ${legacyQuestions.length} legacy problems (schemaVersion < 2)\n`);

    if (legacyQuestions.length === 0) {
      console.log('✅ No legacy problems found. System is already v2!\n');
      await mongoose.disconnect();
      return;
    }

    // 🔥 OPTION A: Mark as inactive (safest approach)
    console.log('🔥 MIGRATING: Marking legacy problems as inactive...\n');

    const updateResult = await QuestionBank.updateMany(
      {
        $or: [
          { schemaVersion: { $lt: 2 } },
          { schemaVersion: { $exists: false } },
        ],
      },
      {
        $set: {
          isActive: false,
          schemaVersion: 1,  // Mark explicitly as v1
          migratedAt: new Date(),
          migrationNotes: 'Marked inactive - legacy format. Upgrade to schemaVersion 2 to reactivate.',
        },
      }
    );

    console.log(`✅ Updated ${updateResult.modifiedCount} legacy problems`);
    console.log(`   Status: INACTIVE (marked for deprecation)\n`);

    // 📋 Summary
    console.log('='.repeat(80));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total legacy problems found: ${legacyQuestions.length}`);
    console.log(`Problems marked inactive: ${updateResult.modifiedCount}`);
    console.log(`\n🔥 ENFORCEMENT:`)
    console.log(`   ✅ All active questions MUST be schemaVersion: 2`);
    console.log(`   ✅ All active questions MUST have wrapperTemplate`);
    console.log(`   ✅ All active questions MUST have starterCode`);
    console.log(`   ✅ All active questions MUST have testCasesStructured`);
    console.log(`\n📋 Next steps:`);
    console.log(`   1. Review any business logic constraints for inactive problems`);
    console.log(`   2. Convert key legacy problems to v2 format if needed`);
    console.log(`   3. Verify frontend only shows active questions`);
    console.log(`   4. Monitor logs for any v1 access attempts\n`);

    // 🔍 Verify enforcement
    console.log('🔍 Verifying enforcement...\n');

    // Check active questions have all v2 fields
    const activeQuestions = await QuestionBank.find({ isActive: true });
    let violations = 0;

    for (const q of activeQuestions) {
      const issues = [];

      if (q.schemaVersion !== 2) {
        issues.push(`schemaVersion is ${q.schemaVersion}, expected 2`);
      }
      if (!q.wrapperTemplate) {
        issues.push(`missing wrapperTemplate`);
      }
      if (!q.starterCode) {
        issues.push(`missing starterCode`);
      }
      if (!q.testCasesStructured || q.testCasesStructured.length === 0) {
        issues.push(`missing testCasesStructured`);
      }
      if (!q.functionMetadata) {
        issues.push(`missing functionMetadata`);
      }

      if (issues.length > 0) {
        violations++;
        console.log(`⚠️ ISSUE: ${q.title}`);
        issues.forEach(issue => console.log(`   - ${issue}`));
      }
    }

    if (violations === 0) {
      console.log(`✅ All ${activeQuestions.length} active questions pass v2 strict validation!\n`);
    } else {
      console.log(`\n⚠️ Found ${violations} active questions with v2 violations!`);
      console.log(`   These questions MUST be fixed or marked inactive\n`);
    }

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

// Run migration
migrateQuestions().catch(error => {
  console.error(error);
  process.exit(1);
});
