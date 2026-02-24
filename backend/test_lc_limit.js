import axios from 'axios';

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

async function test(username, limit) {
  const submissionsQuery = `
    query recentAcSubmissions($username: String!, $limit: Int) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        id
        title
        titleSlug
        timestamp
      }
    }
  `;

  try {
    const response = await axios.post(
      LEETCODE_GRAPHQL_URL,
      {
        query: submissionsQuery,
        variables: { username, limit },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (PrepMate-AI-Studio)',
          'Referer': 'https://leetcode.com/',
        }
      }
    );
    console.log(response.data.data.recentAcSubmissionList.length);
  } catch (error) {
    console.error(error);
  }
}

test('shreyashshinde3011', 100);
