import axios from 'axios';
import mongoose from 'mongoose';
import User from './backend/src/models/User.js';
import UserTopicProgression from './backend/src/models/UserTopicProgression.js';
import Topic from './backend/src/models/Topic.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepmate';

async function seedAndTest() {
  try {
    console.log('\n🌱 SEEDING TEST DATA FOR HIGH MASTERY USER\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create or find test user
    let user = await User.findOne({ email: 'test-high-mastery@test.com' });
    if (!user) {
      user = await User.create({
        email: 'test-high-mastery@test.com',
        password: 'test123',
        fullName: 'High Mastery Test User',
        learningLevel: 'advanced',
        targetCompaniesArray: ['Google', 'Meta'],
      });
      console.log('✅ Created test user');
    }

    // Create topics if they don't exist
    const topicIds = ['arrays-hashing', 'two-pointers', 'binary-search'];
    for (const topicId of topicIds) {
      const exists = await Topic.findOne({ topicId });
      if (!exists) {
        await Topic.create({
          topicId,
          name: topicId.replace(/-/g, ' ').toUpperCase(),
          description: `Practice ${topicId} problems`,
          isActive: true,
          difficulty: 'Medium',
        });
      }
    }
    console.log('✅ Topics ready');

    // Seed high mastery progression for arrays-hashing
    console.log('\n📊 Creating progressions with varying mastery levels:');

    const progressionData = [
      { topicId: 'arrays-hashing', masteryScore: 85, level: 'Hard' },
      { topicId: 'two-pointers', masteryScore: 68, level: 'Medium' },
      { topicId: 'binary-search', masteryScore: 45, level: 'Easy' },
    ];

    for (const data of progressionData) {
      let progression = await UserTopicProgression.findOne({
        userId: user._id,
        topicId: data.topicId,
      });

      if (!progression) {
        progression = await UserTopicProgression.create({
          userId: user._id,
          topicId: data.topicId,
          masteryScore: data.masteryScore,
          currentDifficultyLevel: data.level,
          progressionReadinessScore: data.masteryScore * 0.8,
          retentionProbability: 0.7,
          accuracyRate: data.masteryScore,
          progressionStats: {
            totalAttempts: 20,
            successfulAttempts: Math.floor((20 * data.masteryScore) / 100),
          },
        });
      } else {
        // Update existing progression
        progression.masteryScore = data.masteryScore;
        progression.currentDifficultyLevel = data.level;
        progression.progressionReadinessScore = data.masteryScore * 0.8;
        await progression.save();
      }
      console.log(`   ✅ ${data.topicId}: ${data.masteryScore} mastery (${data.level})`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Data seeding complete');

    // NOW TEST QUESTION GENERATION
    console.log('\n🧪 TESTING QUESTION GENERATION WITH SEEDED DATA\n');

    // Login with the test user
    console.log('1️⃣  Logging in as test user...');
    const loginResponse = await axios.post('http://localhost:8000/api/auth/login', {
      email: 'test-high-mastery@test.com',
      password: 'test123',
    });

    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully\n');

    // Test each topic
    for (const data of progressionData) {
      console.log(`${'='.repeat(70)}`);
      console.log(`📍 TOPIC: ${data.topicId.toUpperCase()}`);
      console.log(`${'='.repeat(70)}`);
      console.log(`   Expected Mastery: ${data.masteryScore}`);
      console.log(`   Expected Difficulty: ${data.level}\n`);

      try {
        // Get progression
        const progResponse = await axios.get(
          `http://localhost:8000/api/practice/topics/${data.topicId}/progression`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const prog = progResponse.data.data || progResponse.data;
        console.log(`   ✅ Progression fetched:`);
        console.log(`      - Mastery Score: ${prog.masteryScore}`);
        console.log(`      - Current Difficulty: ${prog.currentDifficultyLevel}`);
        console.log(`      - Readiness Score: ${prog.progressionReadinessScore}\n`);

        // Generate questions
        console.log(`   Generating questions...\n`);
        const genResponse = await axios.post(
          `http://localhost:8000/api/practice/topics/${data.topicId}/generate-questions`,
          { limit: 2 },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const result = genResponse.data;
        if (result.success && result.data?.questions?.length > 0) {
          console.log(`   ✅ Questions Generated:\n`);
          result.data.questions.forEach((q, i) => {
            console.log(`      Question ${i + 1}:`);
            console.log(`      - Title: "${q.problemTitle}"`);
            console.log(`      - Difficulty: ${q.difficulty}`);
            console.log(`      - Concept: ${q.primaryConceptTested}\n`);

            // Check if difficulty matches expected
            const expected = data.level;
            if (q.difficulty !== expected) {
              console.log(
                `      ⚠️  DIFFICULTY MISMATCH: Got "${q.difficulty}", expected "${expected}"`
              );
            } else {
              console.log(`      ✅ Difficulty matches expected level`);
            }
            console.log();
          });
        } else {
          console.log(`   ❌ Failed to generate questions`);
          console.log(`      Response:`, result);
        }
      } catch (err) {
        console.log(`   ❌ Error:`, err.response?.data?.message || err.message);
      }
    }

    console.log('\n✅ TEST COMPLETE');
    console.log('   Check backend logs for learner profile that was sent to LLM');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedAndTest();
