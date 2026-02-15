import mongoose from 'mongoose';
import User from './src/models/User.js';
import IntegrationAccount from './src/models/IntegrationAccount.js';
import { bootstrap } from './src/services/integrationBootstrapService.js';

(async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');

    console.log('='.repeat(80));
    console.log('🔧 CREATING FRESH TEST USER & BOOTSTRAPPING');
    console.log('='.repeat(80));

    // Create brand new user
    const newUser = new User({
      email: `literate${Date.now()}@test.com`,
      name: 'Fresh Test User',
      password: 'password123',
      platformProfiles: { leetcode: {}, codeforces: {} },
      totalProblemsCount: 0,
    });
    await newUser.save();
    console.log(`\n✅ Created user: ${newUser._id}`);

    // Create account record
    const account = new IntegrationAccount({
      userId: newUser._id,
      platform: 'leetcode',
      username: 'shreyashshinde3011',
      connectionStatus: 'pending',
      bootstrapStatus: 'pending',
    });
    await account.save();
    console.log(`✅ Created integration account\n`);

    // RUN BOOTSTRAP
    console.log('================================================================');
    console.log('📤 RUNNING BOOTSTRAP...');
    console.log('================================================================\n');
    
    const result = await bootstrap(newUser._id, 'leetcode', 'shreyashshinde3011');
    
    console.log('\n================================================================');
    console.log('📊 BOOTSTRAP RESULT:');
    console.log('================================================================');
    console.log(JSON.stringify(result, null, 2));

    // CHECK FINAL STATE
    console.log('\n================================================================');
    console.log('🔍 FINAL USER STATE IN DATABASE:');
    console.log('================================================================\n');
    
    const finalUser = await User.findById(newUser._id);
    console.log(`Email: ${finalUser.email}`);
    console.log(`\nplatformProfiles.leetcode:`);
    const lc = finalUser.platformProfiles.leetcode;
    Object.entries(lc).forEach(([k, v]) => {
      console.log(`  • ${k}: ${v}`);
    });

    console.log(`\ntotalProblemsCount: ${finalUser.totalProblemsCount}`);

    // AUDIT: Compare expected vs actual
    console.log('\n================================================================');
    console.log('✅ AUDIT: Expected vs Actual');
    console.log('================================================================\n');

    const expectedTotalSolved = 421; // From LeetCode API for shreyashshinde3011
    const actualTotalSolved = finalUser.platformProfiles.leetcode.totalSolved;
    const expectedTotal = 421;
    const actualTotal = finalUser.totalProblemsCount;

    console.log(`totalSolved:`);
    console.log(`  Expected: ${expectedTotalSolved}`);
    console.log(`  Actual:   ${actualTotalSolved}`);
    console.log(`  Status:   ${actualTotalSolved === expectedTotalSolved ? '✅ MATCH' : '❌ MISMATCH'}`);

    console.log(`\ntotalProblemsCount:`);
    console.log(`  Expected: ${expectedTotal}`);
    console.log(`  Actual:   ${actualTotal}`);
    console.log(`  Status:   ${actualTotal === expectedTotal ? '✅ MATCH' : '❌ MISMATCH'}`);

    console.log('\n' + '='.repeat(80));

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
