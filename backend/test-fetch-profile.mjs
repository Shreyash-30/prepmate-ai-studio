import axios from 'axios';

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

async function testFetchProfile(username) {
  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          ranking
          reputation
        }
        submitStatsGlobal {
          acSubmissionNum {
            count
            difficulty
          }
          totalSubmissionNum {
            count
            difficulty
          }
        }
      }
    }
  `;

  try {
    console.log('Testing fetchProfile with raw response...\n');
    
    const response = await axios.post(
      LEETCODE_GRAPHQL_URL,
      {
        query,
        variables: { username },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://leetcode.com/',
        },
        timeout: 10000,
      }
    );

    console.log('1️⃣  RAW RESPONSE:');
    console.log(JSON.stringify(response.data, null, 2));

    const user = response.data?.data?.matchedUser;
    if (!user) {
      console.log('\n❌ No user data');
      return;
    }

    console.log('\n2️⃣  EXTRACTED DATA:');
    const acStats = user.submitStatsGlobal?.acSubmissionNum || [];
    const totalStats = user.submitStatsGlobal?.totalSubmissionNum || [];
    
    console.log('   AC Stats:', JSON.stringify(acStats, null, 2));
    console.log('   Total Stats:', JSON.stringify(totalStats, null, 2));

    const totalSolved = acStats.find((s) => s.difficulty === 'All')?.count;
    const totalAttempts = totalStats.find((s) => s.difficulty === 'All')?.count;
    
    console.log('\n3️⃣  CALCULATED VALUES:');
    console.log(`   totalSolved: ${totalSolved} (from acStats 'All')`);
    console.log(`   totalAttempts: ${totalAttempts} (from totalStats 'All')`);

    const acceptanceRate = totalAttempts > 0 
      ? Math.round((totalSolved / totalAttempts) * 100) 
      : 0;

    console.log(`   acceptanceRate: ${acceptanceRate}%`);

    const profile = {
      username: user.username,
      totalSolved,
      acceptanceRate,
      ranking: user.profile?.ranking || 0,
      badges: [],
    };

    console.log('\n4️⃣  FINAL PROFILE OBJECT:');
    console.log(JSON.stringify(profile, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFetchProfile('shreyashshinde3011');
