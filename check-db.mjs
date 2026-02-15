import mongoose from 'mongoose';

const checkDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/prepmate-ai', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected\n');

    // Check ExternalPlatformProfile collection
    const profileCollection = mongoose.connection.collection('externalplatformprofiles');
    const profiles = await profileCollection.find({}).toArray();
    
    console.log('ExternalPlatformProfile records:');
    profiles.forEach(p => {
      console.log(`  Platform: ${p.platform}, Username: ${p.username}, TotalSolved: ${p.totalSolved}, AcceptanceRate: ${p.acceptanceRate}`);
    });

    if (profiles.length === 0) {
      console.log('  ❌ No profiles found!');
    }

    // Check User collection for platformProfiles
    console.log('\nUser platformProfiles:');
    const userCollection = mongoose.connection.collection('users');
    const users = await userCollection.find({}).toArray();
    
    users.slice(-2).forEach(u => {
      console.log(`  User: ${u.email}`);
      console.log(`    LeetCode: ${JSON.stringify(u.platformProfiles?.leetcode || {})}`);
      console.log(`    Codeforces: ${JSON.stringify(u.platformProfiles?.codeforces || {})}`);
      console.log(`    totalProblemsCount: ${u.totalProblemsCount}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Done');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

checkDatabase();
