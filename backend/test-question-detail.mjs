import axios from 'axios';
import mongoose from 'mongoose';

const LEETCODE_GRAPHQL = 'https://leetcode.com/graphql';

const getQuestionDetailQuery = `
query getQuestionDetail($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionId
    difficulty
    topicTags {
      name
      slug
    }
  }
}
`;

(async () => {
  try {
    // Connect to DB to get some problem slugs
    await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');
    
    const submissions = await mongoose.connection
      .collection('externalplatformsubmissions')
      .find({})
      .limit(3)
      .toArray();

    console.log('🔍 Testing getQuestionDetail Query\n');
    console.log('='.repeat(80));

    for (const submission of submissions) {
      const titleSlug = submission.problemId;
      console.log(`\n📌 Querying: ${submission.problemTitle}`);
      console.log(`   Slug: ${titleSlug}`);
      console.log('-'.repeat(80));

      try {
        const response = await axios.post(LEETCODE_GRAPHQL, {
          query: getQuestionDetailQuery,
          variables: { titleSlug }
        }, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (response.data.errors) {
          console.log('❌ GraphQL Error:', JSON.stringify(response.data.errors, null, 2));
        } else if (response.data.data?.question) {
          console.log('✅ Success:');
          console.log(JSON.stringify(response.data.data.question, null, 2));
        } else {
          console.log('⚠️ No data returned');
          console.log(JSON.stringify(response.data, null, 2));
        }
      } catch (error) {
        console.log('❌ Request Error:', error.message);
        if (error.response?.data) {
          console.log(JSON.stringify(error.response.data, null, 2));
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
