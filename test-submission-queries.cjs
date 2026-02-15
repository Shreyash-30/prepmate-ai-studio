const axios = require('axios');

const testSubmissionsQuery = async () => {
  try {
    console.log('Testing different submission query formats...\n');
    
    // Try different query variations
    const queries = [
      {
        name: 'recentSubmissionList',
        query: `
          {
            matchedUser(username: "shreyashshinde3011") {
              username
              recentSubmissionList(limit: 10) {
                id
                title
                titleSlug
                lang
                timestamp
                statusDisplay
              }
            }
          }
        `
      },
      {
        name: 'acSubmissionList',
        query: `
          {
            matchedUser(username: "shreyashshinde3011") {
              username
              acSubmissionList(limit: 10) {
                id
                title
                titleSlug
                lang
                timestamp
              }
            }
          }
        `
      },
      {
        name: 'Check available fields',
        query: `
          {
            user(username: "shreyashshinde3011") {
              username
              submissionCalendar
            }
          }
        `
      }
    ];

    for (const test of queries) {
      console.log(`\nTrying: ${test.name}...`);
      try {
        const response = await axios.post(
          'https://leetcode.com/graphql',
          { query: test.query },
          {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (PrepMate-AI-Studio)',
              'Referer': 'https://leetcode.com/'
            },
            timeout: 10000
          }
        );

        if (response.data.errors) {
          console.log('❌ Error:', response.data.errors[0]?.message);
        } else {
          console.log('✅ Success! Data:');
          console.log(JSON.stringify(response.data.data, null, 2).substring(0, 500));
        }
      } catch (error) {
        console.log('❌ Request failed:', error.message);
      }
    }

  } catch (error) {
    console.error('Fatal error:', error.message);
  }
};

testSubmissionsQuery();
