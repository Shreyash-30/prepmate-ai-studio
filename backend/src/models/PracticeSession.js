/**
 * PracticeSession Model
 * 
 * Tracks individual practice sessions with:
 * - Idempotent submission keys
 * - LLM usage and cost governance
 * - Async ML job references
 * - Telemetry data points
 * - Session recovery for tab refreshes
 */

import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const practiceSessionSchema = new mongoose.Schema(
  {
    // Core Session
    userId: {
      type: String, // Flexible: support both MongoDB ObjectIds and string IDs for demo users
      required: true,
      index: true,
    },
    topicId: {
      type: String,
      required: true,
      index: true,
    },
    problemId: {
      type: String, // Accept string IDs (problem identifier, not database reference)
      required: false,
    },
    // ✅ ADD: Problem metadata for AI service requests
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium',
    },
    problemStatement: {
      type: String,
      default: '',
      description: 'Full problem description/statement',
    },
    constraints: {
      type: [String],
      default: [],
    },
    sessionKey: {
      type: String,
      default: () => uuidv4(),
      unique: true,
    },

    // Idempotency
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
    submissionAttempt: {
      type: Number,
      default: 0,
    },

    // Session State
    status: {
      type: String,
      enum: ['active', 'submitted', 'completed', 'abandoned'],
      default: 'active',
    },
    sessionVersion: {
      type: Number,
      default: 1,
    },

    // Code & Solution
    code: {
      type: String,
      default: '',
    },
    codeLanguage: {
      type: String,
      default: 'javascript',
    },
    explanation: {
      type: String,
      default: '',
    },
    voiceInteractions: [
      {
        transcript: String,
        response: String,
        intent: {
          type: String,
          enum: ['clarification', 'hint', 'solution-seeking', 'optimization', 'confusion', 'general'],
          default: 'general',
        },
        dependencyWeight: {
          type: Number,
          default: 0,
        },
        tokenUsage: {
          type: Number,
          default: 0,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      }
    ],

    // Test Cases (may be provided on session creation or fetched from problem)
    // For wrapped execution: { input: Object, expectedOutput: Object, visibility: String }
    // For legacy: { input: String, expectedOutput: String, visibility: String }
    testCases: [
      {
        input: mongoose.Schema.Types.Mixed, // Can be string (legacy) or object (wrapped)
        expectedOutput: mongoose.Schema.Types.Mixed, // Can be string (legacy) or object (wrapped)
        output: mongoose.Schema.Types.Mixed, // Alias for expectedOutput
        visibility: {
          type: String,
          enum: ['public', 'hidden'],
          default: 'public',
        },
      },
    ],

    // ✅ WRAPPED EXECUTION FIELDS (LeetCode-style)
    // Populated from GeneratedQuestionLog or QuestionBank when session starts
    wrapperTemplate: {
      type: mongoose.Schema.Types.Mixed, // { javascript: "...", python: "...", java: "..." }
      default: null,
    },
    starterCode: {
      type: mongoose.Schema.Types.Mixed, // { javascript: "...", python: "...", java: "..." }
      default: null,
    },
    functionMetadata: {
      type: mongoose.Schema.Types.Mixed, // { functionName, parameters, returnType }
      default: null,
    },
    schemaVersion: {
      type: Number,
      default: 1, // 1 = legacy (stdin), 2 = wrapped (LeetCode-style)
    },
    isLegacy: {
      type: Boolean,
      default: true, // true = old stdin format, false = new wrapped format
    },

    // Submission Result (populated after judging)
    submissionResult: {
      verdict: {
        type: String,
        enum: ['pending', 'accepted', 'wrong_answer', 'runtime_error', 'time_limit_exceeded', 'memory_limit_exceeded'],
        default: 'pending',
      },
      passedTests: {
        type: Number,
        default: 0,
      },
      totalTests: {
        type: Number,
        default: 0,
      },
      executionTime: {
        type: Number, // milliseconds
      },
      memoryUsed: {
        type: Number, // MB
      },
      error: String,
    },

    // Submission Metadata (idempotency & judge details)
    submissionMetadata: {
      idempotencyKey: {
        type: String,
        index: true,
        sparse: true,
      },
      submittedAt: Date,
      judge0Results: [
        {
          input: String,
          expectedOutput: String,
          actualOutput: String,
          status: String,
          time: Number,
          memory: Number,
          processStatus: String,
          errorOutput: String,
          passedTest: Boolean,
        },
      ],
      mlJobIds: [String],
    },

    // LLM Usage & Cost Governance
    llmUsageTokens: {
      hintTokens: {
        type: Number,
        default: 0,
      },
      reviewTokens: {
        type: Number,
        default: 0,
      },
      explanationTokens: {
        type: Number,
        default: 0,
      },
      inlineAssistTokens: {
        type: Number,
        default: 0,
      },
      totalTokens: {
        type: Number,
        default: 0,
      },
    },
    llmCostEstimate: {
      hintCost: {
        type: Number,
        default: 0,
      },
      reviewCost: {
        type: Number,
        default: 0,
      },
      explanationCost: {
        type: Number,
        default: 0,
      },
      inlineAssistCost: {
        type: Number,
        default: 0,
      },
      totalEstimatedCost: {
        type: Number,
        default: 0,
      },
    },

    // Cost Governance Counters
    costGovernance: {
      hintCallCount: {
        type: Number,
        default: 0,
      },
      llmCallCount: {
        type: Number,
        default: 0,
      },
      maxHintCalls: {
        type: Number,
        default: 5,
      },
      maxLLMCalls: {
        type: Number,
        default: 20,
      },
      maxTokensAllowed: {
        type: Number,
        default: 10000,
      },
      costThreshold: {
        type: Number,
        default: 2.0, // $2.00
      },
    },

    // LLM Model Version
    modelVersionUsed: {
      provider: {
        type: String,
        enum: ['gemini', 'groq', 'together', 'fallback'],
        default: 'groq',
      },
      modelName: {
        type: String,
        default: 'llama-3.3-70b-versatile',
      },
      versionTimestamp: {
        type: Date,
        default: () => new Date(),
      },
    },

    // Async ML Job References
    mlJobReferences: {
      masteryUpdateJobId: String,
      retentionUpdateJobId: String,
      weaknessAnalysisJobId: String,
      readinessPredictionJobId: String,
    },

    // Hint History
    hints: [
      {
        level: Number,
        text: String,
        dependencyWeight: Number,
        requestedAt: {
          type: Date,
          default: () => new Date(),
        },
        tokensUsed: Number,
      },
    ],

    // Code Review (populated after review endpoint)
    codeReview: {
      reviewSummary: String,
      codeQualityScores: {
        readability: Number,
        structure: Number,
        naming: Number,
        errorHandling: Number,
        optimization: Number,
      },
      interviewInsights: String,
      reviewed: Boolean,
    },

    // Explanation Scoring
    explanationScore: {
      clarity: Number,
      correctness: Number,
      structure: Number,
      interview_readiness: Number,
      explanation_quality_score: Number,
      scored: Boolean,
    },

    // Telemetry
    telemetry: {
      solve_time: Number, // seconds
      time_to_first_code: Number, // seconds
      retry_count: {
        type: Number,
        default: 0,
      },
      hint_levels_used: {
        type: Number,
        default: 0,
      },
      voice_interaction_count: {
        type: Number,
        default: 0,
      },
      voice_dependency_weight_avg: {
        type: Number,
        default: 0,
      },
      voice_solution_ratio: {
        type: Number,
        default: 0,
      },
      strategy_change_count: {
        type: Number,
        default: 0,
      },
      typing_speed_variance: Number,
      backspace_ratio: Number,
      brute_force_flag: {
        type: Boolean,
        default: false,
      },
      optimized_solution_flag: {
        type: Boolean,
        default: false,
      },
      explanation_quality_score: {
        type: Number,
        default: 0,
      },
      independence_score: {
        type: Number,
        default: 1.0,
      },
      hint_dependency_ratio: {
        type: Number,
        default: 0,
      },
    },

    // Dependency Scoring
    dependencyScore: {
      hintDependency: Number, // (hintLevelsUsed / 4) * 0.5
      voiceDependency: Number, // voiceSolutionRatio * 0.3
      retryDependency: Number, // retryRate * 0.2
      totalDependencyScore: Number, // sum above
      independenceScore: Number, // 1 - dependencyScore
    },

    // Next Problem Recommendation
    recommendedNextProblem: {
      problemId: mongoose.Schema.Types.ObjectId,
      expectedLearningGain: Number,
      reason: String,
    },

    // Timestamps
    startedAt: {
      type: Date,
      default: () => new Date(),
    },
    submittedAt: Date,
    completedAt: Date,
    lastActivityAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

// Indexes for performance
practiceSessionSchema.index({ userId: 1, topicId: 1 });
practiceSessionSchema.index({ userId: 1, status: 1 });
practiceSessionSchema.index({ sessionKey: 1 });
practiceSessionSchema.index({ lastActivityAt: 1 });

/**
 * Compute effective learning score accounting for independence
 */
practiceSessionSchema.methods.computeEffectiveLearning = function (baseMastery) {
  const independenceScore = this.dependencyScore?.independenceScore || 1.0;
  return baseMastery * independenceScore;
};

/**
 * Check if hint limit exceeded
 */
practiceSessionSchema.methods.canRequestHint = function () {
  return (
    this.costGovernance.hintCallCount < this.costGovernance.maxHintCalls &&
    this.llmUsageTokens.totalTokens < this.costGovernance.maxTokensAllowed &&
    this.llmCostEstimate.totalEstimatedCost < this.costGovernance.costThreshold
  );
};

/**
 * Check if LLM call limit exceeded
 */
practiceSessionSchema.methods.canMakeLLMCall = function () {
  return (
    this.costGovernance.llmCallCount < this.costGovernance.maxLLMCalls &&
    this.llmUsageTokens.totalTokens < this.costGovernance.maxTokensAllowed &&
    this.llmCostEstimate.totalEstimatedCost < this.costGovernance.costThreshold
  );
};

/**
 * Check if session is active and recoverable
 */
practiceSessionSchema.methods.isRecoverable = function () {
  const inactivityThreshold = 30 * 60 * 1000; // 30 minutes
  const timeSinceLastActivity = Date.now() - this.lastActivityAt.getTime();
  return this.status === 'active' && timeSinceLastActivity < inactivityThreshold;
};

/**
 * Update telemetry batch
 */
practiceSessionSchema.methods.updateTelemetry = function (telemetryData) {
  Object.assign(this.telemetry, telemetryData);
  this.lastActivityAt = new Date();
};

/**
 * Add hint and track cost
 */
practiceSessionSchema.methods.addHint = function (level, text, tokensUsed, cost) {
  this.hints.push({
    level,
    text,
    tokensUsed,
    requestedAt: new Date(),
  });
  this.costGovernance.hintCallCount += 1;
  this.llmUsageTokens.hintTokens += tokensUsed;
  this.llmUsageTokens.totalTokens += tokensUsed;
  this.llmCostEstimate.hintCost += cost;
  this.llmCostEstimate.totalEstimatedCost += cost;
  this.telemetry.hint_levels_used = Math.max(this.telemetry.hint_levels_used || 0, level);
};

/**
 * Compute dependency score based on telemetry
 */
practiceSessionSchema.methods.computeDependencyScore = function () {
  const hintDependency = (Math.min(this.telemetry.hint_levels_used || 0, 4) / 4) * 0.5;
  
  // Voice dependency: influenced by average weight of voice interactions
  const voiceWeight = this.telemetry.voice_dependency_weight_avg || 0;
  const voiceFrequency = Math.min((this.telemetry.voice_interaction_count || 0) / 10, 1);
  const voiceDependency = (voiceWeight * 0.7 + (this.telemetry.voice_solution_ratio || 0) * 0.3) * voiceFrequency * 0.4;

  const retryRate = this.telemetry.retry_count > 0 ? Math.min(this.telemetry.retry_count / 10, 1) : 0;
  const retryDependency = retryRate * 0.1;

  const totalDependencyScore = Math.min(1.0, hintDependency + voiceDependency + retryDependency);
  const independenceScore = Math.max(0, Math.min(1, 1 - totalDependencyScore));

  this.dependencyScore = {
    hintDependency,
    voiceDependency,
    retryDependency,
    totalDependencyScore,
    independenceScore,
  };

  this.telemetry.independence_score = independenceScore;
  this.telemetry.hint_dependency_ratio = hintDependency;
};

const PracticeSession = mongoose.model('PracticeSession', practiceSessionSchema);

export default PracticeSession;
