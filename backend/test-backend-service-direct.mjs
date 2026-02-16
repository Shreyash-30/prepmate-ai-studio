/**
 * Test by directly importing and calling the backend service
 * This will help us see the console.log output
 */

import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB first
console.log('🔗 Connecting to MongoDB...');

try {
  await mongoose.connect('mongodb://localhost:27017/prepmate_db');
  console.log('✅ Connected to MongoDB');
} catch (error) {
  console.error('❌ Failed to connect to MongoDB:', error.message);
  console.log('   Make sure MongoDB is running on localhost:27017');
  process.exit(1);
}

// Now import the service
console.log('\n📥 Importing LLMQuestionGenerationService...');
const { default: llmQuestionGenerationService } = await import(
  './src/services/llmQuestionGenerationService.js'
);

console.log('✅ Service imported');

// Get a test user and topic
console.log('\n📊 Fetching test user and topic...');

const { default: User } = await import('./src/models/User.js');
const { default: Topic } = await import('./src/models/Topic.js');

const user = await User.findOne({ email: 'shreyash@gmail.com' });
if (!user) {
  console.error('❌ User not found: shreyash@gmail.com');
  process.exit(1);
}

const topic = await Topic.findOne({ isActive: true }).limit(1);
if (!topic) {
  console.error('❌ No topics found in database');
  process.exit(1);
}

console.log(`✅ Found user: ${user.email}`);
console.log(`✅ Found topic: ${topic.name} (${topic.topicId})`);

// Call the service directly
console.log('\n' + '='.repeat(80));
console.log('🚀 CALLING generatePersonalizedQuestions(userId, topicId, { limit: 5 })');
console.log('='.repeat(80));

try {
  const result = await llmQuestionGenerationService.generatePersonalizedQuestions(
    user._id,
    topic.topicId,
    { limit: 5 }
  );

  console.log('\n✅ SERVICE RETURNED RESULT');
  console.log(`   Success: ${result.success}`);
  console.log(`   Questions: ${result.questions?.length || 0}`);
  console.log(`   Source: ${result.source}`);
  console.log(`   Message: ${result.message}`);
  
  if (result.success && result.questions?.length > 0) {
    console.log(`\n✅ SUCCESS! Generated questions:`);
    result.questions.slice(0, 3).forEach((q, i) => {
      console.log(`   ${i + 1}. ${q.problemTitle}`);
    });
  } else {
    console.log(`\n❌ FAILED! No questions generated`);
    console.log('Full result:', JSON.stringify(result, null, 2));
  }

} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error('Stack:', error.stack);
}

await mongoose.disconnect();
console.log('\n✅ Disconnected from MongoDB');
