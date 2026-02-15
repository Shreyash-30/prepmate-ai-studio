const axios = require('axios');

const testSubmissions = async () => {
  try {
    console.log('Testing recentSubmissionList with username...');
    
    const query = `
      {
        recentSubmissionList(username: "shahul_hasan", limit: 100) {
          id
          title
          titleSlug
          status
          lang
          timestamp
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
    console.log('\nFull Response:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
};

testSubmissions();
