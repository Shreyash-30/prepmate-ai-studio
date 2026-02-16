/**
 * UserTopicProgression Model
 * 
 * Tracks adaptive learning progression for each user-topic pair
 * Determines recommended difficulty level based on mastery and readiness
 * 
 * Used by:
 * - Adaptive Practice Engine for difficulty recommendations
 * - Topic Progression Service for level advancement
 * - Practice UI for showing next difficulty recommendation
 */

import mongoose from 'mongoose';

const userTopicProgressionSchema = new mongoose.Schema(
  {
    // Composite Key
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
      description: 'Normalized topic ID (e.g., "arrays", "dynamic_programming")',
    },

    // ============================================
    // PROGRESSION METRICS
    // ============================================

    // Current difficulty user is practicing at
    currentDifficultyLevel: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Easy',
      description: 'Difficulty level of problems currently being practiced',
    },

    // Readiness to advance to next level
    progressionReadinessScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
      description: 'Score 0-1 indicating readiness to advance (0 = not ready, 1 = ready)',
    },

    // What difficulty to recommend next
    recommendedNextDifficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard', 'Review'],
      description: 'Recommended next difficulty level based on readiness',
    },

    // Whether user should stay at current level
    recommendedMoreSameLevel: {
      type: Boolean,
      default: true,
      description: 'True if user should practice more at current level before advancing',
    },

    // ============================================
    // PRACTICE HISTORY
    // ============================================

    totalAttempts: {
      type: Number,
      default: 0,
      description: 'Total practice attempts at this topic',
    },

    successfulAttempts: {
      type: Number,
      default: 0,
      description: 'Completed/successful attempts',
    },

    averageAccuracy: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
      description: 'Success rate across all attempts',
    },

    averageSolveTime: {
      type: Number,
      default: 0,
      description: 'Average time to solve in milliseconds',
    },

    averageHintsUsed: {
      type: Number,
      default: 0,
      description: 'Average hints used per attempt',
    },

    // ============================================
    // DIFFICULTY PROGRESSION HISTORY
    // ============================================

    difficultyProgression: [
      {
        difficulty: String, // 'Easy', 'Medium', 'Hard'
        startedAt: Date,
        endedAt: { type: Date, default: null },
        attemptCount: Number,
        successCount: Number,
        successRate: Number,
        avgSolveTime: Number,
      },
    ],

    // ============================================
    // TEMPORAL METRICS
    // ============================================

    lastEvaluatedAt: {
      type: Date,
      default: Date.now,
      description: 'When progression was last evaluated/updated',
    },

    lastAttemptAt: {
      type: Date,
      description: 'When user last attempted problem in this topic',
    },

    firstAttemptAt: {
      type: Date,
      description: 'When user first attempted problem in this topic',
    },

    daysSinceLastAttempt: {
      type: Number,
      default: 0,
      description: 'Days since last practice attempt',
    },

    // ============================================
    // FEEDBACK & RECOMMENDATIONS
    // ============================================

    progressionReason: {
      type: String,
      description: 'AI-generated explanation for recommended progression',
    },

    nextRecommendationAt: {
      type: Date,
      description: 'When to next evaluate progression',
    },

    // ============================================
    // FLAGS & STATUS
    // ============================================

    isOverdue: {
      type: Boolean,
      default: false,
      description: 'True if topic needs review based on retention schedule',
    },

    hasWeaknesses: {
      type: Boolean,
      default: false,
      description: 'True if weakness signals detected in this topic',
    },

    isMastered: {
      type: Boolean,
      default: false,
      description: 'True if user has demonstrated mastery (>90% accuracy)',
    },
  },
  {
    timestamps: true,
    collection: 'user_topic_progression',
  }
);

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

// Composite unique index on (userId, topicId)
userTopicProgressionSchema.index(
  { userId: 1, topicId: 1 },
  { unique: true }
);

// For finding all topics a user needs to practice
userTopicProgressionSchema.index({ userId: 1, recommendedMoreSameLevel: 1 });

// For finding topics user is overdue on
userTopicProgressionSchema.index({ userId: 1, isOverdue: 1 });

// For finding mastered topics
userTopicProgressionSchema.index({ userId: 1, isMastered: 1 });

// For activity queries
userTopicProgressionSchema.index({ userId: 1, lastAttemptAt: -1 });

/**
 * Instance Methods
 */

// Calculate progression readiness based on performance
userTopicProgressionSchema.methods.calculateReadiness = function () {
  if (this.successfulAttempts === 0) {
    this.progressionReadinessScore = 0;
    return;
  }

  // Readiness factors
  const accuracyFactor = this.averageAccuracy >= 0.8 ? 1.0 : this.averageAccuracy * 0.8;
  const attemptFactor = Math.min(this.successfulAttempts / 5, 1.0); // 5+ attempts = max
  const timeFactor = this.averageSolveTime < 600000 ? 1.0 : 0.8; // Under 10 min = good

  // Composite readiness (higher = ready to advance)
  this.progressionReadinessScore = (accuracyFactor * 0.5 + attemptFactor * 0.3 + timeFactor * 0.2);

  // Determine next difficulty
  if (this.currentDifficultyLevel === 'Easy') {
    this.recommendedNextDifficulty = this.progressionReadinessScore >= 0.7 ? 'Medium' : 'Easy';
  } else if (this.currentDifficultyLevel === 'Medium') {
    this.recommendedNextDifficulty = this.progressionReadinessScore >= 0.8 ? 'Hard' : 'Medium';
  } else {
    this.recommendedNextDifficulty = 'Hard';
  }

  this.recommendedMoreSameLevel = this.progressionReadinessScore < 0.7;
  this.lastEvaluatedAt = new Date();
};

// Update difficulty level
userTopicProgressionSchema.methods.advanceDifficulty = function () {
  if (this.currentDifficultyLevel === 'Easy') {
    this.currentDifficultyLevel = 'Medium';
  } else if (this.currentDifficultyLevel === 'Medium') {
    this.currentDifficultyLevel = 'Hard';
  }
};

// Reset to previous difficulty
userTopicProgressionSchema.methods.reviewPreviousDifficulty = function () {
  if (this.currentDifficultyLevel === 'Hard') {
    this.currentDifficultyLevel = 'Medium';
  } else if (this.currentDifficultyLevel === 'Medium') {
    this.currentDifficultyLevel = 'Easy';
  }
};

/**
 * Static Methods
 */

userTopicProgressionSchema.statics.findOrCreateForUser = async function (userId, topicId) {
  let progression = await this.findOne({ userId, topicId });

  if (!progression) {
    progression = new this({
      userId,
      topicId,
      currentDifficultyLevel: 'Easy',
      progressionReadinessScore: 0,
    });
    await progression.save();
  }

  return progression;
};

userTopicProgressionSchema.statics.getUserProgressionByTopic = function (userId) {
  return this.find({ userId })
    .select('topicId currentDifficultyLevel progressionReadinessScore recommendedNextDifficulty')
    .sort({ lastAttemptAt: -1 });
};

userTopicProgressionSchema.statics.getOverdueTopics = function (userId) {
  return this.find({
    userId,
    isOverdue: true,
  }).sort({ lastAttemptAt: 1 });
};

export default mongoose.model('UserTopicProgression', userTopicProgressionSchema);
