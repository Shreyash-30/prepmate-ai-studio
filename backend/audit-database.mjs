import mongoose from 'mongoose';
import User from './src/models/User.js';
import ExternalPlatformSubmission from './src/models/ExternalPlatformSubmission.js';
import ExternalPlatformProfile from './src/models/ExternalPlatformProfile.js';
import IntegrationAccount from './src/models/IntegrationAccount.js';

(async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');
    
    console.log('='.repeat(80));
    console.log('🔐 DATABASE INTEGRITY & DATA ASSOCIATION AUDIT');
    console.log('='.repeat(80));

    // 1. GET ALL USERS WITH LEETCODE CONNECTION
    console.log('\n1️⃣  USERS WITH LEETCODE CONNECTION:');
    console.log('-'.repeat(80));
    
    const connectedUsers = await User.find({
      'platformProfiles.leetcode.connected': true
    }).lean();

    console.log(`Total connected users: ${connectedUsers.length}`);

    for (const user of connectedUsers) {
      console.log(`\n📌 User: ${user.email} (ID: ${user._id})`);
      console.log(`   Name: ${user.name}`);
      
      // Check User model data
      const lc = user.platformProfiles.leetcode;
      console.log(`\n   📊 User Profile (Embedded in User model):`);
      console.log(`     • connected: ${lc.connected}`);
      console.log(`     • username: ${lc.username}`);
      console.log(`     • totalSolved: ${lc.totalSolved}`);
      console.log(`     • acceptanceRate: ${lc.acceptanceRate}%`);
      console.log(`     • ranking: ${lc.ranking}`);
      console.log(`     • lastSyncedAt: ${lc.lastSyncedAt}`);
      console.log(`     • totalProblemsCount (user-level): ${user.totalProblemsCount}`);

      // Check ExternalPlatformProfile
      const extProfile = await ExternalPlatformProfile.findOne({
        userId: user._id,
        platform: 'leetcode'
      }).lean();

      if (extProfile) {
        console.log(`\n   📋 ExternalPlatformProfile (dedicated collection):`);
        console.log(`     • userId: ${extProfile.userId}`);
        console.log(`     • platform: ${extProfile.platform}`);
        console.log(`     • username: ${extProfile.username}`);
        console.log(`     • totalSolved: ${extProfile.totalSolved}`);
        console.log(`     • acceptanceRate: ${extProfile.acceptanceRate}`);
        console.log(`     • ranking: ${extProfile.ranking}`);
        console.log(`     • lastFetchedAt: ${extProfile.lastFetchedAt}`);
        console.log(`     ✅ Document ID: ${extProfile._id}`);
      } else {
        console.log(`\n   ❌ ExternalPlatformProfile: NOT FOUND`);
      }

      // Check submissions
      const submissions = await ExternalPlatformSubmission.find({
        userId: user._id,
        platform: 'leetcode'
      }).lean();

      console.log(`\n   📤 Submissions for this user:`);
      console.log(`     • Total count: ${submissions.length}`);
      
      if (submissions.length > 0) {
        // Check userId association
        const allCorrectUserId = submissions.every(s => s.userId.toString() === user._id.toString());
        console.log(`     • userId association: ${allCorrectUserId ? '✅ CORRECT' : '❌ MISMATCH'}`);

        // Check platform association
        const allCorrectPlatform = submissions.every(s => s.platform === 'leetcode');
        console.log(`     • platform association: ${allCorrectPlatform ? '✅ CORRECT' : '❌ MISMATCH'}`);

        // Check unique problems
        const uniqueProblems = new Set(submissions.map(s => s.problemId));
        console.log(`     • unique problems: ${uniqueProblems.size}`);

        // Check data completeness
        const withDifficulty = submissions.filter(s => s.difficulty && s.difficulty !== 'Unknown').length;
        const withTags = submissions.filter(s => s.tags && s.tags.length > 0).length;
        console.log(`     • with difficulty: ${withDifficulty}/${submissions.length}`);
        console.log(`     • with tags: ${withTags}/${submissions.length}`);

        // Sample submissions
        console.log(`\n     📝 Sample submissions:`);
        submissions.slice(0, 3).forEach((sub, i) => {
          console.log(`        ${i + 1}. ${sub.problemTitle}`);
          console.log(`           - Difficulty: ${sub.difficulty}`);
          console.log(`           - Tags: ${sub.tags && sub.tags.length > 0 ? sub.tags.join(', ') : 'None'}`);
          console.log(`           - Submitted: ${sub.submissionTime}`);
        });
      }

      // Check IntegrationAccount
      const account = await IntegrationAccount.findOne({
        userId: user._id,
        platform: 'leetcode'
      }).lean();

      if (account) {
        console.log(`\n   🔗 IntegrationAccount:`);
        console.log(`     • connectionStatus: ${account.connectionStatus}`);
        console.log(`     • bootstrapStatus: ${account.bootstrapStatus}`);
        console.log(`     • connectedAt: ${account.connectedAt}`);
        console.log(`     • lastSyncAt: ${account.lastSyncAt}`);
        if (account.errorMessage) {
          console.log(`     • errorMessage: ${account.errorMessage}`);
        }
      } else {
        console.log(`\n   ❌ IntegrationAccount: NOT FOUND`);
      }

      // CONSISTENCY CHECK
      console.log(`\n   ✓ CONSISTENCY CHECKS:`);
      const checks = {
        'User connected flag matches account status': 
          lc.connected === (account?.connectionStatus === 'connected'),
        'User totalSolved matches ExtProfile totalSolved': 
          lc.totalSolved === extProfile?.totalSolved,
        'User username matches ExtProfile username': 
          lc.username === extProfile?.username,
        'Submission userId matches user _id': 
          submissions.every(s => s.userId.toString() === user._id.toString()),
        'ExtProfile userId matches user _id': 
          extProfile?.userId.toString() === user._id.toString(),
      };

      Object.entries(checks).forEach(([check, result]) => {
        console.log(`     ${result ? '✅' : '❌'} ${check}`);
      });
    }

    // 2. GLOBAL STATISTICS
    console.log('\n' + '='.repeat(80));
    console.log('2️⃣  GLOBAL DATABASE STATISTICS:');
    console.log('-'.repeat(80));

    const totalUsers = await User.countDocuments();
    const usersWithLC = await User.countDocuments({ 'platformProfiles.leetcode.connected': true });
    const totalSubmissions = await ExternalPlatformSubmission.countDocuments();
    const totalProfiles = await ExternalPlatformProfile.countDocuments();
    const totalAccounts = await IntegrationAccount.countDocuments();

    console.log(`\n📊 Document Counts:`);
    console.log(`   • Total users: ${totalUsers}`);
    console.log(`   • Users with LeetCode: ${usersWithLC}`);
    console.log(`   • Total submissions: ${totalSubmissions}`);
    console.log(`   • External profiles: ${totalProfiles}`);
    console.log(`   • Integration accounts: ${totalAccounts}`);

    // 3. ORPHANED RECORDS CHECK
    console.log(`\n3️⃣  ORPHANED RECORDS CHECK:`);
    console.log('-'.repeat(80));

    // Submissions without matching user
    const userIds = connectedUsers.map(u => u._id);
    const orphanedSubmissions = await ExternalPlatformSubmission.countDocuments({
      userId: { $nin: userIds }
    });

    console.log(`\n   Submissions for non-existent users: ${orphanedSubmissions}`);

    // Profiles without matching user
    const orphanedProfiles = await ExternalPlatformProfile.countDocuments({
      userId: { $nin: userIds }
    });

    console.log(`   External profiles for non-existent users: ${orphanedProfiles}`);

    // Accounts without matching user
    const orphanedAccounts = await IntegrationAccount.countDocuments({
      userId: { $nin: userIds }
    });

    console.log(`   Integration accounts for non-existent users: ${orphanedAccounts}`);

    // 4. SCHEMA VALIDATION
    console.log(`\n4️⃣  SCHEMA VALIDATION:`);
    console.log('-'.repeat(80));

    // Check sample documents against schema
    const sampleSubmission = await ExternalPlatformSubmission.findOne().lean();
    const submissionSchema = {
      userId: 'ObjectId',
      platform: 'String (enum: leetcode, codeforces)',
      platformSubmissionId: 'String',
      problemId: 'String',
      problemTitle: 'String',
      difficulty: "String (enum: 'Easy', 'Medium', 'Hard', 'Unknown')",
      tags: 'Array<String>',
      status: 'String',
      submissionTime: 'Date',
      createdAt: 'Date',
      updatedAt: 'Date',
    };

    console.log(`\n   ExternalPlatformSubmission Schema Compliance:`);
    Object.entries(submissionSchema).forEach(([field, expected]) => {
      const has = field in sampleSubmission;
      console.log(`     ${has ? '✅' : '❌'} ${field}: ${expected}`);
    });

    const sampleProfile = await ExternalPlatformProfile.findOne().lean();
    const profileSchema = {
      userId: 'ObjectId',
      platform: 'String',
      username: 'String',
      totalSolved: 'Number',
      acceptanceRate: 'Number',
      ranking: 'Number',
      badges: 'Array',
      lastFetchedAt: 'Date',
    };

    console.log(`\n   ExternalPlatformProfile Schema Compliance:`);
    Object.entries(profileSchema).forEach(([field, expected]) => {
      const has = field in sampleProfile;
      console.log(`     ${has ? '✅' : '❌'} ${field}: ${expected}`);
    });

    // 5. INDEX VERIFICATION
    console.log(`\n5️⃣  DATABASE INDEXES:`);
    console.log('-'.repeat(80));

    const submissionIndexes = await ExternalPlatformSubmission.collection.getIndexes();
    console.log(`\n   ExternalPlatformSubmission Indexes:`);
    Object.entries(submissionIndexes).forEach(([name, spec]) => {
      console.log(`     • ${name}: ${JSON.stringify(spec.key)}`);
    });

    console.log(`\n` + '='.repeat(80));
    console.log('✅ DATABASE AUDIT COMPLETE');
    console.log('='.repeat(80));

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
