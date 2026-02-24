import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { TopicMastery, WeakTopicSignal, ReadinessScore, AdaptiveStudyPlan } from '../src/models/MLIntelligence.js';
import User from '../src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function seedDashboard() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepmate-ai';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const users = await User.find();
  console.log(`Seeding dashboard for ${users.length} users`);

  for (const user of users) {
    const userId = user._id.toString();
    
    // 1. Mastery
    const topics = ['arrays', 'dynamic_programming', 'trees', 'graphs', 'strings'];
    for (const topicId of topics) {
      await TopicMastery.findOneAndUpdate(
        { userId, topicId },
        { 
          mastery_probability: Math.random() * 0.8 + 0.1,
          confidence_score: 0.7,
          improvement_trend: 'stable'
        },
        { upsert: true }
      );
    }

    // 2. Weaknesses
    await WeakTopicSignal.findOneAndUpdate(
      { userId, topicId: 'dynamic_programming' },
      {
        riskScore: 82,
        recommendation: 'Mastery gap detected. Focus on knapsack patterns.',
        priority: 'high'
      },
      { upsert: true }
    );

    // 3. Readiness
    const companies = ['google', 'amazon', 'meta'];
    for (const company of companies) {
      await ReadinessScore.findOneAndUpdate(
        { userId, targetCompany: company },
        {
          readinessScore: Math.floor(Math.random() * 40 + 40),
          confidenceScore: 0.6,
          passingProbability: 0.5
        },
        { upsert: true }
      );
    }

    // 4. Study Plan
    const today = new Date();
    today.setHours(0,0,0,0);
    await AdaptiveStudyPlan.findOneAndUpdate(
      { userId, planDate: today },
      {
        dailyMinutes: 120,
        focusTopics: [
          { topicId: 'arrays', priority: 'high', suggestedTime: 45 },
          { topicId: 'dynamic_programming', priority: 'critical', suggestedTime: 75 }
        ],
        status: 'planned'
      },
      { upsert: true }
    );

    // Update user stats
    await User.updateOne({ _id: user._id }, { totalProblemsCount: Math.floor(Math.random() * 100 + 50) });
  }

  console.log('Dashboard seeding completed');
  process.exit(0);
}

seedDashboard().catch(err => {
  console.error(err);
  process.exit(1);
});
