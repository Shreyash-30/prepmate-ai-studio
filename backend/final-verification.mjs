import mongoose from 'mongoose';

(async () => {
  await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');
  
  console.log('=== PREPMATE LEETCODE INTEGRATION VERIFICATION ===\n');

  // 1. Check user data
  const user = await mongoose.connection.collection('users').findOne({}, {sort: {createdAt: -1}});
  if (user) {
    console.log('✅ USER DATA:');
    console.log(`   Email: ${user.email}`);
    console.log(`   LeetCode Connected: ${user.platformProfiles?.leetcode?.connected}`);
    console.log(`   LeetCode Username: ${user.platformProfiles?.leetcode?.username}`);
    console.log(`   Total Problems Solved: ${user.totalProblemsCount}`);
    console.log(`   LeetCode Total Solved: ${user.platformProfiles?.leetcode?.totalSolved}`);
    console.log(`   Acceptance Rate: ${user.platformProfiles?.leetcode?.acceptanceRate}%`);
  }

  // 2. Check External Platform Profile
  console.log('\n✅ EXTERNAL PLATFORM PROFILE:');
  const profile = await mongoose.connection.collection('externalplatformprofiles').findOne({}, {sort: {createdAt: -1}});
  if (profile) {
    console.log(`   Platform: ${profile.platform}`);
    console.log(`   Username: ${profile.username}`);
    console.log(`   Total Solved: ${profile.totalSolved}`);
    console.log(`   Acceptance Rate: ${profile.acceptanceRate}%`);
    console.log(`   Last Fetched: ${profile.lastFetchedAt}`);
  }

  // 3. Check submissions
  const subCount = await mongoose.connection.collection('externalplatformsubmissions').countDocuments();
  console.log(`\n✅ SUBMISSIONS (Total: ${subCount}):`);
  
  if (subCount > 0) {
    // Get unique problems
    const submissions = await mongoose.connection.collection('externalplatformsubmissions').find({}).toArray();
    const uniqueProblems = new Set(submissions.map(s => s.problemId));
    
    console.log(`   Unique Problems: ${uniqueProblems.size}`);
    console.log(`   Total Submission Records: ${subCount}`);
    
    console.log('\n   Sample Submissions:');
    const samples = await mongoose.connection.collection('externalplatformsubmissions').find({}).limit(10).toArray();
    samples.forEach((s, idx) => {
      console.log(`   ${idx + 1}. ${s.problemTitle || s.problemId}`);
      console.log(`      Status: ${s.status}, Difficulty: ${s.difficulty || 'N/A'}, Time: ${new Date(s.submissionTime).toLocaleDateString()}`);
    });
  } else {
    console.log('   ❌ NO SUBMISSIONS FOUND');
  }

  // 4. Check integration sync log
  console.log('\n✅ INTEGRATION SYNC LOGS:');
  const logs = await mongoose.connection.collection('integrationsynclog').find({}).sort({createdAt: -1}).limit(3).toArray();
  if (logs.length > 0) {
    logs.forEach((log, idx) => {
      console.log(`   ${idx + 1}. Platform: ${log.platform}, Status: ${log.status}`);
      console.log(`      Records Fetched: ${log.recordsFetched}, Inserted: ${log.recordsInserted}, Duplicated: ${log.recordsDuplicated}`);
    });
  } else {
    console.log('   ❌ NO SYNC LOGS');
  }

  // 5. Database Status Summary
  console.log('\n=== DATABASE SUMMARY ===');
  const userCount = await mongoose.connection.collection('users').countDocuments();
  const submissionCount = await mongoose.connection.collection('externalplatformsubmissions').countDocuments();
  const profileCount = await mongoose.connection.collection('externalplatformprofiles').countDocuments();
  const logCount = await mongoose.connection.collection('integrationsynclog').countDocuments();

  console.log(`✅ Users: ${userCount}`);
  console.log(`✅ Submissions: ${submissionCount}`);
  console.log(`✅ Platform Profiles: ${profileCount}`);
  console.log(`✅ Sync Logs: ${logCount}`);

  if (submissionCount > 0) {
    console.log('\n🎉 SUCCESS: LeetCode integration is working! Submissions are being fetched and saved.');
  } else {
    console.log('\n⚠️  No submissions found. Check if integration was triggered.');
  }

  await mongoose.disconnect();
  process.exit(0);
})();
