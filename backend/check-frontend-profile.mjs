import mongoose from 'mongoose';
import User from './src/models/User.js';

(async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');

    console.log('='.repeat(80));
    console.log('🎨 FRONTEND PROFILE DISPLAY CHECK');
    console.log('='.repeat(80));

    // Get the user with LeetCode connection
    const user = await User.findOne({
      'platformProfiles.leetcode.connected': true
    });

    if (!user) {
      console.log('❌ No connected user found');
      process.exit(1);
    }

    console.log('\n1️⃣  USER STORED IN DATABASE:');
    console.log('-'.repeat(80));
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log(`\ntotalProblemsCount (User-level aggregate): ${user.totalProblemsCount}`);
    console.log(`\nplatformProfiles.leetcode:`);
    Object.entries(user.platformProfiles.leetcode).forEach(([k, v]) => {
      console.log(`  • ${k}: ${v}`);
    });

    // Simulate what getProfile() returns
    console.log('\n2️⃣  WHAT getProfile() RETURNS TO FRONTEND:');
    console.log('-'.repeat(80));
    
    const frontendData = {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      targetCompanies: user.targetCompanies || '',
      preparationTimeline: user.preparationTimeline || '',
      totalProblemsCount: user.totalProblemsCount || 0,
      platformProfiles: {
        leetcode: {
          connected: user.platformProfiles?.leetcode?.connected || false,
          username: user.platformProfiles?.leetcode?.username || null,
          totalSolved: user.platformProfiles?.leetcode?.totalSolved || 0,
          acceptanceRate: user.platformProfiles?.leetcode?.acceptanceRate || 0,
          ranking: user.platformProfiles?.leetcode?.ranking || 0,
          badges: user.platformProfiles?.leetcode?.badges || [],
          lastSyncedAt: user.platformProfiles?.leetcode?.lastSyncedAt || null,
        },
        codeforces: {
          connected: user.platformProfiles?.codeforces?.connected || false,
          username: user.platformProfiles?.codeforces?.username || null,
          totalSolved: user.platformProfiles?.codeforces?.totalSolved || 0,
          contestRating: user.platformProfiles?.codeforces?.contestRating || 0,
          ranking: user.platformProfiles?.codeforces?.ranking || 0,
          badges: user.platformProfiles?.codeforces?.badges || [],
          lastSyncedAt: user.platformProfiles?.codeforces?.lastSyncedAt || null,
        },
      },
      lastLogin: user.lastLogin,
    };

    console.log(JSON.stringify(frontendData, null, 2));

    // Profile display simulation
    console.log('\n3️⃣  HOW PROFILE PAGE DISPLAYS THE DATA:');
    console.log('-'.repeat(80));
    console.log(`\n🎯 CODING STATISTICS SECTION:`);
    console.log(`\n   Card 1: "Total Problems Solved"`);
    console.log(`   ├─ Value: ${frontendData.totalProblemsCount}`);
    console.log(`   └─ Source: profile.totalProblemsCount`);

    console.log(`\n   Card 2: "LeetCode"`);
    console.log(`   ├─ Value: ${frontendData.platformProfiles.leetcode.totalSolved}`);
    console.log(`   ├─ Source: profile.platformProfiles.leetcode.totalSolved`);
    console.log(`   └─ Status: ${frontendData.platformProfiles.leetcode.connected ? '✓ Connected' : '○ Not connected'}`);

    console.log(`\n   Card 3: "Codeforces"`);
    console.log(`   ├─ Value: ${frontendData.platformProfiles.codeforces.totalSolved}`);
    console.log(`   ├─ Source: profile.platformProfiles.codeforces.totalSolved`);
    console.log(`   └─ Status: ${frontendData.platformProfiles.codeforces.connected ? '✓ Connected' : '○ Not connected'}`);

    // Analysis
    console.log('\n4️⃣  DATA SOURCE ANALYSIS:');
    console.log('-'.repeat(80));

    console.log(`\n📊 Total Problems Solved (${frontendData.totalProblemsCount}):`);
    if (frontendData.totalProblemsCount === 0) {
      console.log(`   ⚠️  Currently ZERO - This is the aggregate across all platforms`);
      console.log(`   Status: Not properly calculated during bootstrap`);
    } else {
      console.log(`   ✅ Set correctly to ${frontendData.totalProblemsCount}`);
      console.log(`   Status: Calculated from LeetCode (${frontendData.platformProfiles.leetcode.totalSolved}) + Codeforces (${frontendData.platformProfiles.codeforces.totalSolved})`);
    }

    console.log(`\n📊 LeetCode Total Solved (${frontendData.platformProfiles.leetcode.totalSolved}):`);
    if (frontendData.platformProfiles.leetcode.totalSolved === 0) {
      console.log(`   ⚠️  Currently ZERO`);
      console.log(`   Reason: Bootstrap may not have fetched or updated this value`);
    } else {
      console.log(`   ✅ Correctly shows ${frontendData.platformProfiles.leetcode.totalSolved} problems`);
      console.log(`   This is from: user.platformProfiles.leetcode.totalSolved`);
    }

    // Comparison
    console.log('\n5️⃣  VALIDATION:');
    console.log('-'.repeat(80));

    const lcTotal = frontendData.platformProfiles.leetcode.totalSolved;
    const cfTotal = frontendData.platformProfiles.codeforces.totalSolved;
    const expectedTotal = lcTotal + cfTotal;

    console.log(`\n   LeetCode: ${lcTotal}`);
    console.log(`   + Codeforces: ${cfTotal}`);
    console.log(`   = Expected total: ${expectedTotal}`);
    console.log(`   ✓ Displayed total: ${frontendData.totalProblemsCount}`);

    if (expectedTotal === frontendData.totalProblemsCount) {
      console.log(`\n   ✅ CORRECT: Total Problems Count matches sum of platforms`);
    } else if (frontendData.totalProblemsCount === 0) {
      console.log(`\n   ⚠️  ISSUE: Total Problems Count is 0 but platforms have data`);
      console.log(`           This should be ${expectedTotal}`);
    } else {
      console.log(`\n   ⚠️  MISMATCH: Total is ${frontendData.totalProblemsCount} but should be ${expectedTotal}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY:');
    console.log('='.repeat(80));
    console.log(`
Frontend Profile Page Shows:
├─ "Total Problems Solved": ${frontendData.totalProblemsCount} ← ${frontendData.totalProblemsCount === 0 ? '❌ EMPTY' : '✅ POPULATED'}
├─ "LeetCode": ${frontendData.platformProfiles.leetcode.totalSolved} ← ${frontendData.platformProfiles.leetcode.totalSolved === 0 ? '❌ EMPTY' : '✅ POPULATED'}
└─ "Codeforces": ${frontendData.platformProfiles.codeforces.totalSolved} ← ${frontendData.platformProfiles.codeforces.totalSolved === 0 ? '✅ OK (no sync)' : '✅ POPULATED'}

Data Sources:
├─ totalProblemsCount: User.totalProblemsCount (aggregate field)
├─ platformProfiles.leetcode.totalSolved: From bootstrap sync
└─ platformProfiles.codeforces.totalSolved: From bootstrap sync
    `);

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
})();
