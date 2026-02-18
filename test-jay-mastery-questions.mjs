import axios from 'axios';

async function testQuestionsForHighMastery() {
  try {
    console.log('\n🔍 TESTING QUESTION GENERATION FOR HIGH MASTERY USER\n');

    // First, login to get token
    console.log('1️⃣  Logging in as jay@gmail.com...');
    const loginResponse = await axios.post('http://localhost:8000/api/auth/login', {
      email: 'jay@gmail.com',
      password: '123456',
    });

    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');

    // List of common topics to test
    const topicIds = [
      'arrays-hashing',
      'two-pointers',
      'sliding-window',
      'stack-queue',
      'binary-search',
    ];

    for (const topicId of topicIds) {
      try {
        console.log(`\n📍 Testing topic: ${topicId}`);
        
        // Get progression for this topic
        const progResponse = await axios.get(
          `http://localhost:8000/api/practice/topics/${topicId}/progression`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const progData = progResponse.data.data || progResponse.data;
        console.log(`   Mastery Score: ${progData.masteryScore || 0}`);
        console.log(`   Current Difficulty: ${progData.currentDifficultyLevel || 'Easy'}`);
        console.log(`   Accuracy Rate: ${progData.accuracyRate || 0}%`);
        
        if (!progData.masteryScore || progData.masteryScore < 50) {
          console.log(`   ⏭️  Skipping (mastery < 50)`);
          continue;
        }

        // Generate questions for this topic
        console.log(`   Generating questions...`);
        const genResponse = await axios.post(
          `http://localhost:8000/api/practice/topics/${topicId}/generate-questions`,
          { limit: 1 },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const result = genResponse.data;
        if (result.success && result.data?.questions?.length > 0) {
          const q = result.data.questions[0];
          console.log(`   ✅ Question Generated:`);
          console.log(`      Title: ${q.problemTitle}`);
          console.log(`      Difficulty: ${q.difficulty}`);
          console.log(`      Source: ${result.data.source}`);
          
          // Check if difficulty matches mastery
          const expected = expectedDifficulty(progData.masteryScore);
          if (q.difficulty !== expected) {
            console.log(`      ❌ ISSUE: Should be ${expected} for ${progData.masteryScore} mastery`);
          } else {
            console.log(`      ✅ Difficulty matches mastery`);
          }
        } else {
          console.log(`   ❌ No questions generated`);
        }
      } catch (err) {
        console.log(`   ⚠️  Error: ${err.response?.data?.message || err.message}`);
      }
    }

    console.log('\n✅ Test completed. Check backend logs for learner profile details.\n');
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

function expectedDifficulty(masteryScore) {
  if (masteryScore >= 80) return 'Hard';
  if (masteryScore >= 50) return 'Medium';
  return 'Easy';
}

testQuestionsForHighMastery();
