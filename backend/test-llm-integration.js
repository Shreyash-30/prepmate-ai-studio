/**
 * Test LLM Question Generation Integration
 * Tests the complete flow from backend to Gemini and back with deduplication
 */

import axios from 'axios';

const API_URL = 'http://localhost:8000';
const userId = '6771f4d1234567890abcdef0'; // Replace with actual user ID

async function testQuestionGeneration() {
  try {
    console.log('🧪 Testing LLM Question Generation Integration\n');

    // Test 1: Generate questions for topic
    console.log('📝 Test 1: Generating personalized questions...');
    const generateResponse = await axios.post(
      `${API_URL}/api/practice/topics/arrays/generate-questions`,
      { limit: 5 },
      {
        headers: {
          'Authorization': `Bearer YOUR_JWT_TOKEN`,
        }
      }
    );

    console.log('✅ Question Generation Response:');
    console.log(JSON.stringify(generateResponse.data, null, 2));

    if (generateResponse.data.questions && generateResponse.data.questions.length > 0) {
      console.log(`\n📊 Generated ${generateResponse.data.questions.length} questions`);
      
      // Display question details
      generateResponse.data.questions.forEach((q, idx) => {
        console.log(`\n  Q${idx + 1}: ${q.problemTitle}`);
        console.log(`    • Topic: ${q.topic}`);
        console.log(`    • Difficulty: ${q.difficulty}`);
        console.log(`    • Why: ${q.whyRecommended}`);
        console.log(`    • URL: ${q.sourceUrl}`);
      });
    }

    // Test 2: Call again to test deduplication
    console.log('\n\n🔄 Test 2: Testing deduplication (generating again)...');
    const dedupeResponse = await axios.post(
      `${API_URL}/api/practice/topics/arrays/generate-questions`,
      { limit: 5 },
      {
        headers: {
          'Authorization': `Bearer YOUR_JWT_TOKEN`,
        }
      }
    );

    const duplicates = dedupeResponse.data.questions.filter(q => q.isDuplicate);
    const newQuestions = dedupeResponse.data.questions.filter(q => !q.isDuplicate);

    console.log(`✅ Second generation results:`);
    console.log(`   • New unique questions: ${newQuestions.length}`);
    console.log(`   • Duplicates detected: ${duplicates.length}`);

    return true;
  } catch (error) {
    console.error('❌ Error testing question generation:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    return false;
  }
}

// Run tests
await testQuestionGeneration().then(success => {
  if (success) {
    console.log('\n\n✨ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n\n❌ Tests failed!');
    process.exit(1);
  }
});
