/**
 * DATABASE MIGRATION SCRIPT
 * 001_upgrade_submissions_for_ml_compatibility.js
 * 
 * PURPOSE:
 * - Populate new ML-ready fields in existing ExternalPlatformSubmission documents
 * - Add topic classification (primaryTopicId, secondaryTopics)
 * - Add difficulty numeric level (difficultyLevel)
 * - Parse runtime/memory to numeric values (runtime_ms, memory_kb)
 * - Initialize attempts array from submission data
 * 
 * EXECUTION:
 * Run from backend root:
 * node database/migrations/001_upgrade_submissions_for_ml_compatibility.js
 * 
 * BACKWARD COMPATIBILITY:
 * - Does not delete existing fields
 * - Is idempotent (safe to run multiple times)
 * - Only updates documents that are missing new fields
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExternalPlatformSubmission from '../src/models/ExternalPlatformSubmission.js';
import TopicMappingService from '../src/services/topicMappingService.js';

dotenv.config();

// ============================================
// MIGRATION LOGIC
// ============================================

class MigrationRunner {
  constructor() {
    this.stats = {
      totalDocuments: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };
  }

  async run() {
    console.log('🔄 Starting Migration: 001_upgrade_submissions_for_ml_compatibility');
    console.log('🔗 Connecting to MongoDB...');

    try {
      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prepmate-ai-studio');
      console.log('✅ Connected to MongoDB');

      // Get all submissions
      const submissions = await ExternalPlatformSubmission.find({});
      this.stats.totalDocuments = submissions.length;

      console.log(`📊 Found ${submissions.length} submissions to process`);

      if (submissions.length === 0) {
        console.log('✅ No submissions found, skipping migration');
        return;
      }

      // Process in batches
      const BATCH_SIZE = 100;
      for (let i = 0; i < submissions.length; i += BATCH_SIZE) {
        const batch = submissions.slice(i, i + BATCH_SIZE);
        await this.processBatch(batch);
        console.log(`📈 Progress: ${Math.min(i + BATCH_SIZE, submissions.length)}/${submissions.length}`);
      }

      console.log('\n✅ Migration completed');
      this.printStats();
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    } finally {
      await mongoose.connection.close();
    }
  }

  async processBatch(submissions) {
    const bulkOps = [];

    for (const submission of submissions) {
      try {
        const updates = this.buildUpdates(submission);

        // Only queue update if new fields are missing
        if (Object.keys(updates).length > 0) {
          bulkOps.push({
            updateOne: {
              filter: { _id: submission._id },
              update: { $set: updates },
            },
          });
          this.stats.updated++;
        } else {
          this.stats.skipped++;
        }
      } catch (error) {
        console.error(`  ⚠️  Error processing submission ${submission._id}:`, error.message);
        this.stats.errors++;
      }
    }

    // Execute bulk update
    if (bulkOps.length > 0) {
      await ExternalPlatformSubmission.bulkWrite(bulkOps);
    }
  }

  buildUpdates(submission) {
    const updates = {};

    // 1. Add difficultyLevel if missing
    if (!submission.difficultyLevel || submission.difficultyLevel === undefined) {
      updates.difficultyLevel = TopicMappingService.difficultyToLevel(submission.difficulty);
    }

    // 2. Add primaryTopicId and secondaryTopics if missing
    if (!submission.primaryTopicId) {
      const { primaryTopicId, secondaryTopics } = TopicMappingService.determinePrimaryTopic(
        submission.tags || []
      );
      updates.primaryTopicId = primaryTopicId;
      updates.secondaryTopics = secondaryTopics;
    }

    // 3. Parse runtime to runtime_ms if missing
    if (!submission.runtime_ms || submission.runtime_ms === 0) {
      updates.runtime_ms = TopicMappingService.parseRuntime(submission.runtime);
    }

    // 4. Parse memory to memory_kb if missing
    if (!submission.memory_kb || submission.memory_kb === 0) {
      updates.memory_kb = TopicMappingService.parseMemory(submission.memory);
    }

    // 5. Initialize attempts[] if missing
    if (!submission.attempts || submission.attempts.length === 0) {
      updates.attempts = TopicMappingService.buildInitialAttempts(submission);
    }

    // 6. Set default successType if missing
    if (!submission.successType) {
      updates.successType = this.inferSuccessType(submission);
    }

    return updates;
  }

  inferSuccessType(submission) {
    // Can infer from LeetCode data - for now, default to 'first_try'
    // In future, could correlate with multiple attempts if data available
    return 'first_try';
  }

  printStats() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION STATISTICS');
    console.log('='.repeat(50));
    console.log(`Total documents scanned:    ${this.stats.totalDocuments}`);
    console.log(`Documents updated:          ${this.stats.updated}`);
    console.log(`Documents skipped:          ${this.stats.skipped}`);
    console.log(`Errors encountered:         ${this.stats.errors}`);
    console.log('='.repeat(50));
  }
}

// ============================================
// EXECUTE MIGRATION
// ============================================

const runner = new MigrationRunner();
runner.run();
