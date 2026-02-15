/**
 * MIGRATION SCRIPT: Backfill submission metadata (difficulty and tags)
 * 
 * This script enriches existing submissions with difficulty and topic tags
 * by querying the LeetCode GraphQL API using the improved metadata fetching.
 * 
 * Usage:
 *   node scripts/backfill-submission-metadata.mjs
 * 
 * What it does:
 * 1. Loads all existing submissions from database
 * 2. Identifies submissions with difficulty="Unknown" or empty tags
 * 3. Fetches metadata for each problem using getQuestionDetail query
 * 4. Updates submissions with fetched difficulty and tags
 * 5. Reports results and metrics
 */

import mongoose from 'mongoose';
import axios from 'axios';

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

const questionDetailQuery = `
  query getQuestionDetail($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      difficulty
      topicTags {
        name
        slug
      }
    }
  }
`;

/**
 * Fetch metadata for a single problem
 */
async function fetchQuestionMetadata(titleSlug) {
  try {
    const response = await axios.post(
      LEETCODE_GRAPHQL_URL,
      {
        query: questionDetailQuery,
        variables: { titleSlug },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (PrepMate-AI-Studio)',
          'Referer': 'https://leetcode.com/',
        },
        timeout: 10000,
      }
    );

    if (response.data?.errors) {
      console.warn(`  ⚠️  GraphQL error for ${titleSlug}:`, response.data.errors[0].message);
      return null;
    }

    const question = response.data?.data?.question;
    if (!question) {
      console.warn(`  ⚠️  No question data for ${titleSlug}`);
      return null;
    }

    return {
      difficulty: question.difficulty || 'Unknown',
      tags: question.topicTags?.map(tag => tag.name) || [],
    };
  } catch (error) {
    console.warn(`  ❌ Error fetching metadata for ${titleSlug}:`, error.message);
    return null;
  }
}

(async () => {
  try {
    console.log('🔄 BACKFILL SUBMISSION METADATA\n');
    console.log('='.repeat(80));

    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');
    console.log('✅ Connected to MongoDB\n');

    // Get all submissions
    const ExternalPlatformSubmission = mongoose.model(
      'ExternalPlatformSubmission',
      new mongoose.Schema({}, { strict: false })
    );

    const allSubmissions = await ExternalPlatformSubmission.find({});
    console.log(`📊 Found ${allSubmissions.length} total submissions\n`);

    // Find submissions that need enrichment
    const needsEnrichment = allSubmissions.filter(sub => 
      sub.difficulty === 'Unknown' || !sub.difficulty || !sub.tags || sub.tags.length === 0
    );

    console.log(`🎯 Submissions needing enrichment: ${needsEnrichment.length}\n`);

    if (needsEnrichment.length === 0) {
      console.log('✅ All submissions already enriched!\n');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Group by problem to avoid duplicate API calls
    const uniqueProblems = new Map();
    needsEnrichment.forEach(sub => {
      if (!uniqueProblems.has(sub.problemId)) {
        uniqueProblems.set(sub.problemId, []);
      }
      uniqueProblems.get(sub.problemId).push(sub._id);
    });

    console.log(`🔍 Unique problems to enrich: ${uniqueProblems.size}\n`);
    console.log('Fetching metadata from LeetCode API...\n');

    let enrichedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // Process each unique problem
    for (const [problemId, submissionIds] of uniqueProblems) {
      console.log(`📌 Enriching problem: ${problemId}`);
      
      // Fetch metadata from LeetCode
      const metadata = await fetchQuestionMetadata(problemId);
      
      if (!metadata) {
        console.log(`  ⏭️  Skipped (could not fetch metadata)\n`);
        skippedCount += submissionIds.length;
      } else {
        console.log(`  ✅ Metadata: ${metadata.difficulty} | ${metadata.tags.length} tags`);
        
        // Update all submissions for this problem
        try {
          const result = await ExternalPlatformSubmission.updateMany(
            { _id: { $in: submissionIds } },
            {
              difficulty: metadata.difficulty,
              tags: metadata.tags,
            }
          );
          console.log(`  💾 Updated ${result.modifiedCount} submission(s)\n`);
          enrichedCount += result.modifiedCount;
          if (result.modifiedCount < submissionIds.length) {
            failedCount += submissionIds.length - result.modifiedCount;
          }
        } catch (error) {
          console.error(`  ❌ Update failed:`, error.message, '\n');
          failedCount += submissionIds.length;
        }
      }

      // Rate limiting: wait 200ms between API calls
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('='.repeat(80));
    console.log('\n📈 BACKFILL RESULTS:\n');
    console.log(`  ✅ Successfully enriched: ${enrichedCount} submissions`);
    console.log(`  ⏭️  Skipped (API failed): ${skippedCount} submissions`);
    console.log(`  ❌ Failed to update: ${failedCount} submissions`);
    console.log(`\n📊 Total processed: ${enrichedCount + skippedCount + failedCount} submissions`);

    // Verify results
    console.log('\n🔎 Verification:\n');
    const verification = await ExternalPlatformSubmission.aggregate([
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('Difficulty distribution after enrichment:');
    verification.forEach(v => {
      console.log(`  ${v._id || 'N/A'}: ${v.count} submissions`);
    });

    // Check for empty tags
    const emptyTags = await ExternalPlatformSubmission.countDocuments({
      $or: [
        { tags: [] },
        { tags: { $exists: false } }
      ]
    });

    console.log(`\nSubmissions with empty tags: ${emptyTags}`);

    console.log('\n✅ Backfill migration complete!\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
})();
