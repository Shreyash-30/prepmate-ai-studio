const axios = require('axios');

const testLeetCodeAPI = async () => {
  try {
    console.log('Testing LeetCode GraphQL API for shreyashshinde3011...\n');
    
    // First test: Get basic user info
    const profileQuery = `
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

    console.log('1. Fetching profile...');
    const profileResponse = await axios.post(
      'https://leetcode.com/graphql',
      { query: profileQuery },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (PrepMate-AI-Studio)',
          'Referer': 'https://leetcode.com/'
        },
        timeout: 10000
      }
    );

    console.log('Profile Response:', JSON.stringify(profileResponse.data, null, 2));

    // Second test: Get submissions
    const submissionsQuery = `
      {
        matchedUser(username: "shreyashshinde3011") {
          recentAcSubmissionList(limit: 50) {
            id
            title
            titleSlug
            timestamp
          }
        }
      }
    `;

    console.log('\n2. Fetching submissions...');
    const submissionsResponse = await axios.post(
      'https://leetcode.com/graphql',
      { query: submissionsQuery },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (PrepMate-AI-Studio)',
          'Referer': 'https://leetcode.com/'
        },
        timeout: 10000
      }
    );

    console.log('Submissions Response:', JSON.stringify(submissionsResponse.data, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
};

testLeetCodeAPI();
