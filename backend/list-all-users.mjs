import mongoose from 'mongoose';

(async () => {
  await mongoose.connect('mongodb://localhost:27017/prepmate-ai');
  
  // Get all users
  const allUsers = await mongoose.connection.collection('users').find({}).toArray();
  console.log(`Total users in DB: ${allUsers.length}`);
  console.log('\nAll user emails:');
  allUsers.forEach((u, idx) => {
    console.log(`  ${idx + 1}. ${u.email}`);
    console.log(`     platformProfiles.leetcode.connected: ${u.platformProfiles?.leetcode?.connected}`);
    console.log(`     platformProfiles.leetcode.totalSolved: ${u.platformProfiles?.leetcode?.totalSolved}`);
    console.log(`     totalProblemsCount: ${u.totalProblemsCount}`);
  });
  
  // Get submission counts
  const submissionCount = await mongoose.connection.collection('externalplatformsubmissions').countDocuments();
  console.log(`\nTotal submissions in DB: ${submissionCount}`);
  
  await mongoose.disconnect();
  process.exit(0);
})();
