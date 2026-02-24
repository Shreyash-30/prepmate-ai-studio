import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AdaptivePracticeService from './src/services/adaptivePracticeService.js';
import User from './src/models/User.js';

dotenv.config();

async function test() {
  await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');
  const user = await User.findOne({ email: 'amar@gmail.com' });
  const recs = await AdaptivePracticeService.getAllTopicRecommendations(user._id);
  console.log('Total topics:', recs.length);
  
  const arraysTarget = recs.find(r => r.topicId === 'arrays');
  const unknownTarget = recs.find(r => !r.topic);
  
  if (arraysTarget) console.log('Arrays rec:', JSON.stringify(arraysTarget, null, 2));
  if (unknownTarget) console.log('Unknown rec:', JSON.stringify(unknownTarget, null, 2));
  
  process.exit();
}

test();
