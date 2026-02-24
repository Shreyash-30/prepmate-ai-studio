import mongoose from 'mongoose';
import { TopicMastery } from './src/models/MLIntelligence.js';

async function test() {
  await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');
  try {
    const res = await TopicMastery.findOneAndUpdate(
      { userId: '699d086dd290f7bdfd5855d3', topicId: 'queues_stacks' },
      {
        $setOnInsert: { improvement_trend: 'improving', last_attempt_timestamp: new Date() },
        $set: {
          mastery_probability: 0.8,
          attempts_count: 50,
          recommended_difficulty: 'hard',
          confidence_score: 0.9
        }
      },
      { upsert: true, new: true }
    );
    console.log('Success queues_stacks', res);
  } catch(e) { console.error('Error:', e) }
  process.exit();
}
test();
