/**
 * Enhanced Integration Bootstrap Service
 * 
 * Extends integrationBootstrapService with ML intelligence:
 * - Topic classification using TopicMappingService
 * - ML feature enrichment using MLFeatureBuilder
 * - Submission event pipeline to Python ML services
 * 
 * FLOW:
 * 1. Fetch submissions from LeetCode/Codeforces
 * 2. Enrich each submission with topic mapping
 * 3. Initialize ML features (runtime_ms, memory_kb, attempts[], etc.)
 * 4. Store enriched submission in MongoDB
 * 5. Queue ML update events (mastery, retention, weakness)
 * 6. Trigger ML service calls asynchronously
 */

import ExternalPlatformSubmission from '../models/ExternalPlatformSubmission.js';
import { TopicMastery, RevisionSchedule, WeakTopicSignal, ReadinessScore } from '../models/MLIntelligence.js';
import User from '../models/User.js';
import TopicMappingService from './topicMappingService.js';
import UserTopicProgression from '../models/UserTopicProgression.js';
import MLFeatureBuilder from './mlFeatureBuilder.js';
import axios from 'axios';
import logger from '../utils/logger.js'; // Adjust path as needed

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
const ENABLE_ML_PIPELINE = process.env.ENABLE_ML_PIPELINE !== 'false'; // Default enabled

class EnhancedSubmissionProcessor {
  /**
   * Process a single submission with ML enrichment
   * Called after submission is fetched from external platform
   * 
   * @param {object} rawSubmission - Raw submission from LeetCode API
   * @param {string} userId - User MongoDB ID
   * @param {string} platform - Platform name
   * @returns {object} Processed submission document ready for MongoDB
   */
  static enrichSubmission(rawSubmission, userId, platform) {
    // Step 1: Enrich with topic mapping
    const topicEnriched = TopicMappingService.enrichSubmission(rawSubmission);

    // Step 2: Parse numeric values
    const runtime_ms = TopicMappingService.parseRuntime(rawSubmission.runtime);
    const memory_kb = TopicMappingService.parseMemory(rawSubmission.memory);

    // Step 3: Build initial attempts array
    const attempts = TopicMappingService.buildInitialAttempts({
      ...rawSubmission,
      difficultyLevel: topicEnriched.difficultyLevel,
      runtime: rawSubmission.runtime,
    });

    // Step 4: Combine into enriched document
    const enrichedSubmission = {
      ...topicEnriched,
      userId,
      platform,
      runtime_ms,
      memory_kb,
      attempts,
      successType: this.inferSuccessType(rawSubmission),
      mlProcessing: {
        masteryUpdatedAt: null,
        retentionUpdatedAt: null,
        weaknessAnalyzedAt: null,
      },
    };

    return enrichedSubmission;
  }

  /**
   * Infer submission success type
   * @param {object} submission - Submission
   * @returns {string} Success type
   */
  static inferSuccessType(submission) {
    // For LeetCode, if it's stored, it's accepted
    if (submission.status === 'Accepted' || submission.status === 'accepted') {
      return 'first_try'; // Conservative: assume first try if we don't have attempt history
    }
    return 'unknown';
  }

  /**
   * Queue ML update events for newly stored submission
   * 
   * This function triggers asynchronous calls to ML services
   * Does NOT block the submission storage process
   * 
   * @param {object} submission - MongoDB submission document (after save)
   * @param {object} user - User document
   */
  static async queueMLUpdates(submission, user) {
    if (!ENABLE_ML_PIPELINE) {
      logger?.info('ML pipeline disabled, skipping ML service calls');
      return;
    }

    try {
      // Queue mastery update
      this.callMLService('mastery', submission, user).catch(error => {
        logger?.error(`Mastery update failed for submission ${submission._id}:`, error.message);
      });

      // Queue retention update
      this.callMLService('retention', submission, user).catch(error => {
        logger?.error(`Retention update failed for submission ${submission._id}:`, error.message);
      });

      // Queue weakness analysis (runs less frequently, so optional here)
      // this.callMLService('weakness', submission, user);

      logger?.info(`ML updates queued for submission ${submission._id}`);
    } catch (error) {
      logger?.error('Error queuing ML updates:', error);
      // Don't throw - ML pipeline is optional, should not block submission storage
    }
  }

