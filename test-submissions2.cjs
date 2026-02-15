const axios = require('axios');

const testSubmissions = async () => {
  try {
    console.log('Testing LeetCode submission fetch with correct query...');
    
    // Try using submissionList query instead
    const query = `
      query submissionList($username: String!, $limit: Int!, $offset: Int!) {
        submissionList(username: $username, limit: $limit, offset: $offset) {
          submissions {
            id
            title
            titleSlug
            status
            lang
            timestamp
          }
          hasNext
          total
        }
      }
    `;

    const variables = {
      username: 'shahul_hasan',
      limit: 100,
      offset: 0
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
    
    if (response.data.data && response.data.data.submissionList) {
      const data = response.data.data.submissionList;
      console.log(`\n✓ Got ${data.submissions?.length || 0} submissions, total: ${data.total}`);
      
      if (data.submissions && data.submissions.length > 0) {
        console.log('\nFirst submission:');
        console.log(JSON.stringify(data.submissions[0], null, 2));
        
        // Filter for accepted submissions only
        const acceptedCount = data.submissions.filter(s => s.status === 'Accepted').length;
        console.log(`\nAccepted submissions in this batch: ${acceptedCount}`);
      }
    } else {
      console.log('\n✗ No submissions in response');
      if (response.data.errors) {
        console.log('GraphQL Errors:', response.data.errors);
      }
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
