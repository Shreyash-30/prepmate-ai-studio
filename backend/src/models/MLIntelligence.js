import mongoose from 'mongoose';

/**
 * ML Collections for Intelligence Layer
 * Written by Python AI service, read by backend for dashboard/recommendations
 * 
 * Synchronization:
 * - Python service writes metrics to these collections via motor (async MongoDB driver)
 * - Backend reads and aggregates for dashboard/recommendations
 * - Index structures must match both sides for performance
 */

// ============================================
// MASTERY PROFILE COLLECTION
// ============================================
// Stores Bayesian Knowledge Tracing results
// Source: Python app/ml/mastery_engine.py

const TopicMasterySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    topicId: {
      type: String,
      required: true,
      index: true,
    },
    // Bayesian mastery probability 0-1
    mastery_probability: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.1, // P_INIT from BKT
    },
    confidence_score: {
      type: Number,
      min: 0,
      max: 1,
    },
    improvement_trend: {
      type: String,
      enum: ['improving', 'stable', 'declining'],
      default: 'stable',
    },
    attempts_count: Number,
    last_attempt_timestamp: Date,
    recommended_difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
    },
  },
  {
    timestamps: true,
    collection: 'topic_mastery'
  }
);

TopicMasterySchema.index({ userId: 1, topicId: 1 }, { unique: true });
TopicMasterySchema.index({ userId: 1, mastery_probability: -1 });

// ============================================
// RETENTION SCHEDULE COLLECTION
// ============================================
// Stores Spaced Repetition scheduling
// Source: Python app/ml/retention_model.py

const RevisionScheduleSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    topicId: {
      type: String,
      required: true,
      index: true,
    },
    // Ebbinghaus retention probability R(t) = exp(-t/S)
    retention_probability: {
      type: Number,
      min: 0,
      max: 1,
      default: 1.0,
    },
    // Stability value S in days (how resistant memory is to decay)
    stability_score: {
      type: Number,
      default: 3.0,
    },
    next_revision_date: Date,
    days_until_revision: Number,
    urgency_level: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
    },
    last_successful_revision: Date,
    last_failed_revision: Date,
  },
  {
    timestamps: true,
    collection: 'revision_schedule'
  }
);

RevisionScheduleSchema.index({ userId: 1, topicId: 1 }, { unique: true });
RevisionScheduleSchema.index({ userId: 1, next_revision_date: 1 });
RevisionScheduleSchema.index({ userId: 1, urgency_level: 1 });

// ============================================
// WEAKNESS SIGNALS COLLECTION
// ============================================
// Stores risk assessment and gap analysis
// Source: Python app/ml/weakness_detection.py

const WeakTopicSignalSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    topicId: {
      type: String,
      required: true,
      index: true,
    },
    // Aggregated risk score 0-100
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    // Individual risk components (0-1)
    mastery_gap: Number,
    retention_risk: Number,
    difficulty_gap: Number,
    consistency_score: Number,
    // Primary signal indicating weakness type
    signal_type: {
      type: String,
      enum: ['mastery_gap', 'retention_decay', 'performance_variance', 'general_weakness'],
    },
    recommendation: String,
    // Intervention priority across all weak topics (0-100)
    intervention_priority: Number,
  },
  {
    timestamps: true,
    collection: 'weak_topic_signal'
  }
);

WeakTopicSignalSchema.index({ userId: 1, topicId: 1 }, { unique: true });
WeakTopicSignalSchema.index({ userId: 1, riskScore: -1 });

// ============================================
// READINESS SCORE COLLECTION
// ============================================
// Stores interview readiness predictions
// Source: Python app/ml/readiness_model.py

const ReadinessScoreSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    targetCompany: {
      type: String,
      default: 'general',
    },
    // XGBoost readiness score 0-100
    readinessScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 1,
    },
    // Estimated probability of passing interview (0-1)
    passingProbability: {
      type: Number,
      min: 0,
      max: 1,
    },
    // Days until estimated readiness at score 80
    timeToReadinessDays: Number,
    predictedReadinessDate: Date,
    primaryGaps: [String], // Top weak topics
    modelUsed: {
      type: String,
      enum: ['xgboost', 'fallback_lgr'],
    },
  },
  {
    timestamps: true,
    collection: 'readiness_score'
  }
);

ReadinessScoreSchema.index({ userId: 1, targetCompany: 1 }, { unique: true });
ReadinessScoreSchema.index({ userId: 1, readinessScore: -1 });

// ============================================
// STUDY PLAN COLLECTION
// ============================================
// Adaptive daily study plans
// Source: Python app/ml/adaptive_planner.py

const AdaptiveStudyPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },
    planDate: {
      type: Date,
      required: true,
    },
    dailyMinutes: Number,
    focusTopics: [
      {
        topicId: String,
        priority: {
          type: String,
          enum: ['critical', 'high', 'medium', 'low'],
        },
        suggestedTime: Number, // minutes
      },
    ],
    estimatedCompletion: Date,
    adaptationReason: String,
    status: {
      type: String,
      enum: ['planned', 'in-progress', 'completed', 'adjusted'],
      default: 'planned',
    },
  },
  {
    timestamps: true,
    collection: 'adaptive_study_plan'
  }
);

AdaptiveStudyPlanSchema.index({ userId: 1, planDate: -1 });
AdaptiveStudyPlanSchema.index({ userId: 1, status: 1 });

// ============================================
// EXPORT MODELS
// ============================================

export const TopicMastery = mongoose.model('TopicMastery', TopicMasterySchema);
export const RevisionSchedule = mongoose.model('RevisionSchedule', RevisionScheduleSchema);
export const WeakTopicSignal = mongoose.model('WeakTopicSignal', WeakTopicSignalSchema);
export const ReadinessScore = mongoose.model('ReadinessScore', ReadinessScoreSchema);
export const AdaptiveStudyPlan = mongoose.model('AdaptiveStudyPlan', AdaptiveStudyPlanSchema);
