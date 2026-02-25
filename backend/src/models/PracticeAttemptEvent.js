/**
 * PracticeAttemptEvent Model
 * 
 * Records detailed telemetry for every practice attempt (both external and AI Lab)
 * Feeds into ML intelligence pipeline for mastery, retention, and weakness analysis
 * 
 * Sources:
 * - External: LeetCode submissions
 * - AI Lab: AI Practice Lab telemetry
 */

import mongoose from 'mongoose';

const practiceAttemptEventSchema = new mongoose.Schema(
  {
    // Composite Key
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },

    problemId: {
      type: String,
      required: true,
      index: true,
      description: 'Problem ID from question_bank',
    },

    topicId: {
      type: String,
      required: true,
      index: true,
      description: 'Normalized topic ID',
    },

    // ============================================
    // ATTEMPT SOURCE & MODE
    // ============================================

    mode: {
      type: String,
      enum: ['external', 'ai_lab'],
      required: true,
      index: true,
      description: 'external = LeetCode, ai_lab = AI Practice Lab',
    },

    sourceSubmissionId: {
      type: String,
      description: 'Original submission ID from external source',
    },

    // ============================================
    // CORE METRICS
    // ============================================

    // Time spent solving
    solveTime: {
      type: Number,
      default: 0,
      description: 'Total time spent (ms) on this problem',
    },

    initialSolveTime: {
      type: Number,
      description: 'Solve time of the very first success (ms)',
    },

    recallImprovement: {
      type: Number,
      description: 'Percentage improvement in solve time compared to initial solve',
    },

    // Number of attempts to solve
    attempts: {
      type: Number,
      default: 1,
      description: 'Number of submission attempts',
    },

    // Hint usage
    hintsUsed: {
      type: Number,
      default: 0,
      description: 'Number of hints requested',
    },

    // Retries (only for AI Lab)
    retries: {
      type: Number,
      default: 0,
      description: 'Number of times user tried different approach',
    },

    // ============================================
    // STRATEGY & LEARNING SIGNALS
    // ============================================

    // Time from start to valid solution strategy
    timeToFirstValidStrategy: {
      type: Number,
      default: 0,
      description: 'Time (ms) until user identified correct approach',
    },

    // How much hint improved performance
    improvementAfterHint: {
      type: Number,
      min: -1,
      max: 1,
      default: 0,
      description: 'Change in performance after hint: -1 (worse) to 1 (better)',
    },

    // Error patterns detected
    errorPatternCategory: {
      type: String,
      enum: ['logic_error', 'implementation_error', 'edge_case', 'optimization', 'none'],
      default: 'none',
      description: 'Primary error type detected',
    },

    // Number of strategy changes
    strategyChangeCount: {
      type: Number,
      default: 0,
      description: 'How many times approach/strategy changed',
    },

    // ============================================
    // AI LAB SPECIFIC METRICS
    // ============================================

    // Explanation quality score (if AI explanation provided)
    explanationQualityScore: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
      description: 'User rating of AI explanation quality (0-1)',
    },

    // AI feedback captured
    aiFeedback: {
      type: String,
      description: 'AI-generated feedback for this attempt',
    },

    // Code quality analysis
    codeQualityMetrics: {
      timeComplexity: String, // e.g., "O(n log n)"
      spaceComplexity: String, // e.g., "O(1)"
      readability: { type: Number, min: 0, max: 10 },
      efficiency: { type: Number, min: 0, max: 10 },
    },

    // ============================================
    // OUTCOME
    // ============================================

    correctness: {
      type: Boolean,
      required: true,
      index: true,
      description: 'Whether solution was correct',
    },

    // Difficulty of approach taken
    approachDifficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      description: 'Difficulty of the approach user took',
    },

    // Beats stats (from LeetCode)
    runtimeBeats: {
      type: Number,
      min: 0,
      max: 100,
      description: 'Percentile of runtime vs other submissions',
    },

    memoryBeats: {
      type: Number,
      min: 0,
      max: 100,
      description: 'Percentile of memory vs other submissions',
    },

    // ============================================
    // LEARNING OUTCOME
    // ============================================

    isFirstSuccess: {
      type: Boolean,
      default: false,
      description: 'First time user solved this problem',
    },

    isRetry: {
      type: Boolean,
      default: false,
      description: 'User attempting problem they previously solved',
    },

    timeSinceLastAttempt: {
      type: Number,
      default: null,
      description: 'Days since last attempt on this problem (for retries)',
    },

    // ============================================
    // ML PROCESSING STATUS
    // ============================================

    mlProcessed: {
      type: Boolean,
      default: false,
      description: 'Whether this event has been processed by ML pipeline',
    },

    mlProcessingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      description: 'Status of ML intelligence updates',
    },

    mlUpdateDetails: {
      masteryUpdated: { type: Boolean, default: false },
      retentionUpdated: { type: Boolean, default: false },
      weaknessAnalyzed: { type: Boolean, default: false },
      progressionUpdated: { type: Boolean, default: false },
      lastMLUpdateAt: Date,
    },

    // ============================================
    // METADATA
    // ============================================

    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      description: 'Problem difficulty',
    },

    language: {
      type: String,
      description: 'Programming language used (for AI Lab)',
    },

    // Session context
    sessionId: {
      type: String,
      description: 'AI Lab session ID if applicable',
    },

    isRevision: {
      type: Boolean,
      default: false,
      description: 'True if attempt was part of a revision session',
    },

    isValidation: {
      type: Boolean,
      default: false,
      description: 'True if this is a validation task (fresh problem) vs reinforcement (old problem)',
    },
  },
  {
    timestamps: true,
    collection: 'practice_attempt_events',
  }
);

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

