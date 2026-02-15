import mongoose from 'mongoose';

(async () => {
  await mongoose.connect('mongodb://localhost:27017/prepmate-ai');
  
  const users = await mongoose.connection.collection('users').find({}).sort({ createdAt: -1 }).limit(3).toArray();
  console.log('Recent users:');
  users.forEach(u => {
    console.log(`  Email: ${u.email}`);
    const lc = u.platformProfiles?.leetcode;
    console.log(`    LeetCode: connected=${lc?.connected}, totalSolved=${lc?.totalSolved}, acceptanceRate=${lc?.acceptanceRate}%`);
    console.log(`    totalProblemsCount: ${u.totalProblemsCount}`);
  });

  const submissionCount = await mongoose.connection.collection('externalplatformsubmissions').countDocuments();
  const submissions = await mongoose.connection.collection('externalplatformsubmissions').find({}).limit(5).toArray();
  
  console.log(`\nTotal submissions in DB: ${submissionCount}`);
  console.log('Sample submissions:');
  submissions.forEach(s => {
    console.log(`  Problem: ${s.problemTitle}, Difficulty: ${s.difficulty}, Status: ${s.status}`);
  });

  const profiles = await mongoose.connection.collection('externalplatformprofiles').find({}).toArray();
  console.log(`\nExternal profiles:`);
  profiles.forEach(p => {
    console.log(`  Platform: ${p.platform}, Username: ${p.username}, TotalSolved: ${p.totalSolved}, AcceptanceRate: ${p.acceptanceRate}%`);
  });

  await mongoose.disconnect();
  process.exit(0);
})();
