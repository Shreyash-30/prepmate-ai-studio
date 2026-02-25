/**
 * ML Feature Builder Service
 * 
 * Transforms MongoDB submission documents into ML-ready request payloads
 * Bridges backend storage schema with Python ML service expectations
 * 
 * Used by:
 * - Integration sync pipeline (after storing submissions)
 * - Dashboard/analytics (computing mastery, readiness)
 * - Adaptive planning endpoints
 */

import TopicMappingService from './topicMappingService.js';

class MLFeatureBuilder {
  /**
   * Build payload for Mastery Engine (Bayesian Knowledge Tracing)
   * 
   * Consumed by: POST /ai/ml/mastery/update
   * 
   * @param {object} submission - MongoDB ExternalPlatformSubmission doc
   * @param {string} learningLevel - Optional: "beginner", "intermediate", "advanced"
   * @returns {object} Mastery update request payload
   */
  static buildMasteryUpdatePayload(submission, learningLevel = 'intermediate') {
    return {
      user_id: submission.userId.toString(),
      topic_id: submission.primaryTopicId || 'misc',
      attempts: submission.attempts && submission.attempts.length > 0
        ? submission.attempts
        : TopicMappingService.buildInitialAttempts(submission),
      learning_level: learningLevel,
    };
  }

  /**
   * Build payload for Retention Model (Spaced Repetition)
   * 
   * Consumed by: POST /ai/ml/retention/update
   * 
   * @param {object} submission - MongoDB submission doc
   * @param {object} previousRetentionData - Optional: prior retention state
   * @returns {object} Retention update request payload
   */
  static buildRetentionUpdatePayload(submission, previousRetentionData = null) {
    // Determine if this submission represents successful revision
    const isSuccessfulRevision = submission.status === 'Accepted' || 
                                  submission.attempts?.some(a => a.correct);

    // Calculate time since last revision
    let timeSinceLastRevisionHours = 24; // Default 1 day

    if (previousRetentionData?.last_revision_timestamp) {
      const now = new Date();
      const lastRevision = new Date(previousRetentionData.last_revision_timestamp);
      timeSinceLastRevisionHours = (now - lastRevision) / (1000 * 60 * 60);
    }

    return {
      user_id: submission.userId.toString(),
      topic_id: submission.primaryTopicId || 'misc',
      is_successful_revision: isSuccessfulRevision,
      time_since_last_revision_hours: timeSinceLastRevisionHours,
      hints_used: submission.hintsUsed || 0,
      recall_speed_ms: submission.solveTime || submission.runtime_ms,
      initial_solve_time_ms: submission.initialSolveTime || null,
    };
  }

  /**
   * Build payload for Weakness Detection (Risk Scoring)
   * 
   * Consumed by: POST /ai/ml/weakness/analyze
   * 
   * Note: This typically runs on aggregated user data, not single submission
   * But can be called for update after new submission
   * 
   * @param {string} userId - User MongoDB ID
   * @param {boolean} includeContestData - Include contest ratings
   * @returns {object} Weakness analysis request
   */
  static buildWeaknessAnalysisPayload(userId, includeContestData = true) {
    return {
      user_id: userId.toString(),
      include_contest_data: includeContestData,
    };
  }

  /**
   * Build payload for Readiness Prediction (Interview Readiness)
   * 
   * Consumed by: POST /ai/ml/readiness/predict
   * 
   * @param {string} userId - User MongoDB ID
   * @param {string} targetCompany - Optional: company name
   * @returns {object} Readiness prediction request
   */
  static buildReadinessPredictionPayload(userId, targetCompany = null) {
    return {
      user_id: userId.toString(),
      target_company: targetCompany || 'general',
    };
  }

