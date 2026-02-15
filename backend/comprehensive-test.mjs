import mongoose from 'mongoose';
import axios from 'axios';

const LEETCODE_GRAPHQL = 'https://leetcode.com/graphql';

// Sample GraphQL queries
const profileQuery = `
query matchedUser($username: String!) {
  matchedUser(username: $username) {
    username
    profile {
      ranking
      reputation
      userAvatar
    }
    submitStatsGlobal {
      acSubmissionNum {
        difficulty
        count
        submissions
      }
      totalSubmissionNum {
        difficulty
        count
        submissions
      }
    }
  }
}
`;

const submissionsQuery = `
query recentAcSubmissions($username: String!) {
  recentAcSubmissionList(username: $username, limit: 20) {
    id
    title
    titleSlug
    timestamp
  }
}
`;

(async () => {
  try {
    console.log('='.repeat(80));
    console.log('🧪 COMPREHENSIVE LEETCODE INTEGRATION TEST');
    console.log('='.repeat(80));

    // 1. Connect to MongoDB
    console.log('\n1️⃣  CONNECTING TO MONGODB...');
    await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');
    console.log('✅ Connected to: mongodb://localhost:27017/prepmate-ai-studio');

    // 2. Test LeetCode API - Profile
    console.log('\n2️⃣  TESTING LEETCODE API - PROFILE QUERY...');
    const profileResponse = await axios.post(LEETCODE_GRAPHQL, {
      query: profileQuery,
      variables: { username: 'shreyashshinde3011' }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (profileResponse.data.data?.matchedUser) {
      const user = profileResponse.data.data.matchedUser;
      console.log('✅ Profile API Response:');
      console.log(`   Username: ${user.username}`);
      console.log(`   Ranking: ${user.profile.ranking}`);
      const totalSolved = user.submitStatsGlobal.acSubmissionNum.find(s => s.difficulty === 'All');
      console.log(`   Total Solved: ${totalSolved?.count || 'N/A'}`);
    } else {
      console.log('❌ Profile query failed');
    }

    // 3. Test LeetCode API - Submissions
    console.log('\n3️⃣  TESTING LEETCODE API - SUBMISSIONS QUERY...');
    const submissionsResponse = await axios.post(LEETCODE_GRAPHQL, {
      query: submissionsQuery,
      variables: { username: 'shreyashshinde3011' }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (submissionsResponse.data.data?.recentAcSubmissionList) {
      const submissions = submissionsResponse.data.data.recentAcSubmissionList;
      console.log(`✅ Submissions API Response: ${submissions.length} submissions fetched`);
      console.log('   Sample submissions:');
      submissions.slice(0, 3).forEach((sub, i) => {
        console.log(`     ${i + 1}. ${sub.title} (${sub.titleSlug})`);
      });
    } else {
      console.log('❌ Submissions query failed');
    }

    // 4. DATABASE STATISTICS
    console.log('\n4️⃣  DATABASE STATISTICS...');
    const userCount = await mongoose.connection.collection('users').countDocuments();
    const subCount = await mongoose.connection.collection('externalplatformsubmissions').countDocuments();
    const profileCount = await mongoose.connection.collection('externalplatformprofiles').countDocuments();
    const accountCount = await mongoose.connection.collection('integrationaccounts').countDocuments();

    console.log(`   📊 Users: ${userCount} documents`);
    console.log(`   📊 Submissions: ${subCount} documents`);
    console.log(`   📊 Profiles: ${profileCount} documents`);
    console.log(`   📊 Accounts: ${accountCount} documents`);

    // 5. SAMPLE USER PROFILE
    console.log('\n5️⃣  SAMPLE USER PROFILE FROM DATABASE...');
    const user = await mongoose.connection.collection('users').findOne({
      'platformProfiles.leetcode.connected': true
    });

    if (user) {
      console.log('✅ Found user with LeetCode connection:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`\n   LeetCode Platform Profile:`);
      const lc = user.platformProfiles.leetcode;
      console.log(`     • Connected: ${lc.connected}`);
      console.log(`     • Username: ${lc.username}`);
      console.log(`     • Total Solved: ${lc.totalSolved}`);
      console.log(`     • Acceptance Rate: ${lc.acceptanceRate}%`);
      console.log(`     • Ranking: ${lc.ranking}`);
      console.log(`     • Last Synced: ${lc.lastSyncedAt}`);
      console.log(`\n   Overall Total Problems: ${user.totalProblemsCount}`);
    } else {
      console.log('❌ No user with LeetCode connection found');
    }

    // 6. SAMPLE SUBMISSIONS
    console.log('\n6️⃣  SAMPLE SUBMISSIONS FROM DATABASE...');
    const submissions = await mongoose.connection
      .collection('externalplatformsubmissions')
      .find({platform: 'leetcode'})
      .limit(5)
      .toArray();

    if (submissions.length > 0) {
      console.log(`✅ Found ${await mongoose.connection.collection('externalplatformsubmissions').countDocuments({platform: 'leetcode'})} LeetCode submissions`);
      submissions.forEach((sub, i) => {
        console.log(`\n   ${i + 1}. ${sub.problemTitle}`);
        console.log(`      • Problem ID: ${sub.problemId}`);
        console.log(`      • Status: ${sub.status}`);
        console.log(`      • Difficulty: ${sub.difficulty}`);
        console.log(`      • Tags: ${sub.tags && sub.tags.length > 0 ? sub.tags.join(', ') : 'None'}`);
        console.log(`      • Submission Time: ${sub.submissionTime}`);
        console.log(`      • Stored At: ${sub.createdAt}`);
      });
    } else {
      console.log('❌ No submissions found');
    }

    // 7. UNIQUE PROBLEMS
    console.log('\n7️⃣  UNIQUE PROBLEMS ANALYSIS...');
    const uniqueProblems = await mongoose.connection
      .collection('externalplatformsubmissions')
      .aggregate([
        {
          $group: {
            _id: '$problemId',
            title: { $first: '$problemTitle' },
            count: { $sum: 1 },
            difficulty: { $first: '$difficulty' }
          }
        },
        { $sort: { count: -1 } }
      ])
      .toArray();

    console.log(`✅ Found ${uniqueProblems.length} unique problems`);
    console.log('   Top 5 most submitted:');
    uniqueProblems.slice(0, 5).forEach((prob, i) => {
      console.log(`     ${i + 1}. ${prob.title} (${prob.difficulty}) - ${prob.count} submissions`);
    });

    // 8. DIFFICULTY DISTRIBUTION
    console.log('\n8️⃣  DIFFICULTY DISTRIBUTION...');
    const difficultyDist = await mongoose.connection
      .collection('externalplatformsubmissions')
      .aggregate([
        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
      .toArray();

    difficultyDist.forEach(item => {
      const bar = '█'.repeat(item.count);
      console.log(`   ${item._id.padEnd(10)} ${bar} ${item.count}`);
    });

    // 9. INTEGRATION ACCOUNT STATUS
    console.log('\n9️⃣  INTEGRATION ACCOUNT STATUS...');
    const account = await mongoose.connection.collection('integrationaccounts').findOne({
      platform: 'leetcode',
      'connectionStatus': 'connected'
    });

    if (account) {
      console.log('✅ LeetCode Integration Account:');
      console.log(`   • Status: ${account.connectionStatus}`);
      console.log(`   • Bootstrap: ${account.bootstrapStatus}`);
      console.log(`   • Username: ${account.username}`);
      console.log(`   • Connected At: ${account.createdAt}`);
      console.log(`   • Updated At: ${account.updatedAt}`);
    } else {
      console.log('⚠️  No connected LeetCode account found');
    }

    // 10. SCHEMA VALIDATION
    console.log('\n🔟 SCHEMA VALIDATION...');
    const sampleSub = await mongoose.connection
      .collection('externalplatformsubmissions')
      .findOne();

    if (sampleSub) {
      const fields = Object.keys(sampleSub).sort();
      console.log('✅ Submission document fields:');
      fields.forEach(f => {
        const value = sampleSub[f];
        const type = Array.isArray(value) ? 'array' : typeof value;
        console.log(`   • ${f}: ${type}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
})();