  /**
   * Call specific ML service with enriched submission data
   * 
   * @param {string} service - Service name: 'mastery', 'retention', 'weakness'
   * @param {object} submission - MongoDB submission
   * @param {object} user - User document
   */
  static async callMLService(service, submission, user) {
    try {
      let payload;

      switch (service) {
        case 'mastery':
          payload = MLFeatureBuilder.buildMasteryUpdatePayload(
            submission,
            user?.learningLevel || 'intermediate'
          );
          return await axios.post(`${ML_SERVICE_URL}/ai/ml/mastery/update`, payload, {
            timeout: 45000,
          }).then(async (response) => {
            if (response.data?.success && response.data?.data) {
              const data = response.data.data;
              // Update detailed progression record
              await UserTopicProgression.findOneAndUpdate(
                { userId: submission.userId, topicId: submission.primaryTopicId || 'misc' },
                {
                  $set: {
                    masteryScore: data.mastery_probability * 100, // 0-100 scale for UI
                    currentDifficultyLevel: data.recommended_difficulty 
                      ? data.recommended_difficulty.charAt(0).toUpperCase() + data.recommended_difficulty.slice(1).toLowerCase() 
                      : 'Medium',
                    totalAttempts: data.attempts_count,
                    lastEvaluatedAt: new Date(),
                    lastAttemptAt: new Date(),
                  },
                  $inc: { successfulAttempts: submission.status === 'Accepted' || submission.status === 'accepted' ? 1 : 0 }
                },
                { upsert: true, new: true }
              );

              // Update the ML service's native tracking collection (used by dashboard)
              await TopicMastery.findOneAndUpdate(
                { userId: submission.userId, topicId: submission.primaryTopicId || 'misc' },
                {
                  $set: {
                    mastery_probability: data.mastery_probability,
                    attempts_count: data.attempts_count,
                    recommended_difficulty: data.recommended_difficulty || 'medium',
                    confidence_score: data.confidence_score || 0.5,
                    last_attempt_timestamp: new Date()
                  }
                },
                { upsert: true }
              );
            }
            return response;
          });

        case 'retention':
          // Get prior retention data if exists
          const priorRetention = await RevisionSchedule.findOne({
            userId: submission.userId,
            topicId: submission.primaryTopicId,
          });

          payload = MLFeatureBuilder.buildRetentionUpdatePayload(submission, priorRetention);
          return await axios.post(`${ML_SERVICE_URL}/ai/ml/retention/update`, payload, {
            timeout: 45000,
          });

        case 'weakness':
          payload = MLFeatureBuilder.buildWeaknessAnalysisPayload(submission.userId);
          return await axios.post(`${ML_SERVICE_URL}/ai/ml/weakness/analyze`, payload, {
            timeout: 60000,
          });

        case 'readiness':
          payload = MLFeatureBuilder.buildReadinessPredictionPayload(
            submission.userId,
            user?.targetCompanies || 'general'
          );
          return await axios.post(`${ML_SERVICE_URL}/ai/ml/readiness/predict`, payload, {
            timeout: 45000,
          }).then(async (response) => {
            if (response.data?.success && response.data?.data) {
              const data = response.data.data;
              await ReadinessScore.create({
                userId: submission.userId,
                readinessScore: data.readiness_score,
                targetCompany: data.target_company,
                probability: data.probability,
                confidence: data.confidence
              });
            }
            return response;
          });

        case 'planner':
          payload = MLFeatureBuilder.buildPlanningPayload(submission.userId, {
            dailyMinutes: user?.dailyStudyMinutes || 120,
            targetCompany: user?.targetCompanies || 'general',
            currentPhase: user?.preparationPhase || 'exploration'
          });
          return await axios.post(`${ML_SERVICE_URL}/ai/ml/planner/generate`, payload, {
            timeout: 60000,
          });

        default:
          throw new Error(`Unknown ML service: ${service}`);
      }
    } catch (error) {
      logger?.warn(`ML service call failed for ${service}:`, error.message);
      // Return gracefully - don't throw
      return null;
    }
  }

  /**
   * Batch enrich submissions
   * Used during initial bootstrap sync
   * 
   * @param {array} submissions - Raw submissions from platform
   * @param {string} userId - User MongoDB ID
   * @param {string} platform - Platform name
   * @returns {array} Enriched submission array
   */
  static enrichSubmissionBatch(submissions, userId, platform) {
    return submissions.map(sub => this.enrichSubmission(sub, userId, platform));
  }

  /**
   * Validate enriched submission has all ML fields
   * Used before storing to catch any enrichment failures
   * 
   * @param {object} submission - Enriched submission
   * @returns {boolean} True if valid
   */
  static validateEnrichment(submission) {
    const missing = MLFeatureBuilder.validateMLReadiness(submission);
    if (missing.length > 0) {
      logger?.warn(
        `Submission is missing ML fields: ${missing.join(', ')}. ` +
        `This may reduce ML model accuracy.`
      );
      return false;
    }
    return true;
  }
}

export default EnhancedSubmissionProcessor;
