import mongoose from 'mongoose';
import User from './src/models/User.js';
import IntegrationAccount from './src/models/IntegrationAccount.js';
import ExternalPlatformSubmission from './src/models/ExternalPlatformSubmission.js';
import ExternalPlatformProfile from './src/models/ExternalPlatformProfile.js';
import { bootstrap } from './src/services/integrationBootstrapService.js';

(async () => {
  try {
    console.log('='.repeat(80));
    console.log('🧪 FULL BOOTSTRAP TEST WITH DETAILED LOGGING');
    console.log('='.repeat(80));

    await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');

    // Find the connected user
    const user = await User.findOne({
      'platformProfiles.leetcode.connected': true
    });

    if (!user) {
      console.log('\n❌ No connected user. Creating test user...');
      const newUser = new User({
        email: 'bootstrap-test@example.com',
        name: 'Bootstrap Test User',
        password: 'test123',
        platformProfiles: {
          leetcode: {
            connected: false,
            username: null,
          },
          codeforces: {
            connected: false,
            username: null,
          },
        },
        totalProblemsCount: 0,
      });
      await newUser.save();
      console.log(`✅ Created user: ${newUser._id}`);
      
      // Create integration account
      const account = new IntegrationAccount({
        userId: newUser._id,
        platform: 'leetcode',
        username: 'shreyashshinde3011',
        connectionStatus: 'pending',
        bootstrapStatus: 'pending',
      });
      await account.save();
      console.log(`✅ Created integration account`);

      // Now bootstrap
      console.log('\n📤 STARTING BOOTSTRAP FOR NEW USER...\n');
      const result = await bootstrap(newUser._id, 'leetcode', 'shreyashshinde3011');
      console.log('\n✅ Bootstrap completed:', JSON.stringify(result, null, 2));

      // Check final state
      console.log('\n📊 FINAL STATE AFTER BOOTSTRAP:');
      const finalUser = await User.findById(newUser._id);
      console.log('\n   User platformProfiles.leetcode:');
      Object.entries(finalUser.platformProfiles.leetcode).forEach(([k, v]) => {
        console.log(`     • ${k}: ${v}`);
      });
      console.log(`\n   totalProblemsCount: ${finalUser.totalProblemsCount}`);

      // Check submissions
      const subCount = await ExternalPlatformSubmission.countDocuments({
        userId: newUser._id,
        platform: 'leetcode',
      });
      console.log(`\n   Submissions saved: ${subCount}`);

      // Check profiles
      const profiles = await ExternalPlatformProfile.find({
        userId: newUser._id,
        platform: 'leetcode',
      });
      console.log(`\n   Profile documents saved: ${profiles.length}`);
      if (profiles.length > 0) {
        const prof = profiles[0];
        console.log(`     • totalSolved: ${prof.totalSolved}`);
        console.log(`     • acceptanceRate: ${prof.acceptanceRate}`);
      }

    } else {
      console.log(`\n ✅ Found connected user: ${user.email}`);
      console.log(`   Current state:`);
      console.log(`   • totalSolved: ${user.platformProfiles.leetcode.totalSolved}`);
      console.log(`   • totalProblemsCount: ${user.totalProblemsCount}`);
      
      console.log('\n   To test a full sync, either:');
      console.log('   1. Delete existing submissions and resync');
      console.log('   2. Create a new test user and account');
    }

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
