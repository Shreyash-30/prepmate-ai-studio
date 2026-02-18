import axios from 'axios';
import mongoose from 'mongoose';
import User from './backend/src/models/User.js';
import UserTopicProgression from './backend/src/models/UserTopicProgression.js';
import Topic from './backend/src/models/Topic.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepmate';

async function testMasteryProfile() {
  try {
    console.log('\n🔍 TESTING MASTERY PROFILE BEING SENT TO LLM\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find user jay@gmail.com
    const user = await User.findOne({ email: 'jay@gmail.com' });
    if (!user) {
      console.log('❌ User jay@gmail.com not found');
      process.exit(1);
    }
    console.log(`✅ Found user: ${user.email} (${user.fullName})`);

    // Get their topic progression for a topic (let's use "algorithms-fundamentals")
    const topics = await Topic.find({}).limit(3);
    console.log(`\n📚 Found ${topics.length} topics`);

    for (const topic of topics) {
      const progression = await UserTopicProgression.findOne({
        userId: user._id,
        topicId: topic.topicId,
      });

      if (progression) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`📌 TOPIC: ${topic.name}`);
        console.log(`${'='.repeat(80)}`);
        console.log(`  Mastery Score: ${progression.masteryScore}`);
        console.log(`  Current Difficulty Level: ${progression.currentDifficultyLevel}`);
        console.log(`  Progression Readiness: ${progression.progressionReadinessScore}`);
        console.log(`  Accuracy Rate: ${progression.accuracyRate}%`);
        console.log(`  Total Attempts: ${progression.progressionStats?.totalAttempts || 0}`);
        console.log(`  Successful Attempts: ${progression.progressionStats?.successfulAttempts || 0}`);

        // Check what SHOULD be recommended based on mastery
        const recommendedByMastery = this.calculateRecommendedDifficulty(
          progression.masteryScore
        );
        console.log(`\n  ⚠️  PROBLEM DETECTED:`);
        console.log(`     - Mastery Score: ${progression.masteryScore}`);
        console.log(`     - Should recommend: ${recommendedByMastery}`);
        console.log(`     - Currently recommending: ${progression.currentDifficultyLevel}`);
        if (recommendedByMastery !== progression.currentDifficultyLevel) {
          console.log(`     - ❌ MISMATCH! Algorithm not respecting mastery score`);
        }

        // Test actual API call
        console.log(`\n  🧪 Testing API call for question generation...`);
        try {
          const response = await axios.post(
            'http://localhost:8000/api/practice/topics/test/generate-questions',
            { topicId: topic.topicId, limit: 1 },
            {
              headers: {
                Authorization: `Bearer ${await getAuthToken(user.email, '123456')}`,
              },
            }
          );

          if (response.data.success && response.data.data.questions?.length > 0) {
            const q = response.data.data.questions[0];
            console.log(`     Generated difficulty: ${q.difficulty}`);
            console.log(`     Expected difficulty: ${recommendedByMastery}`);
          }
        } catch (err) {
          console.log(`     ⚠️  API call failed: ${err.message}`);
        }
      }
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function calculateRecommendedDifficulty(masteryScore) {
  if (masteryScore >= 80) return 'Hard';
  if (masteryScore >= 50) return 'Medium';
  return 'Easy';
}

async function getAuthToken(email, password) {
  try {
    const response = await axios.post('http://localhost:8000/api/auth/login', {
      email,
      password,
    });
    return response.data.token;
  } catch (err) {
    console.log('⚠️  Could not get auth token:', err.message);
    return null;
  }
}

testMasteryProfile();
