import mongoose from 'mongoose';

/**
 * Learning Content Collection
 * Stores AI-generated educational materials for interview preparation
 * Source: Python AI service app/llm/learning_service.py
 */
const LearningContentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    topicId: {
      type: String,
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
    },
    difficultyLevel: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    
    // Generated content sections
    summary: String,
    keyConcepts: [String],
    examples: [String],
    
    // Flashcards for spaced repetition
    flashcards: [
      {
        question: String,
        answer: String,
        difficulty: String,
      },
    ],
    
    // Practice problems embedded in learning material
    practiceQuestions: [
      {
        question: String,
        hint: String,
        expectedApproach: String,
        difficulty: String,
      },
    ],
    
    commonMistakes: [String],
    nextTopics: [String],
    realWorldApplications: [String],
    estimatedLearningTime: Number, // minutes
    
    // Usage tracking
    viewedAt: Date,
    completedAt: Date,
    lastAccessedAt: Date,
  },
  {
    timestamps: true,
  }
);

LearningContentSchema.index({ userId: 1, topicId: 1 });
LearningContentSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('LearningContent', LearningContentSchema);
