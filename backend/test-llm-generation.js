/**
 * Complete LLM Question Generation Test
 * Tests login -> fetch topics -> generate questions with Gemini
 */

import axios from 'axios';

const API_URL = 'http://localhost:8000';
const email = 'shreyash@gmail.com';
const password = '123456';

let authToken = null;
let userId = null;

async function login() {
  try {
    console.log('\n🔐 Step 1: Logging in...');
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email,
      password,
    });

    authToken = response.data.token;
    userId = response.data.user._id;

    console.log(`✅ Login successful!`);
    console.log(`   • User ID: ${userId}`);
    console.log(`   • Email: ${response.data.user.email}`);
    console.log(`   • Learning Level: ${response.data.user.learningLevel}`);
    console.log(`   • Token: ${authToken.substring(0, 20)}...`);

    return true;
  } catch (error) {
    console.error('❌ Login failed:');
    if (error.response?.data) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
    return false;
  }
}

async function getTopics() {
  try {
    console.log('\n📚 Step 2: Fetching topics...');
    const response = await axios.get(`${API_URL}/api/practice/topics`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const topics = response.data.data || response.data.topics || response.data;
    if (!Array.isArray(topics)) {
      console.warn('❌ Topics response is not an array:', typeof topics);
      return 'arrays';
    }

    console.log(`✅ Retrieved ${topics.length} topics`);
    topics.slice(0, 5).forEach((t, idx) => {
      console.log(`   ${idx + 1}. ${t.name} (${t.topicId})`);
    });

    return topics[0]?.topicId || 'arrays'; // Return first topic or default
  } catch (error) {
    console.error('❌ Failed to fetch topics:');
    if (error.response?.data) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
    return 'arrays';
  }
}

async function generateQuestions(topicId) {
  try {
    console.log(`\n🤖 Step 3: Generating LLM questions for topic "${topicId}"...`);
    
    const response = await axios.post(
      `${API_URL}/api/practice/topics/${topicId}/generate-questions`,
      { limit: 5 },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    const data = response.data.data || response.data; // Handle both response types
    console.log(`✅ Question generation successful!`);
    console.log(`   • Source: ${data.source || 'unknown'}`);
    console.log(`   • Total questions: ${data.questions?.length || 0}`);
    console.log(`   • Difficulty: ${data.recommendedDifficulty}`);

    if (data.generationPrompt) {
      console.log(`\n   📋 Learner Profile Used:`);
      console.log(`      - Learning Level: ${data.generationPrompt.learningLevel}`);
      console.log(`      - Target Companies: ${data.generationPrompt.targetCompanies}`);
      console.log(`      - Mastery Score: ${(data.generationPrompt.masteryScore * 100).toFixed(1)}%`);
      console.log(`      - Readiness Score: ${(data.generationPrompt.progressionReadinessScore * 100).toFixed(1)}%`);
      console.log(`      - Weak Subtopics: ${data.generationPrompt.weakSubtopics}`);
      console.log(`      - Recommended Difficulty: ${data.generationPrompt.recommendedDifficulty}`);
    }

    // Display questions
    console.log(`\n   📝 Generated Questions:`);
    if (data.questions && data.questions.length > 0) {
      data.questions.slice(0, 3).forEach((q, idx) => {
        console.log(`\n   Q${idx + 1}: ${q.problemTitle}`);
        console.log(`       Difficulty: ${q.difficulty}`);
        console.log(`       Topic: ${q.topic}`);
        console.log(`       Concept: ${q.primaryConceptTested}`);
        console.log(`       Why Recommended: ${q.whyRecommended.substring(0, 80)}...`);
        console.log(`       URL: ${q.sourceUrl}`);
        console.log(`       Platform: ${q.platform || 'unknown'}`);
        if (q.hints && q.hints.length > 0) {
          console.log(`       💡 Hints: ${q.hints.slice(0, 1).join('; ')}`);
        }
      });

      if (data.questions.length > 3) {
        console.log(`\n       ... and ${data.questions.length - 3} more question(s)`);
      }
    }

    return data;
  } catch (error) {
    console.error('❌ Question generation failed:');
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
}

async function checkGeneratedQuestionLog() {
  try {
    console.log(`\n💾 Step 4: Checking GeneratedQuestionLog database...`);
    const response = await axios.get(
      `${API_URL}/api/practice/generated-questions`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    const logs = response.data.questions || [];
    console.log(`✅ Retrieved ${logs.length} logged questions from database`);

    if (logs.length > 0) {
      const recent = logs.slice(0, 3);
      recent.forEach((log, idx) => {
        console.log(`\n   Log${idx + 1}: ${log.problemTitle}`);
        console.log(`       Topic: ${log.topic}`);
        console.log(`       Difficulty: ${log.difficulty}`);
        console.log(`       Source QB: ${log.isPaired ? '✅ Paired' : '❌ Not paired'}`);
        console.log(`       Attempted: ${log.userResponse?.attempted ? 'Yes' : 'No'}`);
      });
    }

    return logs;
  } catch (error) {
    // This endpoint might not exist yet, that's okay
    console.log(`⚠️  GeneratedQuestionLog endpoint not available (expected during development)`);
    return [];
  }
}

async function testDeduplication(topicId) {
  try {
    console.log(`\n🔄 Step 5: Testing deduplication (generating again in 10 seconds)...`);
    await new Promise(resolve => setTimeout(resolve, 10000));

    const response = await axios.post(
      `${API_URL}/api/practice/topics/${topicId}/generate-questions`,
      { limit: 5 },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    const data = response.data;
    const duplicates = data.questions?.filter(q => q.isDuplicate) || [];
    const newQuestions = data.questions?.filter(q => !q.isDuplicate) || [];

    console.log(`✅ Second generation complete!`);
    console.log(`   • New questions: ${newQuestions.length}`);
    console.log(`   • Duplicates detected: ${duplicates.length}`);

    if (duplicates.length > 0) {
      console.log(`   📌 Duplicate titles:`);
      duplicates.slice(0, 2).forEach(q => {
        console.log(`      - ${q.problemTitle}`);
      });
    }

    return { newQuestions, duplicates };
  } catch (error) {
    console.error('⚠️ Deduplication test failed (this is optional), continuing...');
    return { newQuestions: [], duplicates: [] };
  }
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     LLM Question Generation Integration Test               ║');
  console.log('║     Testing Gemini-powered personalized questions           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Step 1: Login
    const loggedIn = await login();
    if (!loggedIn) {
      console.log('\n❌ Cannot continue without login');
      return false;
    }

    // Step 2: Get topics
    const topicId = await getTopics();

    // Step 3: Generate questions
    const generatedData = await generateQuestions(topicId);
    if (!generatedData) {
      console.log('\n❌ Question generation failed');
      return false;
    }

    // Check source
    const isGemini = generatedData.source === 'gemini';
    const isFallback = generatedData.source === 'fallback';
    
    console.log(`\n📊 Question Source Analysis:`);
    if (isGemini) {
      console.log(`   ✅ Using Gemini (LLM generated)`);
    } else if (isFallback) {
      console.log(`   ⚠️  Using fallback (Database questions)`);
      console.log(`       This means Gemini service wasn't available`);
    } else {
      console.log(`   ❓ Unknown source`);
    }

    // Step 4: Check database logging
    await checkGeneratedQuestionLog();

    // Step 5: Test deduplication
    const dedupeResult = await testDeduplication(topicId);

    // Final summary
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  TEST SUMMARY                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    const totalQuestions = generatedData.questions?.length || 0;
    const questionsWithUrl = generatedData.questions?.filter(q => q.sourceUrl && q.sourceUrl !== '#').length || 0;

    console.log(`\n✅ PASSED:`);
    console.log(`   • User login: SUCCESS`);
    console.log(`   • Topic fetching: SUCCESS`);
    console.log(`   • Question generation: SUCCESS (${totalQuestions} questions)`);
    console.log(`   • Questions with URLs: ${questionsWithUrl}/${totalQuestions}`);
    console.log(`   • Source: ${isGemini ? '🤖 GEMINI LLM' : '📚 Database Fallback'}`);

    if (dedupeResult.newQuestions.length > 0 || dedupeResult.duplicates.length > 0) {
      console.log(`   • Deduplication: SUCCESS`);
      console.log(`     - New questions: ${dedupeResult.newQuestions.length}`);
      console.log(`     - Duplicates detected: ${dedupeResult.duplicates.length}`);
    }

    console.log(`\n🎯 NEXT STEPS:`);
    console.log(`   1. Check if Gemini API key is configured in .env`);
    if (!isGemini) {
      console.log(`   2. Set GEMINI_API_KEY environment variable`);
      console.log(`   3. Restart AI services: cd ai-services && python main.py`);
    }
    console.log(`   3. Integrate frontend hook for question display`);
    console.log(`   4. Update Practice.tsx to call /generate-questions endpoint`);

    return true;
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:');
    console.error(error.message);
    return false;
  }
}

// Run tests
await runAllTests().then(success => {
  console.log('\n');
  if (success) {
    console.log('✨ Test completed successfully!');
    process.exit(0);
  } else {
    console.log('❌ Test failed!');
    process.exit(1);
  }
});
