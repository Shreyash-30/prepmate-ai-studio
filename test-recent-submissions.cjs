const axios = require('axios');

const testSubmissionQuery = async () => {
  const query = `
    query recentAcSubmissions($username: String!) {
      recentAcSubmissionList(username: $username) {
        id
        title
        titleSlug
        timestamp
      }
    }
  `;

  try {
    console.log('Testing recentAcSubmissionList query for shreyashshinde3011...\n');
    
    const response = await axios.post(
      'https://leetcode.com/graphql',
      {
        query,
        variables: { username: 'shreyashshinde3011' }
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
      console.log('❌ GraphQL Error:', response.data.errors[0]?.message);
    } else {
      const submissions = response.data?.data?.recentAcSubmissionList || [];
      console.log(`✅ Success! Got ${submissions.length} submissions`);
      if (submissions.length > 0) {
        console.log('\nFirst 5 submissions:');
        submissions.slice(0, 5).forEach((sub, i) => {
          console.log(`  ${i+1}. ${sub.title} (${sub.id})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Request Error:', error.message);
  }
};

testSubmissionQuery();
