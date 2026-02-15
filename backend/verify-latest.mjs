import mongoose from 'mongoose';

(async () => {
  await mongoose.connect('mongodb://localhost:27017/prepmate-ai');
  
  // Find the user we just created
  const user = await mongoose.connection.collection('users').findOne({email: 'testlc1771170161237@example.com'});
  
  if (!user) {
    console.log('User not found - checking by newest creation date...');
    const newest = await mongoose.connection.collection('users').findOne({}, {sort: {createdAt: -1}});
    console.log('Newest user:', newest.email);
    console.log('platformProfiles.leetcode:', JSON.stringify(newest.platformProfiles?.leetcode, null, 2));
    console.log('totalProblemsCount:', newest.totalProblemsCount);
  } else {
    console.log('User found!');
    console.log('Email:', user.email);
    console.log('platformProfiles.leetcode:', JSON.stringify(user.platformProfiles?.leetcode, null, 2));
    console.log('totalProblemsCount:', user.totalProblemsCount);
  }
  
  const subCount = await mongoose.connection.collection('externalplatformsubmissions').countDocuments();
  console.log(`\nTotal submissions in DB: ${subCount}`);
  
  const submissions = await mongoose.connection.collection('externalplatformsubmissions').find({}).limit(5).toArray();
  console.log('\nFirst 5 submissions:');
  submissions.forEach(s => {
    console.log(`  - ${s.problemTitle} (${s.difficulty})`);
  });

  const profiles = await mongoose.connection.collection('externalplatformprofiles').find({}).toArray();
  console.log(`\nExternal platform profiles: ${profiles.length}`);
  profiles.forEach(p => {
    console.log(`  - ${p.platform}: ${p.username} (${p.totalSolved} solved)`);
  });
  
  await mongoose.disconnect();
  process.exit(0);
})();
