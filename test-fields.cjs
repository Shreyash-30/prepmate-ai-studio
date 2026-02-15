const axios = require('axios');

const testFieldsCombinations = async () => {
  console.log('Finding problematic field:\n');

  const configs = [
    {
      name: 'Base + profile fields',
      extra: `
        profile {
          ranking
        }
      `
    },
    {
      name: 'Base + contestBadgeInfo',
      extra: `
        contestBadgeInfo {
          badges {
            name
          }
        }
      `
    },
    {
      name: 'Base + profile.userAvatar',
      extra: `
        profile {
          userAvatar
        }
      `
    },
  ];

  for (const config of configs) {
    console.log(`Testing: ${config.name}`);
    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          submitStatsGlobal {
            acSubmissionNum {
              count
              difficulty
            }
          }
          ${config.extra}
        }
      }
    `;

    try {
      const response = await axios.post(
        'https://leetcode.com/graphql',
        {
          query,
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
        console.log(`  ✅ Success`);
      }
    } catch (error) {
      console.log(`  ❌ Request Error: ${error.response?.status}`);
    }
  }
};

testFieldsCombinations();
