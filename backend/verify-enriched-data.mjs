import mongoose from 'mongoose';
import ExternalPlatformSubmission from './src/models/ExternalPlatformSubmission.js';

(async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');

    // Find the fresh test user's submissions (the one we just created)
    // Get the latest user submissions
    const submissions = await ExternalPlatformSubmission.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    console.log('='.repeat(80));
    console.log('📋 LATEST 5 SUBMISSIONS WITH ENRICHED METADATA');
    console.log('='.repeat(80));

    if (submissions.length === 0) {
      console.log('No submissions found');
      process.exit(1);
    }

    submissions.forEach((sub, i) => {
      console.log(`\n${i + 1}. ${sub.problemTitle}`);
      console.log(`   Problem ID: ${sub.problemId}`);
      console.log(`   Difficulty: ${sub.difficulty}`);
      console.log(`   Tags (${sub.tags?.length || 0}): ${sub.tags?.length > 0 ? sub.tags.join(', ') : 'None'}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Created: ${sub.createdAt}`);
    });

    // Statistics
    console.log('\n' + '='.repeat(80));
    console.log('📊 STATISTICS');
    console.log('='.repeat(80));

    const stats = await ExternalPlatformSubmission.aggregate([
      { $group: {
          _id: '$difficulty',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('\nDifficulty Distribution:');
    stats.forEach(s => {
      console.log(`  ${s._id}: ${s.count} submissions`);
    });

    // Tags statistics
    const tagsStats = await ExternalPlatformSubmission.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    console.log('\nTop 10 Tags:');
    tagsStats.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t._id}: ${t.count} submissions`);
    });

    // Check how many have tags vs no tags
    const withTags = await ExternalPlatformSubmission.countDocuments({ tags: { $gt: [] } });
    const withoutTags = await ExternalPlatformSubmission.countDocuments({ tags: [] });
    const withDifficulty = await ExternalPlatformSubmission.countDocuments({ difficulty: { $ne: 'Unknown' } });
    const withoutDifficulty = await ExternalPlatformSubmission.countDocuments({ difficulty: 'Unknown' });

    console.log('\n' + '='.repeat(80));
    console.log('✅ DATA QUALITY METRICS');
    console.log('='.repeat(80));

    console.log(`\nWith tags: ${withTags}`);
    console.log(`Without tags: ${withoutTags}`);
    console.log(`With difficulty: ${withDifficulty}`);
    console.log(`Without difficulty: ${withoutDifficulty}`);

    const totalSubs = await ExternalPlatformSubmission.countDocuments();
    const tagsCoverage = Math.round((withTags / totalSubs) * 100);
    const difficultyCoverage = Math.round((withDifficulty / totalSubs) * 100);

    console.log(`\nTags coverage: ${tagsCoverage}% (${withTags}/${totalSubs})`);
    console.log(`Difficulty coverage: ${difficultyCoverage}% (${withDifficulty}/${totalSubs})`);

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
})();
