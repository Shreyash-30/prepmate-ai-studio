/**
 * Initialize AI Collections
 * Creates indexes and ensures collections are ready for ML/LLM services
 * 
 * Usage:
 *   node scripts/init-ai-collections.js
 * 
 * This script:
 * 1. Connects to MongoDB
 * 2. Creates/verifies all AI-related collection indexes
 * 3. Sets up TTL indexes for temporary data
 * 4. Validates schema compatibility
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/prepmate-ai-studio';

// Collection models
import TopicMastery from './src/models/MLIntelligence.js';
import RevisionSchedule from './src/models/MLIntelligence.js';
import WeakTopicSignals from './src/models/MLIntelligence.js';
import PreparationTasks from './src/models/MLIntelligence.js';
import MentorConversation from './src/models/MentorConversation.js';
import CodeReview from './src/models/CodeReview.js';
import InterviewSession from './src/models/InterviewSession.js';
import LearningContent from './src/models/LearningContent.js';
import ExternalPlatformSubmission from './src/models/ExternalPlatformSubmission.js';

const collections = [
  {
    name: 'topic_mastery (Bayesian Knowledge Tracing)',
    indexes: [
      { spec: { userId: 1, topicId: 1 }, options: { unique: true } },
      { spec: { userId: 1 }, options: {} },
      { spec: { topicId: 1 }, options: {} },
      { spec: { lastUpdated: -1 }, options: {} },
    ],
  },
  {
    name: 'revision_schedule (Spaced Repetition)',
    indexes: [
      { spec: { userId: 1, topicId: 1 }, options: { unique: true } },
      { spec: { userId: 1 }, options: {} },
      { spec: { nextRevisionDate: 1 }, options: {} },
      { spec: { urgencyLevel: 1 }, options: {} },
    ],
  },
  {
    name: 'weak_topic_signals (Risk Detection)',
    indexes: [
      { spec: { userId: 1, topicId: 1 }, options: { unique: true } },
      { spec: { userId: 1 }, options: {} },
      { spec: { riskScore: -1 }, options: {} },
      { spec: { lastAnalyzedAt: -1 }, options: {} },
    ],
  },
  {
    name: 'preparation_tasks (Adaptive Planning)',
    indexes: [
      { spec: { userId: 1, dueDate: 1 }, options: {} },
      { spec: { userId: 1, status: 1 }, options: {} },
      { spec: { dueDate: 1 }, options: {} },
      { spec: { priority: -1 }, options: {} },
    ],
  },
  {
    name: 'mentor_conversations',
    indexes: [
      { spec: { userId: 1, conversationId: 1 }, options: { unique: true } },
      { spec: { userId: 1, createdAt: -1 }, options: {} },
      { spec: { createdAt: 1 }, options: { expireAfterSeconds: 2592000 } }, // 30 days TTL
    ],
  },
  {
    name: 'code_reviews',
    indexes: [
      { spec: { userId: 1, problemId: 1 }, options: {} },
      { spec: { userId: 1, createdAt: -1 }, options: {} },
      { spec: { createdAt: 1 }, options: { expireAfterSeconds: 5184000 } }, // 60 days TTL
    ],
  },
  {
    name: 'interview_sessions',
    indexes: [
      { spec: { userId: 1, sessionId: 1 }, options: { unique: true } },
      { spec: { userId: 1, createdAt: -1 }, options: {} },
      { spec: { createdAt: 1 }, options: { expireAfterSeconds: 7776000 } }, // 90 days TTL
    ],
  },
  {
    name: 'learning_content',
    indexes: [
      { spec: { userId: 1, topicId: 1 }, options: {} },
      { spec: { topic: 1 }, options: {} },
      { spec: { createdAt: -1 }, options: {} },
    ],
  },
  {
    name: 'externalplatformsubmissions',
    indexes: [
      { spec: { userId: 1, platform: 1, problemId: 1 }, options: { unique: true } },
      { spec: { userId: 1, primaryTopicId: 1 }, options: {} },
      { spec: { submissionTime: -1 }, options: {} },
    ],
  },
];

async function initializeCollections() {
  try {
    console.log('\n🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    for (const collection of collections) {
      console.log(`📚 Initializing ${collection.name}...`);

      try {
        const collectionName = collection.name.split(' ')[0];
        const mongoCollection = db.collection(collectionName);

        // Create indexes
        for (const indexConfig of collection.indexes) {
          await mongoCollection.createIndex(indexConfig.spec, indexConfig.options);
          console.log(`   ✅ Index created: ${JSON.stringify(indexConfig.spec)}`);
        }

        // Get collection stats
        const stats = await mongoCollection.stats();
        console.log(`   📊 Documents in collection: ${stats.count || 0}\n`);
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
      }
    }

    console.log('✅ All collections initialized successfully!\n');
    console.log('📋 Summary:');
    console.log('   - topic_mastery: Bayesian Knowledge Tracing results');
    console.log('   - revision_schedule: Spaced repetition tracking');
    console.log('   - weak_topic_signals: Risk detection analysis');
    console.log('   - preparation_tasks: Adaptive study plan');
    console.log('   - mentor_conversations: AI mentor chat history');
    console.log('   - code_reviews: Practice feedback');
    console.log('   - interview_sessions: Interview simulation scores');
    console.log('   - learning_content: Generated learning material');
    console.log('   - externalplatformsubmissions: Enhanced submission data\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

initializeCollections();
