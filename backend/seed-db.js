import mongoose from 'mongoose';
import User from './src/models/User.js';
import QuestionBank from './src/models/QuestionBank.js';
import UserTopicProgression from './src/models/UserTopicProgression.js';
import Topic from './src/models/Topic.js';

const topics = [
  'arrays',
  'strings',
  'linked-lists',
  'trees',
  'graphs',
  'dynamic-programming',
  'greedy',
  'math',
  'sorting',
  'bit-manipulation',
];

const topicMetadata = {
  arrays: {
    name: 'Arrays & Hashing',
    description: 'Master arrays, dynamic arrays, and hashing techniques for efficient data manipulation',
    category: 'dsa',
    icon: 'Grid3x3',
    color: 'bg-blue-500/10 text-blue-500',
  },
  strings: {
    name: 'Strings',
    description: 'Learn string manipulation, pattern matching, and substring operations',
    category: 'dsa',
    icon: 'Type',
    color: 'bg-cyan-500/10 text-cyan-500',
  },
  'linked-lists': {
    name: 'Linked Lists',
    description: 'Explore linked list operations, reversals, and advanced traversal techniques',
    category: 'dsa',
    icon: 'Link',
    color: 'bg-purple-500/10 text-purple-500',
  },
  trees: {
    name: 'Trees & BST',
    description: 'Understand binary trees, BSTs, balanced trees, and tree traversal methods',
    category: 'dsa',
    icon: 'GitBranch',
    color: 'bg-green-500/10 text-green-500',
  },
  graphs: {
    name: 'Graphs',
    description: 'Master graph theory, DFS, BFS, shortest paths, and network algorithms',
    category: 'dsa',
    icon: 'Network',
    color: 'bg-yellow-500/10 text-yellow-500',
  },
  'dynamic-programming': {
    name: 'Dynamic Programming',
    description: 'Learn memoization, tabulation, and optimal substructure principles',
    category: 'dsa',
    icon: 'Layers',
    color: 'bg-red-500/10 text-red-500',
  },
  greedy: {
    name: 'Greedy Algorithms',
    description: 'Understand greedy choice property and local optimization strategies',
    category: 'dsa',
    icon: 'Zap',
    color: 'bg-orange-500/10 text-orange-500',
  },
  math: {
    name: 'Math',
    description: 'Explore number theory, combinatorics, and mathematical algorithms',
    category: 'dsa',
    icon: 'Calculator',
    color: 'bg-pink-500/10 text-pink-500',
  },
  sorting: {
    name: 'Sorting',
    description: 'Master various sorting algorithms and their complexities',
    category: 'dsa',
    icon: 'ArrowDownUp',
    color: 'bg-indigo-500/10 text-indigo-500',
  },
  'bit-manipulation': {
    name: 'Bit Manipulation',
    description: 'Learn bitwise operations and their applications in problem-solving',
    category: 'dsa',
    icon: 'Binary',
    color: 'bg-teal-500/10 text-teal-500',
  },
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prepmate-ai-studio');
    
    console.log('🌱 Seeding database...\n');
    
    // Get all users
    const users = await User.find();
    console.log(`📝 Found ${users.length} users\n`);

    // Clear and seed topics
    await Topic.deleteMany({});
    const topicsToSeed = [];
    for (const topicId of topics) {
      topicsToSeed.push({
        topicId,
        ...topicMetadata[topicId],
      });
    }
    const seedTopics = await Topic.insertMany(topicsToSeed);
    console.log(`✅ Created ${seedTopics.length} topics with metadata`);
    console.log(`   Topics: ${seedTopics.map(t => t.name).join(', ')}\n`);
    
    // ℹ️ Questions are now generated dynamically by LLM (Gemini)
    // Static dummy questions have been removed - all questions are AI-personalized
    // Clear existing static questions
    await QuestionBank.deleteMany({});
    console.log(`✅ Cleared static questions - will fetch from LLM on demand\n`);

    // Topic question counts will be populated when users generate questions via LLM
    
    // Create user progressions
    await UserTopicProgression.deleteMany({});
    let progressionCount = 0;
    for (const user of users) {
      for (const topic of topics) {
        const progression = new UserTopicProgression({
          userId: user._id,
          topicId: topic,
          currentDifficultyLevel: 'Easy',
          progressionReadinessScore: Math.random() * 0.8,
          recommendedNextDifficulty: Math.random() > 0.5 ? 'Medium' : 'Easy',
          recommendedMoreSameLevel: Math.random() > 0.5,
          totalAttempts: Math.floor(Math.random() * 10),
          successfulAttempts: Math.floor(Math.random() * 7),
          averageAccuracy: Math.random(), // 0-1, not percentage
          averageSolveTime: Math.random() * 300000,
          averageHintsUsed: Math.floor(Math.random() * 3),
          isMastered: Math.random() > 0.8,
          isOverdue: Math.random() > 0.7,
          hasWeaknesses: Math.random() > 0.6,
        });
        
        await progression.save();
        progressionCount++;
      }
    }
    console.log(`✅ Created ${progressionCount} user topic progressions`);
    
    console.log('\n✨ Database seeding complete!');
    
  } catch(err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
