import mongoose from 'mongoose';

const TopicSchema = new mongoose.Schema(
  {
    topicId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      default: 'dsa', // dsa, os, dbms, networks, system-design
    },
    icon: {
      type: String,
      default: 'BookOpen',
    },
    color: {
      type: String,
      default: 'bg-primary/10',
    },
    questionCount: {
      type: Number,
      default: 0,
    },
    difficulty: {
      easy: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      hard: { type: Number, default: 0 },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Topic', TopicSchema);
