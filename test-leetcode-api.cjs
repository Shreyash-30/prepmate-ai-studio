const axios = require('axios');

const testLeetCodeAPI = async () => {
  try {
    console.log('Testing LeetCode GraphQL API for shahul_hasan...');
    
    const query = `
      {
        matchedUser(username: "shahul_hasan") {
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

    const response = await axios.post(
      'https://leetcode.com/graphql',
      { query },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (PrepMate-AI-Studio)',
          'Referer': 'https://leetcode.com/'
        },
        timeout: 10000
      }
    );

    console.log('API Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
};

testLeetCodeAPI();
