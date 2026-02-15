import mongoose from 'mongoose';

(async () => {
  await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');
  
  // Find all users sorted by creation date
  const user = await mongoose.connection.collection('users').findOne({}, {sort: {createdAt: -1}});
  
  if (user) {
    console.log('✅ Latest user found!');
    console.log('Email:', user.email);
    console.log('platformProfiles.leetcode:', JSON.stringify(user.platformProfiles?.leetcode, null, 2));
    console.log('totalProblemsCount:', user.totalProblemsCount);
  } else {
    console.log('❌ No users found');
  }
  
  // Check submissions
  const subCount = await mongoose.connection.collection('externalplatformsubmissions').countDocuments();
  console.log(`\nTotal submissions in DB: ${subCount}`);
  
  if (subCount > 0) {
    const submissions = await mongoose.connection.collection('externalplatformsubmissions').find({}).limit(5).toArray();
    console.log('First 5 submissions:');
    submissions.forEach(s => {
      console.log(`  - ${s.problemTitle} (Difficulty: ${s.difficulty}, Status: ${s.status})`);
    });
  }

  // Check profiles
  const profiles = await mongoose.connection.collection('externalplatformprofiles').find({}).toArray();
  console.log(`\nExternal platform profiles: ${profiles.length}`);
  profiles.forEach(p => {
    console.log(`  Platform: ${p.platform}, Username: ${p.username}, Solved: ${p.totalSolved}, Acceptance: ${p.acceptanceRate}%`);
  });
  
  await mongoose.disconnect();
  process.exit(0);
})();
