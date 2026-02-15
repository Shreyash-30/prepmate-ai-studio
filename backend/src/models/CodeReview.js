import mongoose from 'mongoose';

/**
 * Code Review Collection
 * Stores AI-generated code review feedback for practice submissions
 * Source: Python AI service app/llm/practice_review_service.py
 */
const CodeReviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExternalPlatformSubmission',
    },
    problemId: {
      type: String,
      required: true,
    },
    problemTitle: String,
    
    // User code submission
    userCode: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      required: true,
    },
    difficulty: String,
    topic: String,
    
    // Review content
    reviewSummary: String,
    optimizationSuggestions: [String],
    conceptualFeedback: String,
    codeQuality: {
      readability: Number,
      efficiency: Number,
      correctness: Number,
      overallScore: Number,
    },
    interviewInsights: String,
    
    // Scoring
    score: Number,
    
    // Follow-up tracking
    followUpNeeded: Boolean,
    followUpTopics: [String],
  },
  {
    timestamps: true,
  }
);

CodeReviewSchema.index({ userId: 1, submissionTime: -1 });
CodeReviewSchema.index({ userId: 1, problemId: 1 });
CodeReviewSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('CodeReview', CodeReviewSchema);
