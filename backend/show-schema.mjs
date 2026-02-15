import mongoose from 'mongoose';

(async () => {
  await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');
  
  console.log('=== SCHEMA INFORMATION ===\n');

  // 1. Sample User Profile Structure
  console.log('1️⃣  USER PROFILE SCHEMA:');
  const user = await mongoose.connection.collection('users').findOne({email: 'testlc1771170161237@example.com'});
  if (user) {
    console.log(JSON.stringify({
      _id: user._id,
      email: user.email,
      name: user.name,
      platformProfiles: {
        leetcode: user.platformProfiles?.leetcode,
        codeforces: user.platformProfiles?.codeforces,
      },
      totalProblemsCount: user.totalProblemsCount,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }, null, 2));
  }

  // 2. Sample Submission Document
  console.log('\n2️⃣  SUBMISSION SCHEMA:');
  const submission = await mongoose.connection.collection('externalplatformsubmissions').findOne();
  if (submission) {
    console.log(JSON.stringify(submission, null, 2));
  }

  // 3. External Platform Profile
  console.log('\n3️⃣  EXTERNAL PLATFORM PROFILE SCHEMA:');
  const profile = await mongoose.connection.collection('externalplatformprofiles').findOne({username: 'shreyashshinde3011'});
  if (profile) {
    console.log(JSON.stringify(profile, null, 2));
  }

  // 4. Integration Account
  console.log('\n4️⃣  INTEGRATION ACCOUNT SCHEMA:');
  const account = await mongoose.connection.collection('integrationaccounts').findOne();
  if (account) {
    console.log(JSON.stringify(account, null, 2));
  }

  // 5. Collection Document Counts
  console.log('\n5️⃣  COLLECTION STATISTICS:');
  const userCount = await mongoose.connection.collection('users').countDocuments();
  const subCount = await mongoose.connection.collection('externalplatformsubmissions').countDocuments();
  const profileCount = await mongoose.connection.collection('externalplatformprofiles').countDocuments();
  const accountCount = await mongoose.connection.collection('integrationaccounts').countDocuments();

  console.log(`📊 Users Collection: ${userCount} documents`);
  console.log(`📊 Submissions Collection: ${subCount} documents`);
  console.log(`📊 External Profiles Collection: ${profileCount} documents`);
  console.log(`📊 Integration Accounts Collection: ${accountCount} documents`);

  // 6. Index Information
  console.log('\n6️⃣  DATABASE INDEXES:');
  
  const submissionIndexes = await mongoose.connection.collection('externalplatformsubmissions').getIndexes();
  console.log('Submission Indexes:');
  Object.entries(submissionIndexes).forEach(([name, index]) => {
    console.log(`  • ${name}: ${JSON.stringify(index.key)} ${index.unique ? '[UNIQUE]' : ''}`);
  });

  const userIndexes = await mongoose.connection.collection('users').getIndexes();
  console.log('\nUser Indexes:');
  Object.entries(userIndexes).forEach(([name, index]) => {
    console.log(`  • ${name}: ${JSON.stringify(index.key)} ${index.unique ? '[UNIQUE]' : ''}`);
  });

  const profileIndexes = await mongoose.connection.collection('externalplatformprofiles').getIndexes();
  console.log('\nExternal Platform Profile Indexes:');
  Object.entries(profileIndexes).forEach(([name, index]) => {
    console.log(`  • ${name}: ${JSON.stringify(index.key)} ${index.unique ? '[UNIQUE]' : ''}`);
  });

  await mongoose.disconnect();
  process.exit(0);
})();
