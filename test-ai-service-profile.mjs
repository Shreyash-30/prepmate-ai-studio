/**
 * Test the AI service with the exact learner profile structure that backend sends
 * This will tell us if the AI service is rejecting the profile or if there's another issue
 */

import axios from 'axios';

async function testAIServiceDirectly() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING AI SERVICE WITH BACKEND PROFILE STRUCTURE');
  console.log('='.repeat(80));

  try {
    // This is the learner profile structure that the backend creates
    const learnerProfile = {
      userId: '123456789',
      userName: 'Test User',
      learningLevel: 'intermediate',
      targetCompanies: 'Google, Meta, Amazon',
      preparationGoal: 'practice',
      topicId: 'arrays',  // The actual topic ID from MongoDB
      topicDescription: 'Arrays are fundamental data structures...',
      masteryScore: 45,
      progressionReadinessScore: 60,
      retentionProbability: 0.75,
      currentDifficultyLevel: 'Easy',
      totalAttempts: 10,
      successfulAttempts: 6,
      weakSubtopics: 'Sliding window, Two pointers',
      recentMistakePatterns: 'Off-by-one errors, incorrect loop bounds',
      recommendedDifficulty: 'Easy',
      desiredQuestionCount: 5,
    };

    console.log('\n📤 SENDING REQUEST TO AI SERVICE');
    console.log(`   Endpoint: POST http://localhost:8001/ai/practice/generate-questions`);
    console.log(`   Topic: ${learnerProfile.topicId}`);
    console.log(`   Limit: 5`);
    console.log(`\n📦 LEARNER PROFILE BEING SENT:`);
    console.log(JSON.stringify(learnerProfile, null, 2));

    const response = await axios.post(
      'http://localhost:8001/ai/practice/generate-questions',
      {
        learnerProfile: learnerProfile,
        limit: 5,
      },
      { timeout: 30000 }
    );

    console.log('\n✅ response RECEIVED FROM AI SERVICE');
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${response.data.success}`);
    console.log(`   Questions: ${response.data.questions?.length || 0}`);
    console.log(`   Source: ${response.data.source}`);
    console.log(`   Message: ${response.data.message || 'N/A'}`);
    console.log(`   Error: ${response.data.error || 'N/A'}`);

    console.log('\n📋 FULL RESPONSE:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success && response.data.questions?.length > 0) {
      console.log('\n✅ SUCCESS! Questions generated:');
      response.data.questions.slice(0, 3).forEach((q, i) => {
        console.log(`   ${i + 1}. ${q.problemTitle} (${q.difficulty})`);
      });
    } else {
      console.log('\n❌ FAILURE! No questions generated');
      console.log(`   Response struct:`, Object.keys(response.data).join(', '));
      console.log(`   Has questions array: ${!!response.data.questions}`);
      console.log(`   Questions is array: ${Array.isArray(response.data.questions)}`);
      console.log(`   Questions value:`, response.data.questions);
    }

  } catch (error) {
    console.error('\n❌ ERROR');
    console.error(`   Message: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Response:`, error.response.data);
    } else {
      console.error(`   Code: ${error.code}`);
    }
  }
}

testAIServiceDirectly();