  /**
   * Build payload for Adaptive Planning
   * 
   * Consumed by: POST /ai/ml/planner/generate
   * 
   * @param {string} userId - User MongoDB ID
   * @param {object} options - { dailyMinutes, targetCompany, currentPhase }
   * @returns {object} Planning request
   */
  static buildPlanningPayload(userId, options = {}) {
    return {
      user_id: userId.toString(),
      daily_minutes: options.dailyMinutes || 120,
      target_company: options.targetCompany || 'general',
      current_phase: options.currentPhase || 'exploration',
    };
  }

  /**
   * Extract comprehensive feature vector from submission for analytics
   * 
   * Used by dashboard for displaying submission performance
   * 
   * @param {object} submission - MongoDB submission
   * @returns {object} Feature object
   */
  static extractFeatures(submission) {
    return {
      // Identifiers
      userId: submission.userId.toString(),
      problemId: submission.problemId,
      topicId: submission.primaryTopicId || 'misc',

      // Classification
      difficulty: submission.difficulty,
      difficultyLevel: submission.difficultyLevel,
      language: submission.language,

      // Performance
      runtime_ms: submission.runtime_ms || 0,
      memory_kb: submission.memory_kb || 0,
      
      // Correctness (from attempts)
      correct: submission.attempts?.[0]?.correct ?? true,
      attemptsCount: submission.attempts?.length ?? 1,

      // Temporal
      submissionTime: submission.submissionTime,
      
      // Metadata
      successType: submission.successType || 'unknown',
    };
  }

  /**
   * Build aggregated feature vector for user from submissions
   * 
   * Used by ML models for user-level predictions
   * 
   * @param {array} submissions - Array of MongoDB submissions
   * @returns {object} Aggregated features
   */
  static aggregateUserFeatures(submissions) {
    if (!submissions || submissions.length === 0) {
      return {
        totalSubmissions: 0,
        avgSuccessRate: 0,
        topicCount: 0,
        avgDifficultyLevel: 0,
        avgRuntime_ms: 0,
        avgMemory_kb: 0,
        easyCount: 0,
        mediumCount: 0,
        hardCount: 0,
      };
    }

    const totalSubmissions = submissions.length;
    const successCount = submissions.filter(s => 
      s.attempts?.some(a => a.correct) ?? s.status === 'Accepted'
    ).length;
    
    const avgSuccessRate = totalSubmissions > 0 
      ? successCount / totalSubmissions 
      : 0;

    const topicIds = new Set(submissions.map(s => s.primaryTopicId).filter(Boolean));
    
    const avgDifficultyLevel = submissions.length > 0
      ? submissions.reduce((sum, s) => sum + (s.difficultyLevel || 1), 0) / submissions.length
      : 0;

    const avgRuntime_ms = submissions.length > 0
      ? submissions.reduce((sum, s) => sum + (s.runtime_ms || 0), 0) / submissions.length
      : 0;

    const avgMemory_kb = submissions.length > 0
      ? submissions.reduce((sum, s) => sum + (s.memory_kb || 0), 0) / submissions.length
      : 0;

    const easyCount = submissions.filter(s => s.difficultyLevel === 1).length;
    const mediumCount = submissions.filter(s => s.difficultyLevel === 2).length;
    const hardCount = submissions.filter(s => s.difficultyLevel === 3).length;

    return {
      totalSubmissions,
      successRate: avgSuccessRate,
      topicCount: topicIds.size,
      avgDifficultyLevel,
      avgRuntime_ms,
      avgMemory_kb,
      easyCount,
      mediumCount,
      hardCount,
    };
  }

  /**
   * Validate submission has all required ML fields
   * Returns list of missing fields if any
   * 
   * @param {object} submission - Submission to validate
   * @returns {array} Empty if valid, array of missing fields otherwise
   */
  static validateMLReadiness(submission) {
    const required = [
      'userId',
      'problemId',
      'primaryTopicId',
      'difficultyLevel',
      'attempts',
      'runtime_ms',
      'memory_kb',
    ];

    const missing = required.filter(field => {
      const value = submission[field];
      return value === null || value === undefined || 
             (Array.isArray(value) && value.length === 0);
    });

    return missing;
  }
}

export default MLFeatureBuilder;
