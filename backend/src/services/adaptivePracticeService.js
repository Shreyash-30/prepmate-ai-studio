/**
 * Adaptive Practice Service
 * 
 * Core engine for personalized practice recommendations
 * Coordinates with ML intelligence, question bank, and progression tracking
 * 
 * Returns:
 * - Recommended difficulties
 * - Question selections
 * - Reasoning from LLM
 * - Progression guidance
 */

import logger from '../utils/logger.js';
import QuestionBank from '../models/QuestionBank.js';
import UserTopicProgression from '../models/UserTopicProgression.js';
import PracticeAttemptEvent from '../models/PracticeAttemptEvent.js';
import Topic from '../models/Topic.js';
import questionFetchService from './questionFetchService.js';
import aiProxyService from './aiProxyService.js';

/**
 * Adaptive Practice Service
 */
class AdaptivePracticeService {
  /**
   * Get comprehensive practice recommendations for a topic
   * 
   * Returns mastery + progression context and AI-recommended next steps
   */
  static async getTopicPracticeRecommendations(userId, topicId) {
    try {
      logger.info(`Getting practice recommendations for user ${userId}, topic ${topicId}`);

      // 1. Fetch user progression
      const progression = await UserTopicProgression.findOrCreateForUser(userId, topicId);
      
      // 2. Fetch topic metadata
      const topicMetadata = await Topic.findOne({ topicId });

      // 3. Fetch recent attempts for stats
      const recentAttempts = await PracticeAttemptEvent.getRecentPractice(userId, topicId, 5);

      // 4. Calculate current readiness
      const stats = await PracticeAttemptEvent.getTopicStats(userId, topicId);

      // Update progression with latest stats
      if (stats.totalAttempts > 0) {
        progression.totalAttempts = stats.totalAttempts;
        progression.successfulAttempts = stats.successfulAttempts;
        progression.averageAccuracy = stats.successRate;
        progression.averageSolveTime = stats.averageSolveTime;
        progression.averageHintsUsed = stats.averageHints;
        progression.calculateReadiness();
      }

      // 5. Determine recommended difficulty using mastery + progression
      const masteryData = await this.queryMasteryFromML(userId, topicId);
      // Use readiness as mastery if ML service unavailable or returns 0
      const masteryScore = (masteryData?.mastery_probability && masteryData.mastery_probability > 0)
        ? masteryData.mastery_probability
        : progression.progressionReadinessScore;
      const recommendedDifficulty = this.determineRecommendedDifficulty(
        masteryScore,
        progression.progressionReadinessScore
      );

      // 6. Fetch recommended questions for difficulty
      const questions = await this.getQuestionsForDifficulty(topicId, recommendedDifficulty, 5);

      // 7. Get AI reasoning for recommendation
      const reasonForRecommendation = await this.generateRecommendationReason(
        userId,
        topicId,
        { mastery_probability: masteryScore, confidence_score: 0.8 },
        progression,
        recommendedDifficulty
      );

      // Save updated progression
      progression.recommendedNextDifficulty = recommendedDifficulty;
      progression.progressionReason = reasonForRecommendation;
      progression.lastEvaluatedAt = new Date();
      await progression.save();

      return {
        success: true,
        topicId: topicId,
        topic: topicMetadata ? {
          name: topicMetadata.name,
          description: topicMetadata.description,
          icon: topicMetadata.icon,
          color: topicMetadata.color,
          questionCount: topicMetadata.questionCount,
          difficulty: topicMetadata.difficulty,
        } : null,
        masteryScore: masteryScore,
        masteryConfidence: 0.8,
        readinessScore: progression.progressionReadinessScore,
        currentDifficultyLevel: progression.currentDifficultyLevel,
        recommendedDifficulty: recommendedDifficulty,
        recommendedMoreSameLevel: progression.recommendedMoreSameLevel,
        reasonForRecommendation: reasonForRecommendation,
        recommendedQuestions: questions,
        progressionStats: {
          totalAttempts: stats.totalAttempts,
          successfulAttempts: stats.successfulAttempts,
          successRate: stats.successRate,
          averageSolveTime: stats.averageSolveTime,
          averageHintsUsed: stats.averageHints,
        },
        recentAttempts: recentAttempts.map((a) => ({
          problemId: a.problemId,
          correctness: a.correctness,
          solveTime: a.solveTime,
          attempts: a.attempts,
          hintsUsed: a.hintsUsed,
          mode: a.mode,
          createdAt: a.createdAt,
        })),
        nextEvaluationDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };
    } catch (error) {
      logger.error(`Error getting practice recommendations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recommended questions for a specific difficulty
   */
  static async getQuestionsForDifficulty(topicId, difficulty, limit = 5) {
    try {
      // Query question bank for this topic/difficulty
      const questions = await QuestionBank.find({
        normalizedTopics: topicId,
        difficulty: difficulty,
        isRecommended: true,
        isActive: true,
      })
        .limit(limit)
        .select('problemId title difficulty topicTags sourceUrl')
        .lean();

      if (questions.length === 0) {
        // Fallback: get any questions for this difficulty
        const fallback = await QuestionBank.find({
          normalizedTopics: topicId,
          difficulty: difficulty,
          isActive: true,
        })
          .limit(limit)
          .select('problemId title difficulty topicTags sourceUrl')
          .lean();

        return fallback;
      }

      return questions;
    } catch (error) {
      logger.error(`Error getting questions for difficulty: ${error.message}`);
      return [];
    }
  }

  /**
   * Determine recommended difficulty based on mastery + progression
   */
  static determineRecommendedDifficulty(masteryScore, readinessScore) {
    // Weighted combination: Mastery (60%) + Readiness (40%)
    const combinedScore = masteryScore * 0.6 + readinessScore * 0.4;

    if (combinedScore < 0.4) {
      return 'Easy';
    } else if (combinedScore < 0.7) {
      return 'Medium';
    } else {
      return 'Hard';
    }
  }

  /**
   * Generate AI reasoning for recommendation
   */
  static async generateRecommendationReason(userId, topicId, masteryData, progression, recommendedDifficulty) {
    try {
      const prompt = `
You are an intelligent tutor analyzing a student's learning progression.

Student Profile:
- Topic: ${topicId}
- Mastery Level: ${(masteryData?.mastery_probability * 100).toFixed(1)}%
- Mastery Confidence: ${(masteryData?.confidence_score * 100).toFixed(1)}%
- Readiness Score: ${(progression.progressionReadinessScore * 100).toFixed(1)}%
- Current Practice Level: ${progression.currentDifficultyLevel}
- Total Attempts: ${progression.totalAttempts}
- Success Rate: ${(progression.averageAccuracy * 100).toFixed(1)}%
- Recommended Next: ${recommendedDifficulty}

Generate a brief, encouraging explanation (2-3 sentences) for:
1. Why we're recommending this difficulty level
2. What strengths to leverage
3. What to focus on next

Keep it motivational and specific.
      `.trim();

      const response = await aiProxyService.generateResponse(prompt);

      return response || `Based on your ${(masteryData?.mastery_probability * 100).toFixed(1)}% mastery and ${(progression.progressionReadinessScore * 100).toFixed(1)}% readiness score, we recommend practicing ${recommendedDifficulty} problems.`;
    } catch (error) {
      logger.error('Error generating recommendation reason:', error);

      // Fallback reasoning
      return `Based on your performance (${(masteryData?.mastery_probability * 100).toFixed(1)}% mastery), we recommend ${recommendedDifficulty} problems. Keep practicing to improve!`;
    }
  }

  /**
   * Query mastery score from ML service
   * Falls back to using readiness score from database if ML service unavailable
   */
  static async queryMasteryFromML(userId, topicId) {
    try {
      // Try to call ML service
      const response = await aiProxyService.callPracticeReview(userId, 'mastery', {
        topic_id: topicId,
      });

      if (response.success && response.data) {
        return response.data;
      }
      
      return null; // Return null to trigger DB fallback
    } catch (error) {
      logger.warn(`Could not fetch mastery from ML service: ${error.message}`);
      return null; // Return null to trigger DB fallback
    }
  }

  /**
   * Get all topic recommendations for a user
   */
  static async getAllTopicRecommendations(userId) {
    try {
      const progressions = await UserTopicProgression.getUserProgressionByTopic(userId);

      const recommendations = await Promise.all(
        progressions.map(async (prog) => {
          const stats = await PracticeAttemptEvent.getTopicStats(userId, prog.topicId);
          const masteryData = await this.queryMasteryFromML(userId, prog.topicId);
          const topicMetadata = await Topic.findOne({ topicId: prog.topicId });

          // Use readiness as mastery if ML service unavailable or returns 0
          const masteryScore = (masteryData?.mastery_probability && masteryData.mastery_probability > 0) 
            ? masteryData.mastery_probability 
            : prog.progressionReadinessScore;

          return {
            topicId: prog.topicId,
            topic: topicMetadata ? {
              name: topicMetadata.name,
              description: topicMetadata.description,
              icon: topicMetadata.icon,
              color: topicMetadata.color,
              questionCount: topicMetadata.questionCount,
              difficulty: topicMetadata.difficulty,
            } : null,
            masteryScore: masteryScore,
            progressionReadinessScore: prog.progressionReadinessScore,
            readinessScore: prog.progressionReadinessScore,
            currentDifficultyLevel: prog.currentDifficultyLevel,
            recommendedDifficulty: prog.recommendedNextDifficulty,
            attemptCount: stats.totalAttempts,
            successRate: stats.successRate,
            lastAttemptAt: prog.lastAttemptAt,
            isOverdue: prog.isOverdue,
            hasWeaknesses: prog.hasWeaknesses,
          };
        })
      );

      // Sort by: overdue first, then by mastery (ascending)
      recommendations.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return a.masteryScore - b.masteryScore;
      });

      return recommendations;
    } catch (error) {
      logger.error('Error getting all topic recommendations:', error);
      throw error;
    }
  }

  /**
   * Record a practice attempt
   */
  static async recordPracticeAttempt(userId, problemId, topicId, attemptData) {
    try {
      logger.info(`Recording practice attempt for user ${userId}, problem ${problemId}`);

      // Create attempt event
      const attempt = new PracticeAttemptEvent({
        userId: userId,
        problemId: problemId,
        topicId: topicId,
        mode: attemptData.mode || 'ai_lab',
        solveTime: attemptData.solveTime || 0,
        attempts: attemptData.attempts || 1,
        hintsUsed: attemptData.hintsUsed || 0,
        retries: attemptData.retries || 0,
        correctness: attemptData.correctness || false,
        difficulty: attemptData.difficulty,
        aiFeedback: attemptData.aiFeedback || null,
        mlProcessingStatus: 'pending',
      });

      await attempt.save();

      // Update progression
      await this.updateTopicProgressionFromAttempt(userId, topicId, attempt);

      // Queue for ML processing
      logger.info(`Attempt recorded, queued for ML processing: ${attempt._id}`);

      return {
        success: true,
        attemptId: attempt._id,
        mlProcessingQueued: true,
      };
    } catch (error) {
      logger.error('Error recording practice attempt:', error);
      throw error;
    }
  }

  /**
   * Update topic progression based on attempt
   */
  static async updateTopicProgressionFromAttempt(userId, topicId, attempt) {
    try {
      const progression = await UserTopicProgression.findOrCreateForUser(userId, topicId);

      // Update stats
      progression.totalAttempts += 1;
      if (attempt.correctness) {
        progression.successfulAttempts += 1;
      }

      progression.averageAccuracy = progression.successfulAttempts / progression.totalAttempts;
      progression.lastAttemptAt = new Date();
      if (!progression.firstAttemptAt) {
        progression.firstAttemptAt = new Date();
      }

      // Recalculate readiness
      progression.calculateReadiness();

      await progression.save();

      logger.info(`Updated progression for user ${userId}, topic ${topicId}`);

      return progression;
    } catch (error) {
      logger.error('Error updating progression:', error);
    }
  }

  /**
   * Get detailed performance analytics for a topic
   */
  static async getTopicAnalytics(userId, topicId) {
    try {
      const stats = await PracticeAttemptEvent.getTopicStats(userId, topicId);
      const progression = await UserTopicProgression.findOne({ userId, topicId });
      const attempts = await PracticeAttemptEvent.getRecentPractice(userId, topicId, 20);

      // Calculate error patterns
      const errorPatterns = {};
      attempts.forEach((a) => {
        if (!a.correctness && a.errorPatternCategory && a.errorPatternCategory !== 'none') {
          errorPatterns[a.errorPatternCategory] = (errorPatterns[a.errorPatternCategory] || 0) + 1;
        }
      });

      return {
        topicId: topicId,
        stats: stats,
        progression: {
          currentLevel: progression?.currentDifficultyLevel,
          readinessScore: progression?.progressionReadinessScore,
          isMastered: progression?.isMastered,
        },
        errorPatterns: errorPatterns,
        recentAttempts: attempts.slice(0, 10),
      };
    } catch (error) {
      logger.error('Error getting topic analytics:', error);
      throw error;
    }
  }
}

export default AdaptivePracticeService;
