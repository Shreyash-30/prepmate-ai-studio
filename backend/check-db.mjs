import mongoose from 'mongoose';

(async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/prepmate-ai');
    console.log('Connected to MongoDB\n');

    const profileCollection = mongoose.connection.collection('externalplatformprofiles');
    const profiles = await profileCollection.find({}).toArray();
    
    console.log('ExternalPlatformProfile records:');
    if (profiles.length === 0) {
      console.log('  (none)');
    }else {
      profiles.forEach(p => {
        console.log(`  Platform: ${p.platform}, Username: ${p.username}, TotalSolved: ${p.totalSolved}, AcceptanceRate: ${p.acceptanceRate}`);
      });
    }

    const integrAccounts = await mongoose.connection.collection('integrationaccounts').find({}).toArray();
    console.log('\nIntegrationAccount records:');
    integrAccounts.forEach(a => {
      console.log(`  Platform: ${a.platform}, Status: ${a.connectionStatus}, Bootstrap: ${a.bootstrapStatus}, Error: ${a.errorMessage || 'none'}`);
    });

    const users = await mongoose.connection.collection('users').find({}).toArray();
    console.log('\nLast 2 users:');
    users.slice(-2).forEach(u => {
      console.log(`  User: ${u.email}`);
      const lc = u.platformProfiles?.leetcode;
      console.log(`    LeetCode: connected=${lc?.connected}, totalSolved=${lc?.totalSolved}, acceptanceRate=${lc?.acceptanceRate}%`);
      console.log(`    totalProblemsCount: ${u.totalProblemsCount}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
})();
