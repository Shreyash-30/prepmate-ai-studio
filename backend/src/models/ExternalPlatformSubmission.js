import mongoose from 'mongoose';

/**
 * UPGRADED SCHEMA FOR ML/LLM COMPATIBILITY
 * 
 * Extends the original with ML-ready performance fields and topic classification
 * New fields: difficultyLevel, primaryTopicId, attempts[], runtime_ms, memory_kb
 * 
 * BACKWARD COMPATIBLE: Legacy fields remain, new fields optional/defaulted
 * MIGRATION: See database/migrations/001_upgrade_submissions.js
 */
const ExternalPlatformSubmissionSchema = new mongoose.Schema(
  {
    // ============================================
    // EXISTING FIELDS
    // ============================================
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    platform: {
      type: String,
      enum: ['leetcode', 'codeforces'],
      required: true,
      index: true,
    },
    platformSubmissionId: {
      type: String,
      required: true,
    },
    problemId: {
      type: String,
      required: true,
      index: true,
    },
    problemTitle: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard', 'Unknown'],
      default: 'Unknown',
    },
    tags: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      required: true,
    },
    language: {
      type: String,
    },
    runtime: {
      type: String,
    },
    memory: {
      type: String,
    },
    submissionTime: {
      type: Date,
    },

    // ============================================
    // NEW ML-READY FIELDS (ML Intelligence Layer)
    // ============================================
    
    // Numeric mapping: Easy=1, Medium=2, Hard=3, Unknown=0
    difficultyLevel: {
      type: Number,
      enum: [1, 2, 3, 0],
      default: 0,
    },

    // Primary topic ID derived from tags (e.g., "arrays", "graphs", "dynamic_programming")
    // Used for aggregating performance by topic for mastery calculations
    primaryTopicId: {
      type: String,
      sparse: true,
      index: true,
    },

    // Secondary topics if problem spans multiple domains
    secondaryTopics: [
      {
        type: String,
      },
    ],

    // Attempt history for Bayesian Knowledge Tracing
    // Structure matches ml/mastery_engine.py requirements
    attempts: [
      {
        correct: {
          type: Boolean,
          default: true,
        },
        difficulty: {
          type: Number,
          default: 1,
        },
        time_ms: {
          type: Number,
          default: 0,
        },
        hints_used: {
          type: Number,
          default: 0,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Parsed runtime in milliseconds (numeric for ML consistency scoring)
    runtime_ms: {
      type: Number,
      default: 0,
    },

    // Parsed memory in kilobytes (numeric for ML efficiency analysis)
    memory_kb: {
      type: Number,
      default: 0,
    },

    // Success pattern: used by LLM review service for contextual feedback
    successType: {
      type: String,
      enum: ['first_try', 'multiple_attempts', 'after_hints', 'unknown'],
      default: 'unknown',
    },

    // ML processing tracking
    mlProcessing: {
      masteryUpdatedAt: Date,
      retentionUpdatedAt: Date,
      weaknessAnalyzedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

// Original indexes (kept for compatibility)
ExternalPlatformSubmissionSchema.index({ userId: 1, platform: 1 });
ExternalPlatformSubmissionSchema.index(
  { userId: 1, platform: 1, platformSubmissionId: 1 },
  { unique: true }
);

// NEW INDEXES: For ML aggregations
ExternalPlatformSubmissionSchema.index({ userId: 1, primaryTopicId: 1 });
ExternalPlatformSubmissionSchema.index({ userId: 1, problemId: 1 });
ExternalPlatformSubmissionSchema.index({ userId: 1, submissionTime: -1 });
ExternalPlatformSubmissionSchema.index({ userId: 1, difficultyLevel: 1 }, { sparse: true });

export default mongoose.model('ExternalPlatformSubmission', ExternalPlatformSubmissionSchema);
