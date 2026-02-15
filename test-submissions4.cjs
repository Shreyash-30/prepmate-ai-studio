const axios = require('axios');

const testSubmissions = async () => {
  try {
    console.log('Testing userProgressSubmissionList...');
    
    const query = `
      query userProgressSubmissionList($userSlug: String!, $limit: Int!) {
        userProgressSubmissionList(userSlug: $userSlug, limit: $limit) {
          edges {
            node {
              id
              status
              lastBatched
              question {
                questionId
                title
                titleSlug
                difficulty
                acRate
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const variables = {
      userSlug: 'shahul_hasan',
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
    
    if (response.data.data && response.data.data.userProgressSubmissionList) {
      const edges = response.data.data.userProgressSubmissionList.edges || [];
      console.log(`\n✓ Got ${edges.length} submissions`);
      
      if (edges.length > 0) {
        console.log('\nFirst submission:');
        console.log(JSON.stringify(edges[0], null, 2));
        
        // Count accepted
        const accepted = edges.filter(e => e.node.status === 'ac').length;
        console.log(`\nAccepted submissions: ${accepted}`);
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
