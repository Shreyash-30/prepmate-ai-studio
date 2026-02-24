/**
 * QuestionBank Model
 * 
 * Central repository for coding problems with metadata, hints, and content
 * Sources: LeetCode, CodeForces (extensible)
 * 
 * Used by:
 * - Adaptive Practice Engine for recommendations
 * - AI Practice Lab for problem selection
 * - Question filtering and search
 */

import mongoose from 'mongoose';

const questionBankSchema = new mongoose.Schema(
  {
    // Problem Identity
    problemId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
      description: 'Unique problem identifier (e.g., "two-sum" from LeetCode)',
    },

    title: {
      type: String,
      required: true,
      trim: true,
      description: 'Problem title (e.g., "Two Sum")',
    },

    titleSlug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      description: 'URL-friendly slug for problem',
    },

    // Problem Metadata
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true,
      index: true,
      description: 'Problem difficulty level',
    },

    topicTags: [
      {
        type: String,
        trim: true,
        description: 'Tags like "array", "dynamic-programming", etc',
      },
    ],

    normalizedTopics: [
      {
        type: String,
        index: true,
        description: 'Normalized topic IDs (e.g., "arrays", "dynamic_programming")',
      },
    ],

    // Problem Content
    content: {
      type: String,
      description: 'Problem statement/description',
    },

    hints: [
      {
        type: String,
        description: 'List of hints for the problem',
      },
    ],

    exampleCases: [
      {
        input: String,
        output: String,
        explanation: String,
      },
    ],

    // ============================================================
    // LEETCODE-STYLE FUNCTION METADATA (NEW FIELDS)
    // ============================================================

    // Function metadata for structured execution
    functionMetadata: {
      type: mongoose.Schema.Types.Mixed,  // ✅ FIXED: Allow flexible object structure
      default: null,
      description: '{functionName: string, parameters: [{name: string, type: string}], returnType: string}',
    },

    // Starter code templates for each language
    starterCode: {
      javascript: String,
      python: String,
      java: String,
      cpp: String,
      csharp: String,
      go: String,
      rust: String,
      typescript: String,
    },

    // Code wrapper templates for execution (CRITICAL)
    wrapperTemplate: {
      javascript: String,
      python: String,
      java: String,
      cpp: String,
      csharp: String,
      go: String,
      rust: String,
      typescript: String,
    },

    // Structured test cases with visibility
    testCasesStructured: [
      {
        input: mongoose.Schema.Types.Mixed,  // JSON object
        expectedOutput: mongoose.Schema.Types.Mixed,  // JSON value/object
        visibility: {
          type: String,
          enum: ['public', 'hidden'],
          required: true,
        },
        _id: false,
      },
    ],

    // Problem constraints
    constraints: {
      type: String,
      description: 'Input/output constraints (e.g., "1 <= n <= 1000")',
    },

    // Schema version (REQUIRED: v2 only, wrapped execution)
    schemaVersion: {
      type: Number,
      required: true,
      enum: [2],  // ENFORCE: Only v2 (LeetCode-style structured execution)
      default: 2,
      description: 'Schema version - ONLY 2 (wrapped execution) supported',
    },

    // Source Information
    source: {
      type: String,
      enum: ['leetcode', 'codeforces', 'other'],
      required: true,
      index: true,
      default: 'leetcode',
    },

    sourceUrl: {
      type: String,
      description: 'Link to original problem on platform',
    },

    sourceId: {
      type: String,
      description: 'ID from original platform',
    },

    // Problem Statistics
    acceptanceRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
      description: 'Acceptance rate percentage from platform',
    },

    submissionCount: {
      type: Number,
      default: 0,
      description: 'Total submissions on platform',
    },

    // Metadata
    isPremium: {
      type: Boolean,
      default: false,
    },

    relatedProblems: [
      {
        type: String,
        description: 'Related problem IDs',
      },
    ],

    lastFetchedAt: {
      type: Date,
      default: Date.now,
      description: 'When metadata was last synced from source',
    },

    contentVersion: {
      type: Number,
      default: 1,
      description: 'Version of fetched content',
    },

    // Admin flags
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isRecommended: {
      type: Boolean,
      default: false,
      index: true,
      description: 'Marked for adaptive recommendations',
    },
  },
  {
    timestamps: true,
    collection: 'question_bank',
  }
);

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

