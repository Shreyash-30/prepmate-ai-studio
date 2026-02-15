import mongoose from 'mongoose';
import User from './src/models/User.js';

(async () => {
  try {
    console.log('='.repeat(80));
    console.log('🔍 CHECKING USER PROFILE PERSISTENCE ISSUE');
    console.log('='.repeat(80));

    await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');

    // Get the user with LeetCode connection
    const user = await User.findOne({
      'platformProfiles.leetcode.connected': true
    });

    if (!user) {
      console.log('\n❌ No connected LeetCode user found');
      process.exit(1);
    }

    console.log('\n1️⃣ CURRENT USER PROFILE FROM DATABASE:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log('\n   platformProfiles.leetcode:');
    const lc = user.platformProfiles.leetcode;
    Object.entries(lc).forEach(([key, value]) => {
      console.log(`     • ${key}: ${value}`);
    });

    console.log('\n   totalProblemsCount:', user.totalProblemsCount);

    // Try to update the user with new data
    console.log('\n2️⃣ TEST: Updating user with new LeetCode profile data...');
    const updateObj = {
      'platformProfiles.leetcode.connected': true,
      'platformProfiles.leetcode.username': 'test-update',
      'platformProfiles.leetcode.totalSolved': 500,
      'platformProfiles.leetcode.acceptanceRate': 88,
      'platformProfiles.leetcode.ranking': 100000,
      'platformProfiles.leetcode.lastSyncedAt': new Date(),
    };

    console.log('\n   Update object:');
    Object.entries(updateObj).forEach(([key, value]) => {
      console.log(`     • ${key}: ${value}`);
    });

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      updateObj,
      { new: true }
    );

    console.log('\n3️⃣ AFTER UPDATE CHECK:');
    if (updatedUser) {
      console.log('   ✅ findByIdAndUpdate returned user');
      console.log('\n   Updated platformProfiles.leetcode:');
      const updated = updatedUser.platformProfiles.leetcode;
      Object.entries(updated).forEach(([key, value]) => {
        console.log(`     • ${key}: ${value}`);
      });
    } else {
      console.log('   ❌ findByIdAndUpdate returned null!');
    }

    // Verify in database
    console.log('\n4️⃣ VERIFY IN DATABASE:');
    const verified = await User.findById(user._id).lean();
    console.log('\n   Verified from database:');
    const verifiedLc = verified.platformProfiles.leetcode;
    Object.entries(verifiedLc).forEach(([key, value]) => {
      console.log(`     • ${key}: ${value}`);
    });

    // Check totalProblemsCount
    console.log('\n5️⃣ TOTAL PROBLEMS COUNT:');
    console.log(`   Before update: ${user.totalProblemsCount}`);
    console.log(`   After update: ${verified.totalProblemsCount}`);

    console.log('\n' + '='.repeat(80));
    console.log('📌 FINDINGS:');
    console.log('='.repeat(80));
    
    if (verified.platformProfiles.leetcode.totalSolved === 500) {
      console.log('✅ totalSolved is persisting correctly');
    } else {
      console.log('❌ totalSolved is NOT persisting - value: ' + verified.platformProfiles.leetcode.totalSolved);
    }

    if (verified.platformProfiles.leetcode.ranking === 100000) {
      console.log('✅ ranking is persisting correctly');
    } else {
      console.log('❌ ranking is NOT persisting - value: ' + verified.platformProfiles.leetcode.ranking);
    }

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
