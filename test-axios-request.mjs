/**
 * Detailed test of what the backend axis sends vs what we expect
 */

import axios from 'axios';

async function diagnoseAxiosRequest() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 DIAGNOSING AXIOS REQUEST STRUCTURE');
  console.log('='.repeat(80));

  const learnerProfile = {
    userId: "user-123",
    userName: "Shreyash",
    learningLevel: "intermediate",
    targetCompanies: "Google, Meta, Amazon",
    preparationGoal: "practice",
    topicId: "Arrays & Hashing",
    topicDescription: "Working with arrays and hash-based data structures",
    masteryScore: 45,
    progressionReadinessScore: 60,
    retentionProbability: 0.75,
    currentDifficultyLevel: "Easy",
    totalAttempts: 10,
    successfulAttempts: 6,
    weakSubtopics: "Sliding window, Two pointers",
    recentMistakePatterns: "Off-by-one errors, incorrect loop bounds",
    recommendedDifficulty: "Easy",
    desiredQuestionCount: 5,
  };

  const requestBody = {
    learnerProfile: learnerProfile,
    limit: 5,
  };

  console.log(`\n📦 Request body structure:`);
  console.log(`   Type: ${typeof requestBody}`);
  console.log(`   Keys: ${Object.keys(requestBody).join(', ')}`);
  console.log(`   learnerProfile type: ${typeof requestBody.learnerProfile}`);
  console.log(`   learnerProfile keys: ${Object.keys(requestBody.learnerProfile).join(', ')}`);

  try {
    console.log(`\n🔄 Sending axios POST request...`);
    
    // Create a custom instance to log the actual request
    const instance = axios.create();
    
    // Log request interceptor
    instance.interceptors.request.use(request => {
      console.log(`\n📤 AXIOS REQUEST SENT:`);
      console.log(`   URL: ${request.url}`);
      console.log(`   Method: ${request.method}`);
      console.log(`   Headers: ${JSON.stringify(request.headers, null, 2)}`);
      console.log(`   Data type: ${typeof request.data}`);
      console.log(`   Data: ${JSON.stringify(request.data, null, 2).substring(0, 500)}`);
      return request;
    });

    // Log response interceptor
    instance.interceptors.response.use(response => {
      console.log(`\n📥 AXIOS RESPONSE RECEIVED:`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Data type: ${typeof response.data}`);
      console.log(`   Data keys: ${Object.keys(response.data).join(', ')}`);
      console.log(`   Data.success: ${response.data.success}`);
      console.log(`   Data.questions length: ${response.data.questions?.length || 0}`);
      return response;
    });

    const response = await instance.post(
      'http://localhost:8001/ai/practice/generate-questions',
      requestBody,
      { timeout: 30000 }
    );

    console.log(`\n✅ SUCCESS!`);
    console.log(`   Response success field value: ${response.data.success}`);
    console.log(`   Response success field type: ${typeof response.data.success}`);
    console.log(`   Response questions: ${response.data.questions?.length || 0}`);

  } catch (error) {
    console.error(`\n❌ ERROR:`);
    console.error(`   Message: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Response data:`, error.response.data);
    }
  }
}

diagnoseAxiosRequest();