// Composite indexes for common queries
questionBankSchema.index({ difficulty: 1, isActive: 1 });
questionBankSchema.index({ normalizedTopics: 1, difficulty: 1 });
questionBankSchema.index({ source: 1, sourceId: 1 }, { unique: true, sparse: true });
questionBankSchema.index({ createdAt: -1 });
questionBankSchema.index({ lastFetchedAt: -1 });

/**
 * Static Methods
 */

questionBankSchema.statics.findByTopicAndDifficulty = function (topics, difficulty) {
  return this.find({
    normalizedTopics: { $in: topics },
    difficulty: difficulty,
    isActive: true,
  }).limit(10);
};

questionBankSchema.statics.findByProblemId = function (problemId) {
  return this.findOne({
    problemId: problemId.toLowerCase(),
    isActive: true,
  });
};

questionBankSchema.statics.findByTitleSlug = function (titleSlug) {
  return this.findOne({
    titleSlug: titleSlug.toLowerCase(),
    isActive: true,
  });
};

questionBankSchema.statics.getRecommendedProblems = function (topics, difficulty, limit = 5) {
  return this.find({
    normalizedTopics: { $in: topics },
    difficulty: difficulty,
    isRecommended: true,
    isActive: true,
  })
    .limit(limit)
    .sort({ createdAt: -1 });
};

// Instance method to fetch content if missing
questionBankSchema.methods.ensureContentLoaded = function () {
  if (!this.content || !this.content.trim()) {
    return false;
  }
  return true;
};

// ============================================
// VALIDATION HOOKS - ENFORCE WRAPPED EXECUTION
// ============================================

// Pre-save validation: Ensure all required wrapped execution fields exist
questionBankSchema.pre('save', function (next) {
  // ENFORCE: schemaVersion must be 2
  if (this.schemaVersion !== 2) {
    return next(new Error(
      `❌ HARD FAIL: Only schemaVersion 2 (wrapped execution) supported. Got: ${this.schemaVersion}`
    ));
  }

  // ENFORCE: wrapperTemplate must exist and have at least python
  if (!this.wrapperTemplate) {
    return next(new Error('❌ HARD FAIL: wrapperTemplate is required for wrapped execution'));
  }

  if (!this.wrapperTemplate.python) {
    return next(new Error('❌ HARD FAIL: wrapperTemplate.python is required'));
  }

  // ENFORCE: wrapper must contain __USER_CODE__ placeholder
  const pythonWrapper = this.wrapperTemplate.python;
  if (!pythonWrapper.includes('__USER_CODE__')) {
    return next(new Error('❌ HARD FAIL: wrapperTemplate must contain __USER_CODE__ placeholder'));
  }

  // ENFORCE: starterCode must exist and have at least python
  if (!this.starterCode) {
    return next(new Error('❌ HARD FAIL: starterCode is required for wrapped execution'));
  }

  if (!this.starterCode.python) {
    return next(new Error('❌ HARD FAIL: starterCode.python is required'));
  }

  // ENFORCE: testCasesStructured must exist and not be empty
  if (!Array.isArray(this.testCasesStructured) || this.testCasesStructured.length === 0) {
    return next(new Error('❌ HARD FAIL: testCasesStructured must exist and have at least 1 test case'));
  }

  // ENFORCE: Each test case must have input, expectedOutput, and visibility
  for (const tc of this.testCasesStructured) {
    if (tc.input === undefined || tc.input === null) {
      return next(new Error('❌ HARD FAIL: Each testCase.input is required'));
    }
    if (tc.expectedOutput === undefined || tc.expectedOutput === null) {
      return next(new Error('❌ HARD FAIL: Each testCase.expectedOutput is required'));
    }
    if (!['public', 'hidden'].includes(tc.visibility)) {
      return next(new Error(`❌ HARD FAIL: testCase.visibility must be 'public' or 'hidden', got: ${tc.visibility}`));
    }
  }

  // ENFORCE: functionMetadata must exist
  if (!this.functionMetadata) {
    return next(new Error('❌ HARD FAIL: functionMetadata is required for wrapped execution'));
  }

  next();
});

export default mongoose.model('QuestionBank', questionBankSchema);
