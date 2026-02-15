const axios = require('axios');

const testBothMethods = async () => {
  console.log('Testing two methods of sending GraphQL query:\n');

  try {
    // Method 1: With variables (what the service uses)
    console.log('1. Using GraphQL variables:');
    const query1 = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          submitStatsGlobal {
            acSubmissionNum {
              count
              difficulty
            }
          }
        }
      }
    `;

    const response1 = await axios.post(
      'https://leetcode.com/graphql',
      {
        query: query1,
        variables: { username: 'shreyashshinde3011' },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (PrepMate-AI-Studio)',
          'Referer': 'https://leetcode.com/',
        },
        timeout: 10000,
      }
    );

    if (response1.data?.errors) {
      console.log('   ❌ Error:', response1.data.errors[0]?.message);
    } else {
      const count = response1.data?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum?.[0]?.count;
      console.log(`   ✅ totalSolved: ${count}`);
    }

  } catch (error) {
    console.error('   ❌ Request failed:', error.message);
  }

  try {
    // Method 2: Without variables (hardcoded)
    console.log('\n2. Using hardcoded username:');
    const query2 = `
      {
        matchedUser(username: "shreyashshinde3011") {
          username
          submitStatsGlobal {
            acSubmissionNum {
              count
              difficulty
            }
          }
        }
      }
    `;

    const response2 = await axios.post(
      'https://leetcode.com/graphql',
      { query: query2 },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (PrepMate-AI-Studio)',
          'Referer': 'https://leetcode.com/',
        },
        timeout: 10000,
      }
    );

    if (response2.data?.errors) {
      console.log('   ❌ Error:', response2.data.errors[0]?.message);
    } else {
      const count = response2.data?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum?.[0]?.count;
      console.log(`   ✅ totalSolved: ${count}`);
    }

  } catch (error) {
    console.error('   ❌ Request failed:', error.message);
  }
};

testBothMethods();
