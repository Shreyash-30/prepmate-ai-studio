import axios from 'axios';

const API = 'http://localhost:8000/api';
const USER_EMAIL = 'shreyash@gmail.com';
const USER_PASSWORD = '123456';

console.log('🧪 Testing Complete Practice Flow\n');
console.log('=====================================\n');

try {
  // Step 1: Login
  console.log('📝 STEP 1: Login');
  console.log(`   Email: ${USER_EMAIL}`);
  const loginRes = await axios.post(`${API}/auth/login`, {
    email: USER_EMAIL,
    password: USER_PASSWORD,
  });

  const token = loginRes.data.token;
  const userId = loginRes.data.user._id;
  console.log(`   ✅ Login successful`);
  console.log(`   Token: ${token.substring(0, 30)}...`);
  console.log(`   User ID: ${userId}\n`);

  const headers = { Authorization: `Bearer ${token}` };

  // Step 2: Get all topics/recommendations (Subject View)
  console.log('📚 STEP 2: Get All Topics (Subject Selection View)');
  const topicsRes = await axios.get(`${API}/practice/recommendations`, { headers });
  const topics = topicsRes.data.data;
  console.log(`   ✅ Fetched ${topics.length} topics from database\n`);
  
  console.log('   Topics with Mastery Scores:\n');
  topics.forEach((topic, idx) => {
    if (idx < 5) {
      console.log(`   [${idx + 1}] ${topic.topic?.name || topic.topicId}`);
      console.log(`       • Mastery: ${Math.round(topic.masteryScore * 100)}%`);
      console.log(`       • Readiness: ${Math.round(topic.progressionReadinessScore * 100)}%`);
      console.log(`       • Difficulty: ${topic.currentDifficultyLevel}`);
      console.log(`       • Questions: ${topic.topic?.questionCount || 0}`);
      console.log(`       • Status: ${topic.progressionReadinessScore >= 0.7 ? 'Ready' : topic.progressionReadinessScore >= 0.4 ? 'Practicing' : 'Learning'}`);
      console.log();
    }
  });

  if (topics.length > 5) {
    console.log(`   ... and ${topics.length - 5} more topics\n`);
  }

  // Step 3: Get specific topic details (Topic Detail View)
  console.log('📖 STEP 3: Get Topic-Specific Data (Click on Topics)');
  const selectedTopic = topics[0];
  console.log(`   Selected Topic: ${selectedTopic.topic?.name || selectedTopic.topicId}\n`);

  const topicDetailRes = await axios.get(
    `${API}/practice/topics/${selectedTopic.topicId}/recommendations`,
    { headers }
  );
  const topicDetail = topicDetailRes.data.data;

  console.log(`   ✅ Topic Detail Fetched:\n`);
  console.log(`       • Topic Name: ${topicDetail.topic?.name || 'N/A'}`);
  console.log(`       • Description: ${topicDetail.topic?.description || 'N/A'}`);
  console.log(`       • Mastery Score: ${Math.round(topicDetail.masteryScore * 100)}%`);
  console.log(`       • Readiness Score: ${Math.round(topicDetail.readinessScore * 100)}%`);
  console.log(`       • Current Difficulty: ${topicDetail.currentDifficultyLevel}`);
  console.log(`       • Total Attempts: ${topicDetail.progressionStats?.totalAttempts || 0}`);
  console.log(`       • Success Rate: ${Math.round((topicDetail.progressionStats?.successRate || 0) * 100)}%`);
  console.log(`       • Average Solve Time: ${Math.round((topicDetail.progressionStats?.averageSolveTime || 0) / 1000)}s`);
  console.log(`\n   Recommended Questions: ${topicDetail.recommendedQuestions?.length || 0} problems`);
  
  if (topicDetail.recommendedQuestions && topicDetail.recommendedQuestions.length > 0) {
    console.log(`\n   Sample Questions:\n`);
    topicDetail.recommendedQuestions.slice(0, 3).forEach((q, idx) => {
      console.log(`   [${idx + 1}] ${q.title || q.titleSlug}`);
      console.log(`       Difficulty: ${q.difficulty}`);
      console.log(`       URL: ${q.sourceUrl}`);
    });
  }

  console.log('\n\n=====================================');
  console.log('✅ COMPLETE FLOW TEST PASSED!\n');
  console.log('Summary:');
  console.log(`• User logged in: ${USER_EMAIL}`);
  console.log(`• Topics fetched: ${topics.length}`);
  console.log(`• Topic detail fetched: ${selectedTopic.topic?.name}`);
  console.log(`• Questions fetched: ${topicDetail.recommendedQuestions?.length || 0}`);
  console.log(`• All data from database: ✅\n`);

  process.exit(0);
} catch (error) {
  console.error('\n❌ ERROR:', error.response?.data?.message || error.message);
  if (error.response?.data?.error) {
    console.error('Details:', error.response.data.error);
  }
  process.exit(1);
}
