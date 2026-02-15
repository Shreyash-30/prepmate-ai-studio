import mongoose from 'mongoose';

(async () => {
  await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');
  
  // Fetch a few real submissions from the database
  const submissions = await mongoose.connection
    .collection('externalplatformsubmissions')
    .find({})
    .limit(5)
    .toArray();

  console.log('📥 REAL EXAMPLE SUBMISSIONS FROM DATABASE\n');
  console.log('='.repeat(80));
  
  submissions.forEach((sub, i) => {
    console.log(`\n${i + 1}. ${sub.problemTitle} (${sub.difficulty})`);
    console.log('-'.repeat(80));
    console.log(JSON.stringify(sub, null, 2));
  });

  console.log('\n' + '='.repeat(80));
  console.log(`\nTotal submissions in database: ${await mongoose.connection.collection('externalplatformsubmissions').countDocuments()}`);
  
  // Show submission distribution by difficulty
  const difficultyStats = await mongoose.connection
    .collection('externalplatformsubmissions')
    .aggregate([
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
    .toArray();

  console.log('\n📊 Difficulty Distribution:');
  difficultyStats.forEach(stat => {
    console.log(`  ${stat._id}: ${stat.count} submissions`);
  });

  // Show unique problems count
  const uniqueProblems = await mongoose.connection
    .collection('externalplatformsubmissions')
    .aggregate([
      { $group: { _id: '$problemId', title: { $first: '$problemTitle' } } },
      { $count: 'total' }
    ])
    .toArray();

  console.log(`\n📌 Unique Problems: ${uniqueProblems[0]?.total || 0}`);

  await mongoose.disconnect();
  process.exit(0);
})();
