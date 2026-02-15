const axios = require('axios');

const testSubmissions = async () => {
  try {
    console.log('Testing LeetCode submission fetch...');
    
    const query = `
      query recentAcSubmissions($username: String!, $limit: Int!) {
        recentAcSubmissionList(username: $username, limit: $limit) {
          id
          title
          titleSlug
          status
          lang
          timestamp
        }
      }
    `;

    const variables = {
      username: 'shahul_hasan',
      limit: 100
    };

    const response = await axios.post(
      'https://leetcode.com/graphql',
      { query, variables },
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
    
    if (response.data.data && response.data.data.recentAcSubmissionList) {
      const submissions = response.data.data.recentAcSubmissionList;
      console.log(`\n✓ Got ${submissions.length} submissions`);
      
      if (submissions.length > 0) {
        console.log('\nFirst submission:');
        console.log(JSON.stringify(submissions[0], null, 2));
      }
    } else {
      console.log('\n✗ No submissions in response');
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
};

testSubmissions();
