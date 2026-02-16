import mongoose from 'mongoose';
import adaptivePracticeService from './src/services/adaptivePracticeService.js';
import UserTopicProgression from './src/models/UserTopicProgression.js';

await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');

const user = await mongoose.connection.collection('users').findOne({ email: 'shreyash@gmail.com' });
const userId = user._id;
const topicId = 'arrays';

console.log('Debug: Checking mastery data...\n');
console.log('User ID:', userId.toString());
console.log('Topic ID:', topicId);

// Get progression data
const progression = await UserTopicProgression.findOne({ userId, topicId });
console.log('\n📊 Progression Data:');
console.log('   progressionReadinessScore:', progression.progressionReadinessScore);

// Get masteryData
const masteryData = await adaptivePracticeService.queryMasteryFromML(userId, topicId);
console.log('\n🔍 MasteryData from ML Service:');
console.log('   Full object:', JSON.stringify(masteryData, null, 2));

// Check the condition
const masteryScore = (masteryData?.mastery_probability && masteryData.mastery_probability > 0) 
  ? masteryData.mastery_probability 
  : progression.progressionReadinessScore;

console.log('\n✅ Final Mastery Score:');
console.log('   Would use readiness?', !masteryData?.mastery_probability || masteryData.mastery_probability === 0);
console.log('   Final score:', masteryScore);
console.log('   As percentage:', Math.round(masteryScore * 100) + '%');

process.exit(0);
