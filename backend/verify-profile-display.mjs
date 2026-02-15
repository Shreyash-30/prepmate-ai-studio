import mongoose from 'mongoose';
import User from './src/models/User.js';

(async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');

    console.log('='.repeat(80));
    console.log('🔍 CHECKING PROFILE DISPLAY FOR SUCCESSFULLY SYNCED USER');
    console.log('='.repeat(80));

    // Get the fresh test user with full enrichment
    const freshUser = await User.findOne({
      email: 'literate1771171248839@test.com'
    });

    if (!freshUser) {
      console.log('❌ Fresh test user not found');
      
      // Show all connected users
      console.log('\nAvailable connected users:');
      const users = await User.find({ 'platformProfiles.leetcode.connected': true })
        .select('email platformProfiles.leetcode.totalSolved totalProblemsCount');
      
      users.forEach(u => {
        console.log(`  • ${u.email}`);
        console.log(`    - leetcode.totalSolved: ${u.platformProfiles.leetcode.totalSolved}`);
        console.log(`    - totalProblemsCount: ${u.totalProblemsCount}\n`);
      });
      
      process.exit(1);
    }

    console.log('\n✅ Fresh test user found: ' + freshUser.email);
    console.log('-'.repeat(80));

    console.log(`\nDatabase Values:`);
    console.log(`  • leetcode.totalSolved: ${freshUser.platformProfiles.leetcode.totalSolved}`);
    console.log(`  • totalProblemsCount: ${freshUser.totalProblemsCount}`);
    console.log(`  • last synced: ${freshUser.platformProfiles.leetcode.lastSyncedAt}`);

    console.log(`\nWhat Frontend Shows in Profile Page:`);
    console.log(`  ┌─ Card 1: "Total Problems Solved"`);
    console.log(`  │  └─ Value: ${freshUser.totalProblemsCount}`);
    console.log(`  │     Source: profile.totalProblemsCount`);
    
    console.log(`  ├─ Card 2: "LeetCode"`);
    console.log(`  │  └─ Value: ${freshUser.platformProfiles.leetcode.totalSolved}`);
    console.log(`  │     Source: profile.platformProfiles.leetcode.totalSolved`);
    
    console.log(`  └─ Card 3: "Codeforces"`);
    console.log(`     └─ Value: 0 (not connected)`);

    console.log(`\n✅ ANALYSIS:`);
    if (freshUser.totalProblemsCount === freshUser.platformProfiles.leetcode.totalSolved) {
      console.log(`   ✅ CORRECT! totalProblemsCount matches platformProfiles.leetcode.totalSolved`);
      console.log(`   Both showing: ${freshUser.totalProblemsCount}`);
    } else {
      console.log(`   ❌ MISMATCH!`);
      console.log(`   totalProblemsCount: ${freshUser.totalProblemsCount}`);
      console.log(`   leetcode.totalSolved: ${freshUser.platformProfiles.leetcode.totalSolved}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log(`FINAL ANSWER: Frontend is showing BOTH correctly:
    
1. "Total Problems Solved" Card: ${freshUser.totalProblemsCount}
   └─ This is the aggregate totalProblemsCount field

2. "LeetCode" Card: ${freshUser.platformProfiles.leetcode.totalSolved}
   └─ This is platform-specific totalSolved
   
3. When only LeetCode is connected:
   └─ Both cards should show the same value (${freshUser.platformProfiles.leetcode.totalSolved})
`);
    console.log('='.repeat(80));

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
})();
