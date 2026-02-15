const axios = require('axios');

const testQueries = async () => {
  console.log('Testing query variations:\n');

  const tests = [
    {
      name: 'Without totalSubmissionNum',
      query: `
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
      `
    },
    {
      name: 'With totalSubmissionNum',
      query: `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
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
      `
    },
    {
      name: 'With profile, badges, totalSubmissionNum',
      query: `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
            profile {
              realName
              userAvatar
              reputation
              ranking
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
            contestBadgeInfo {
              badges {
                name
                shortName
              }
            }
          }
        }
      `
    }
  ];

  for (const test of tests) {
    console.log(`Testing: ${test.name}`);
    try {
      const response = await axios.post(
        'https://leetcode.com/graphql',
        {
          query: test.query,
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

      if (response.data?.errors) {
        console.log(`  ❌ GraphQL Error: ${response.data.errors[0]?.message}`);
      } else {
        const count = response.data?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum?.[0]?.count;
        console.log(`  ✅ Success - totalSolved: ${count}`);
      }
    } catch (error) {
      console.log(`  ❌ Request Error: ${error.message}`);
    }
  }
};

testQueries();