// Composite indexes for common queries
practiceAttemptEventSchema.index({ userId: 1, topicId: 1, createdAt: -1 });
practiceAttemptEventSchema.index({ userId: 1, problemId: 1, createdAt: -1 });
practiceAttemptEventSchema.index({ userId: 1, correctness: 1, createdAt: -1 });

// For ML processing
practiceAttemptEventSchema.index({ mlProcessingStatus: 1, createdAt: 1 });
practiceAttemptEventSchema.index({ userId: 1, mlProcessed: 1 });

// For insights and analytics
practiceAttemptEventSchema.index({ userId: 1, mode: 1, createdAt: -1 });
practiceAttemptEventSchema.index({ topicId: 1, difficulty: 1, correctness: 1 });

/**
 * Instance Methods
 */

// Check if hint helped
practiceAttemptEventSchema.methods.didHintHelp = function () {
  return this.hintsUsed > 0 && this.improvementAfterHint > 0;
};

// Mark as processed by ML
practiceAttemptEventSchema.methods.markMLProcessed = function (updates = {}) {
  this.mlProcessed = true;
  this.mlProcessingStatus = 'completed';
  this.mlUpdateDetails = {
    ...this.mlUpdateDetails,
    ...updates,
    lastMLUpdateAt: new Date(),
  };
};

// Calculate learning score (0-1)
practiceAttemptEventSchema.methods.calculateLearningScore = function () {
  if (!this.correctness) return 0;

  const attemptPenalty = Math.max(0, 1 - this.attempts * 0.1);
  const hintPenalty = Math.max(0, 1 - this.hintsUsed * 0.15);
  const timeFactor = Math.min(1, 300000 / Math.max(this.solveTime, 1)); // 5min = optimal

  return (attemptPenalty * 0.4 + hintPenalty * 0.3 + timeFactor * 0.3);
};

/**
 * Static Methods
 */

// Get recent practice for topic
practiceAttemptEventSchema.statics.getRecentPractice = function (userId, topicId, limit = 10) {
  return this.find({ userId, topicId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Get success rate for topic
practiceAttemptEventSchema.statics.getTopicStats = async function (userId, topicId) {
  const attempts = await this.find({ userId, topicId });
  const correct = attempts.filter((a) => a.correctness).length;

  return {
    totalAttempts: attempts.length,
    successfulAttempts: correct,
    successRate: attempts.length > 0 ? correct / attempts.length : 0,
    averageSolveTime: attempts.length > 0
      ? attempts.reduce((sum, a) => sum + a.solveTime, 0) / attempts.length
      : 0,
    averageHints: attempts.length > 0
      ? attempts.reduce((sum, a) => sum + a.hintsUsed, 0) / attempts.length
      : 0,
  };
};

// Find pending ML processing
practiceAttemptEventSchema.statics.getPendingMLProcessing = function (limit = 100) {
  return this.find({
    mlProcessingStatus: { $in: ['pending', 'failed'] },
  })
    .sort({ createdAt: 1 })
    .limit(limit);
};

export default mongoose.model('PracticeAttemptEvent', practiceAttemptEventSchema);
