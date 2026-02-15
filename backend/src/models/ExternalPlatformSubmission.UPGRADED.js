import mongoose from 'mongoose';

/**
 * UPGRADED SCHEMA FOR ML/LLM COMPATIBILITY
 * 
 * Extends the original ExternalPlatformSubmission with:
 * - ML-ready performance fields (attempts[], difficultyLevel, runtime_ms, memory_kb)
 * - Topic classification (primaryTopicId, secondaryTopics)
 * - Attempt history tracking for Bayesian Knowledge Tracing
 * 
 * BACKWARD COMPATIBLE: Legacy fields remain, new fields are optional/defaulted
 * MIGRATION: See database/migrations/001_upgrade_submissions.js
 */

const ExternalPlatformSubmissionSchema = new mongoose.Schema(
  {
    // ============================================
    // EXISTING FIELDS (kept for compatibility)
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
      type: String, // Original: "1000 ms"
    },
    memory: {
      type: String, // Original: "50 MB"
    },
    submissionTime: {
      type: Date,
    },

    // ============================================
    // NEW ML-READY FIELDS (for ML Intelligence Layer)
    // ============================================

    /**
     * Numeric mapping of difficulty for ML models
     * Easy=1, Medium=2, Hard=3
     * Computed during migration and submission sync
     */
    difficultyLevel: {
      type: Number,
      enum: [1, 2, 3, 0],
      default: 0, // 0 = unknown
    },

    /**
     * Primary topic classification derived from tags
     * Examples: "arrays", "graphs", "dynamic_programming", "linked_lists", etc.
     * 
     * Computed by topicMappingService after sync
     * Used for aggregating performance by topic
     */
    primaryTopicId: {
      type: String,
      sparse: true,
      index: true,
    },

    /**
     * Secondary topics (if problem spans multiple domains)
     * Example: ["arrays", "sorting"] for a merge-sort problem
     */
    secondaryTopics: [
      {
        type: String,
      },
    ],

    /**
     * ML-ready attempt history
     * 
     * Used by Mastery Engine (Bayesian Knowledge Tracing) to compute skill mastery
     * Structure matches ml/mastery_engine.py expectations
     * 
     * If attempts[] is empty, populate with defaults during migration/first access
     */
    attempts: [
      {
        // Whether solution was correct on this attempt
        correct: {
          type: Boolean,
          default: true, // For accepted submissions, first attempt is correct
        },
        // Difficulty level 1-3 for this attempt
        difficulty: {
          type: Number,
          default: 1,
        },
        // Total runtime in milliseconds (parsed from runtime string)
        time_ms: {
          type: Number,
          default: 0,
        },
        // Number of hints used during attempt (0 if none)
        hints_used: {
          type: Number,
          default: 0,
        },
        // When this attempt happened
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    /**
     * Parsed runtime in milliseconds (numeric for ML models)
     * Extracted from runtime string like "1000 ms" → 1000
     * 
     * Used for:
     * - Time complexity analysis
     * - Consistency scoring (how consistent is execution time?)
     */
    runtime_ms: {
      type: Number,
      default: 0,
    },

    /**
     * Parsed memory in kilobytes (numeric for ML models)
     * Extracted from memory string like "50 MB" → 51200
     * 
     * Used for:
     * - Space complexity scoring
     * - Efficiency metrics
     */
    memory_kb: {
      type: Number,
      default: 0,
    },

    /**
     * SUCCESS_TYPE: 'first_try' | 'multiple_attempts' | 'after_hints'
     * Used by LLM review service to provide contextual feedback
     */
    successType: {
      type: String,
      enum: ['first_try', 'multiple_attempts', 'after_hints', 'unknown'],
      default: 'unknown',
    },

    /**
     * ML processing metadata
     * Tracks which ML models have processed this submission
     */
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

// Composite index for user-platform queries
ExternalPlatformSubmissionSchema.index({ userId: 1, platform: 1 });

// Index for platformSubmissionId to ensure uniqueness per user-platform
ExternalPlatformSubmissionSchema.index(
  { userId: 1, platform: 1, platformSubmissionId: 1 },
  { unique: true }
);

// NEW INDEX: For ML topic-based aggregations
// Query pattern: "Get all submissions for user in topic X"
ExternalPlatformSubmissionSchema.index({ userId: 1, primaryTopicId: 1 });

// NEW INDEX: For reverse lookups (all submissions by problem)
ExternalPlatformSubmissionSchema.index({ userId: 1, problemId: 1 });

// NEW INDEX: For time-based queries (recent submissions)
ExternalPlatformSubmissionSchema.index({ userId: 1, submissionTime: -1 });

// Sparse index for difficulty progression analysis
ExternalPlatformSubmissionSchema.index({ userId: 1, difficultyLevel: 1 }, { sparse: true });

export default mongoose.model('ExternalPlatformSubmission', ExternalPlatformSubmissionSchema);
