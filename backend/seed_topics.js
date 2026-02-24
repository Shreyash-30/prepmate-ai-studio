import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Topic from './src/models/Topic.js';

dotenv.config();

const topics = [
  {
    topicId: 'arrays',
    name: 'Arrays & Sorting',
    description: 'Fundamental data structures and algorithms for manipulating arrays and sorting.',
    icon: 'List',
    color: 'emerald',
    difficulty: 1,
  },
  {
    topicId: 'linked-lists',
    name: 'Linked Lists',
    description: 'Linear data structures emphasizing pointer manipulation.',
    icon: 'Link',
    color: 'blue',
    difficulty: 2,
  },
  {
    topicId: 'trees',
    name: 'Trees',
    description: 'Hierarchical structures, traversals, and properties.',
    icon: 'TreePine',
    color: 'green',
    difficulty: 2,
  },
  {
    topicId: 'graphs',
    name: 'Graphs',
    description: 'Networks, paths, and graph traversal algorithms.',
    icon: 'Share2',
    color: 'purple',
    difficulty: 3,
  },
  {
    topicId: 'dynamic-programming',
    name: 'Dynamic Programming',
    description: 'Optimization over overlapping subproblems.',
    icon: 'Zap',
    color: 'amber',
    difficulty: 3,
  },
  {
    topicId: 'hash-tables',
    name: 'Hash Tables',
    description: 'Key-value mappings and fast lookups.',
    icon: 'Hash',
    color: 'orange',
    difficulty: 1,
  },
  {
    topicId: 'queues-stacks',
    name: 'Queues & Stacks',
    description: 'LIFO and FIFO data structures.',
    icon: 'Layers',
    color: 'indigo',
    difficulty: 1,
  },
  {
    topicId: 'strings',
    name: 'Strings',
    description: 'String manipulation and pattern matching.',
    icon: 'Type',
    color: 'rose',
    difficulty: 1,
  },
  {
    topicId: 'math',
    name: 'Math & Numbers',
    description: 'Number theory and mathematical algorithms.',
    icon: 'Calculator',
    color: 'cyan',
    difficulty: 2,
  },
  {
    topicId: 'bit-manipulation',
    name: 'Bit Manipulation',
    description: 'Operations on binary representations.',
    icon: 'Binary',
    color: 'slate',
    difficulty: 2,
  },
  {
    topicId: 'greedy',
    name: 'Greedy Algorithms',
    description: 'Making locally optimal choices.',
    icon: 'ArrowRight',
    color: 'yellow',
    difficulty: 2,
  },
  {
    topicId: 'backtracking',
    name: 'Backtracking',
    description: 'Exhaustive search and pruning.',
    icon: 'CornerUpLeft',
    color: 'red',
    difficulty: 3,
  },
  {
    topicId: 'trie',
    name: 'Trie',
    description: 'Prefix trees for efficient string retrieval.',
    icon: 'Network',
    color: 'teal',
    difficulty: 3,
  },
  {
    topicId: 'system-design',
    name: 'System Design',
    description: 'Designing scalable and distributed systems.',
    icon: 'Server',
    color: 'sky',
    difficulty: 3,
  },
  {
    topicId: 'binary-search-trees',
    name: 'Binary Search Trees',
    description: 'Ordered tree data structures.',
    icon: 'GitBranch',
    color: 'lime',
    difficulty: 2,
  },
];

async function seed() {
  try {
    await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');
    console.log('Connected to MongoDB');

    for (const topicData of topics) {
      await Topic.findOneAndUpdate(
        { topicId: topicData.topicId },
        { ...topicData, questionCount: Math.floor(Math.random() * 50) + 20, isActive: true },
        { upsert: true, new: true }
      );
    }
    
    console.log('Database seeded with all topics!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding DB:', error);
    process.exit(1);
  }
}

seed();
