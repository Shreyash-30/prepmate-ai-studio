import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const API_BASE = 'http://localhost:8000/api';
const AI_SERVICE = 'http://localhost:8001/ai';

let authToken = null;
let userId = null;

console.log('🧪 Testing User Profile & Mastery Score Transfer to LLM\n');
console.log('=' .repeat(70));

// Step 1: Login
async function loginUser() {
  console.log('\n📝 Step 1: Logging in as jay@gmail.com...');
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'jay@gmail.com',
      password: '123456',
    });

    authToken = response.data.token;
    userId = response.data.user.id;  // Using 'id' not '_id'
    
    console.log('✅ Login successful');
    console.log(`   Token: ${authToken.substring(0, 20)}...`);
    console.log(`   User ID: ${userId}`);
    console.log(`   User Email: ${response.data.user.email}`);
    console.log(`   User Name: ${response.data.user.name}`);
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Step 2: Get user profile and mastery data
async function getUserProfile() {
  console.log('\n📊 Step 2: Fetching user profile & mastery data...');
  try {
    const response = await axios.get(`${API_BASE}/users/${userId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const user = response.data;
    console.log('✅ User profile retrieved');
    console.log(`   Overall Mastery: ${user.overallMastery || 0}%`);
    
    if (user.topicMastery && Object.keys(user.topicMastery).length > 0) {
      console.log('   Topic Mastery Scores:');
      Object.entries(user.topicMastery).forEach(([topic, score]) => {
        console.log(`     • ${topic}: ${score}%`);
      });
    }

    return user;
  } catch (error) {
    console.error('❌ Failed to fetch user profile:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Step 3: Get topic progression to build learner profile
async function getTopicProgression() {
  console.log('\n📈 Step 3: Fetching topic progression data...');
  try {
    const response = await axios.get(`${API_BASE}/users/${userId}/progression`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    console.log('✅ Topic progression retrieved');
    console.log(`   Total topics: ${response.data.topics ? response.data.topics.length : 0}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch progression:', error.response?.data || error.message);
    return null;
  }
}

// Step 4: Request questions from practice endpoint and intercept the profile sent
async function generateQuestions(topicId) {
  console.log(`\n🤖 Step 4: Requesting questions for topic: ${topicId}...`);
  try {
    const response = await axios.post(
      `${API_BASE}/practice/topics/${topicId}/generate-questions?limit=5`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    console.log('✅ Questions generated');
    console.log(`   Success: ${response.data.data.success}`);
    console.log(`   Source: ${response.data.data.source || 'unknown'}`);
    console.log(`   Question Count: ${response.data.data.questions?.length || 0}`);
    
    if (response.data.data.questions && response.data.data.questions.length > 0) {
      console.log('   Questions:');
      response.data.data.questions.forEach((q, idx) => {
        console.log(`     ${idx + 1}. ${q.problemTitle}`);
        console.log(`        Difficulty: ${q.difficulty || 'N/A'}`);
        console.log(`        Mastery Required: ${q.masteryRequired || 'N/A'}%`);
      });
    }

    return response.data.data;
  } catch (error) {
    console.error('❌ Question generation failed:', error.response?.data || error.message);
    return null;
  }
}

// Step 5: Directly call the llmQuestionGenerationService to see the profile
async function testServiceDirectly() {
  console.log('\n🔍 Step 5: Testing llmQuestionGenerationService directly...\n');
  
  try {
    // Import and test the service
    const response = await axios.get(`${API_BASE}/debug/user-profile/${userId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    console.log('✅ User learner profile for LLM:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('⚠️  Debug endpoint not available, will analyze response structure instead');
  }
}

// Step 6: Check AI Service directly with a sample profile
async function testAIServiceDirectly() {
  console.log('\n🧠 Step 6: Testing AI Service response with user profile...');
  
  try {
    const sampleProfile = {
      userId: userId,
      name: 'jay',
      email: 'jay@gmail.com',
      overallMastery: 50,
      topicMastery: {
        'Arrays & Hashing': 50,
      },
      recentAttempts: [],
      learningPreferences: {},
    };

    console.log('📤 Sending profile to AI Service:');
    console.log(JSON.stringify(sampleProfile, null, 2));

    const response = await axios.post(
      `${AI_SERVICE}/practice/generate-questions`,
      {
        learnerProfile: sampleProfile,
        limit: 5,
      },
      { timeout: 30000 }
    );

    console.log('\n✅ AI Service Response:');
    console.log(`   Success: ${response.data.success}`);
    console.log(`   Source: ${response.data.source}`);
    console.log(`   Questions Count: ${response.data.questions?.length || 0}`);
    
    if (response.data.questions && response.data.questions.length > 0) {
      console.log('   Questions Generated:');
      response.data.questions.forEach((q, idx) => {
        console.log(`     ${idx + 1}. ${q.problemTitle}`);
        console.log(`        Difficulty: ${q.difficulty}`);
        console.log(`        Mastery Range: ${q.masteryMin}% - ${q.masteryMax}%`);
        console.log(`        Why Recommended: ${q.whyRecommended}`);
      });
    }
  } catch (error) {
    console.error('❌ AI Service test failed:', error.response?.data || error.message);
  }
}

// Step 7: Test with 80+ mastery
async function testHighMastery() {
  console.log('\n\n' + '='.repeat(70));
  console.log('🔬 Testing with higher mastery score (80+)...\n');
  
  try {
    const highMasteryProfile = {
      userId: userId,
      name: 'jay',
      email: 'jay@gmail.com',
      overallMastery: 85,
      topicMastery: {
        'Arrays & Hashing': 85,
      },
      recentAttempts: [
        { questionId: 'q1', correct: true, difficulty: 'Hard' },
        { questionId: 'q2', correct: true, difficulty: 'Hard' },
      ],
      learningPreferences: {},
    };

    console.log('📤 Sending 85% mastery profile to AI Service:');
    console.log(JSON.stringify(highMasteryProfile, null, 2));

    const response = await axios.post(
      `${AI_SERVICE}/practice/generate-questions`,
      {
        learnerProfile: highMasteryProfile,
        limit: 5,
      },
      { timeout: 30000 }
    );

    console.log('\n✅ AI Service Response for 85% mastery:');
    console.log(`   Success: ${response.data.success}`);
    console.log(`   Source: ${response.data.source}`);
    console.log(`   Questions Count: ${response.data.questions?.length || 0}`);
    
    if (response.data.questions && response.data.questions.length > 0) {
      console.log('   Hard Questions Generated:');
      response.data.questions.forEach((q, idx) => {
        console.log(`     ${idx + 1}. ${q.problemTitle}`);
        console.log(`        Difficulty: ${q.difficulty}`);
        console.log(`        Mastery Range: ${q.masteryMin}% - ${q.masteryMax}%`);
      });
    }
  } catch (error) {
    console.error('❌ High mastery test failed:', error.response?.data || error.message);
  }
}

// Main test run
async function main() {
  try {
    await loginUser();
    const userProfile = await getUserProfile();
    await getTopicProgression();
    
    // Try to get questions for Arrays & Hashing if available
    const firstTopic = 'Arrays & Hashing';
    const topicId = firstTopic.toLowerCase().replace(/\s+/g, '-');
    const questions = await generateQuestions(topicId);
    
    await testServiceDirectly();
    await testAIServiceDirectly();
    await testHighMastery();

    console.log('\n' + '='.repeat(70));
    console.log('✅ Test completed!\n');
    console.log('ANALYSIS:');
    console.log('--------');
    console.log('1. Check if user mastery score is correctly fetched from database');
    console.log('2. Verify questions difficulty matches user mastery level');
    console.log('3. Compare 50% vs 85% mastery to see difficulty progression');
    console.log('4. If easy questions shown at 50%, verify LLM is receiving correct profile');
    
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
