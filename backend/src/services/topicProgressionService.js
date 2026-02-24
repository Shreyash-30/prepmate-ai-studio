/**
 * Topic Progression Service
 * 
 * Manages difficulty progression for users across topics
 * Handles advancement, review, and readiness evaluation
 * 
 * Workflow:
 * - Evaluate readiness after each attempt batch
 * - Recommend advancement when ready
 * - Allow manual progression changes
 * - Track progression history
 */

import logger from '../utils/logger.js';
import UserTopicProgression from '../models/UserTopicProgression.js';
import PracticeAttemptEvent from '../models/PracticeAttemptEvent.js';
import QuestionBank from '../models/QuestionBank.js';
import Topic from '../models/Topic.js';
import { TopicMastery } from '../models/MLIntelligence.js';

/**
 * Topic Progression Service
 */
class TopicProgressionService {
  /**
   * Evaluate and update progression readiness for all user topics
   */
  static async evaluateUserProgressions(userId) {
    try {
      const progressions = await UserTopicProgression.find({ userId });

      const updates = await Promise.all(
        progressions.map((prog) => this.evaluateTopicProgression(userId, prog.topicId))
      );

      logger.info(`Evaluated progression for ${updates.length} topics of user ${userId}`);

      return updates;
    } catch (error) {
      logger.error('Error evaluating user progressions:', error);
      throw error;
    }
  }

  /**
   * Evaluate readiness for a specific topic
   */
  static async evaluateTopicProgression(userId, topicId) {
    try {
      const progression = await UserTopicProgression.findOrCreateForUser(userId, topicId);

      // Get recent attempts (last 5)
      const recentAttempts = await PracticeAttemptEvent.getRecentPractice(userId, topicId, 5);

      if (recentAttempts.length < 2) {
        logger.info(`Not enough attempts to evaluate progression: ${topicId}`);
        return progression;
      }

      // Update stats from recent attempts
      const stats = await PracticeAttemptEvent.getTopicStats(userId, topicId);

      progression.totalAttempts = stats.totalAttempts;
      progression.successfulAttempts = stats.successfulAttempts;
      progression.averageAccuracy = stats.successRate;
      progression.averageSolveTime = stats.averageSolveTime;
      progression.averageHintsUsed = stats.averageHints;

      // Recalculate readiness
      progression.calculateReadiness();

      // Check if should mark as mastered
      if (progression.averageAccuracy >= 0.9 && progression.totalAttempts >= 10) {
        progression.isMastered = true;
      }

      // Update progression history
      this.updateProgressionHistory(progression, recentAttempts);

      // Calculate days since last attempt
      if (progression.lastAttemptAt) {
        const daysSince = Math.floor(
          (Date.now() - new Date(progression.lastAttemptAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        progression.daysSinceLastAttempt = daysSince;
      }

      progression.lastEvaluatedAt = new Date();

      await progression.save();

      logger.info(`Evaluated progression for ${userId}, ${topicId}. Readiness: ${progression.progressionReadinessScore}`);

      return progression;
    } catch (error) {
      logger.error('Error evaluating topic progression:', error);
      throw error;
    }
  }

  /**
   * Update progression history array
   */
  static updateProgressionHistory(progression, recentAttempts) {
    // Find current difficulty in history
    const currentEntry = progression.difficultyProgression.find(
      (p) => p.difficulty === progression.currentDifficultyLevel && !p.endedAt
    );

    if (currentEntry) {
      // Update existing entry
      currentEntry.successCount = recentAttempts.filter((a) => a.correctness).length;
      currentEntry.attemptCount = recentAttempts.length;
      currentEntry.successRate =
        recentAttempts.length > 0
          ? recentAttempts.filter((a) => a.correctness).length / recentAttempts.length
          : 0;
    }
  }

  /**
   * Advance user to next difficulty if ready
   */
  static async advanceDifficulty(userId, topicId, force = false) {
    try {
      const progression = await UserTopicProgression.findOrCreateForUser(userId, topicId);

      // Check readiness (unless forcing)
      if (!force && progression.progressionReadinessScore < 0.7) {
        return {
          success: false,
          message: `Not ready to advance. Readiness score: ${(progression.progressionReadinessScore * 100).toFixed(1)}%`,
          readinessScore: progression.progressionReadinessScore,
        };
      }

      // Record previous level
      const previousLevel = progression.currentDifficultyLevel;
      const lastEntry = progression.difficultyProgression.find(
        (p) => p.difficulty === previousLevel && !p.endedAt
      );

      if (lastEntry) {
        lastEntry.endedAt = new Date();
      }

      // Advance difficulty
      progression.advanceDifficulty();
      progression.progressionReadinessScore = 0.3; // Reset for new level
      progression.recommendedMoreSameLevel = true;

      // Add new difficulty entry
      progression.difficultyProgression.push({
        difficulty: progression.currentDifficultyLevel,
        startedAt: new Date(),
        attemptCount: 0,
        successCount: 0,
      });

      await progression.save();

      logger.info(`Advanced ${userId} from ${previousLevel} to ${progression.currentDifficultyLevel} on ${topicId}`);

      return {
        success: true,
        message: `Advanced to ${progression.currentDifficultyLevel} problems`,
        previousLevel: previousLevel,
        newLevel: progression.currentDifficultyLevel,
      };
    } catch (error) {
      logger.error('Error advancing difficulty:', error);
      throw error;
    }
  }

  /**
   * Revert to previous difficulty if struggling
   */
  static async reviewPreviousDifficulty(userId, topicId) {
    try {
      const progression = await UserTopicProgression.findOrCreateForUser(userId, topicId);

      // Check if already at Easy
      if (progression.currentDifficultyLevel === 'Easy') {
        return {
          success: false,
          message: 'Already at the easiest difficulty level',
        };
      }

      const previousLevel = progression.currentDifficultyLevel;

      // Mark current as ended
      const lastEntry = progression.difficultyProgression.find(
        (p) => p.difficulty === previousLevel && !p.endedAt
      );

      if (lastEntry) {
        lastEntry.endedAt = new Date();
      }

      // Go back a level
      progression.reviewPreviousDifficulty();
      progression.progressionReadinessScore = 0.5; // Medium readiness at lower level
      progression.recommendedMoreSameLevel = true;

      // Add back entry
      progression.difficultyProgression.push({
        difficulty: progression.currentDifficultyLevel,
        startedAt: new Date(),
        attemptCount: 0,
        successCount: 0,
      });

      await progression.save();

      logger.info(`Reviewed ${userId} from ${previousLevel} back to ${progression.currentDifficultyLevel} on ${topicId}`);

      return {
        success: true,
        message: `Switched back to ${progression.currentDifficultyLevel} problems for more practice`,
        previousLevel: previousLevel,
        newLevel: progression.currentDifficultyLevel,
      };
    } catch (error) {
      logger.error('Error reviewing difficulty:', error);
      throw error;
    }
  }

  /**
   * Check if user should advance and return recommendation
   */
  static async getProgressionRecommendation(userId, topicId) {
    try {
      const progression = await UserTopicProgression.findOrCreateForUser(userId, topicId);

      if (progression.progressionReadinessScore >= 0.7) {
        return {
          recommendation: 'advance',
          nextLevel: progression.recommendedNextDifficulty,
          readinessScore: progression.progressionReadinessScore,
          message: `You're ready to advance to ${progression.recommendedNextDifficulty} problems!`,
        };
      } else if (progression.averageAccuracy < 0.5 && progression.totalAttempts >= 3) {
        return {
          recommendation: 'review',
          suggestion: 'Consider practicing at the same or easier level',
          readinessScore: progression.progressionReadinessScore,
          message: `Let's focus on mastering the current level first. You're at ${(progression.averageAccuracy * 100).toFixed(1)}% accuracy.`,
        };
      } else {
        return {
          recommendation: 'continue',
          nextLevel: progression.currentDifficultyLevel,
          readinessScore: progression.progressionReadinessScore,
          message: `Keep practicing ${progression.currentDifficultyLevel} problems. You're making progress!`,
        };
      }
    } catch (error) {
      logger.error('Error getting progression recommendation:', error);
      throw error;
    }
  }

  /**
   * Get next recommended problems for current level
   */
  static async getNextProblems(userId, topicId, limit = 5) {
    try {
      const progression = await UserTopicProgression.findOrCreateForUser(userId, topicId);

      // Get problems at current difficulty
      const problems = await QuestionBank.findByTopicAndDifficulty(
        [topicId],
        progression.currentDifficultyLevel,
        limit
      );

      if (problems.length === 0) {
        logger.warn(`No problems found for ${topicId} at ${progression.currentDifficultyLevel}`);

        // Fallback to any difficulty
        return await QuestionBank.find({
          normalizedTopics: topicId,
          isActive: true,
        })
          .limit(limit)
          .select('problemId title difficulty sourceUrl');
      }

      return problems;
    } catch (error) {
      logger.error('Error getting next problems:', error);
      throw error;
    }
  }

  /**
   * Reset progression for a topic
   */
  static async resetTopicProgression(userId, topicId) {
    try {
      const progression = await UserTopicProgression.findOrCreateForUser(userId, topicId);

      progression.currentDifficultyLevel = 'Easy';
      progression.progressionReadinessScore = 0;
      progression.totalAttempts = 0;
      progression.successfulAttempts = 0;
      progression.averageAccuracy = 0;
      progression.difficultyProgression = [];
      progression.isMastered = false;

      await progression.save();

      logger.info(`Reset progression for ${userId}, ${topicId}`);

      return progression;
    } catch (error) {
      logger.error('Error resetting progression:', error);
      throw error;
    }
  }

  /**
   * Get detailed progression report
   */
  static async getProgressionReport(userId, topicId) {
    try {
      const progression = await UserTopicProgression.findOrCreateForUser(userId, topicId);
      const stats = await PracticeAttemptEvent.getTopicStats(userId, topicId);
      const attempts = await PracticeAttemptEvent.getRecentPractice(userId, topicId, 10);
      
      const topicMetadata = await Topic.findOne({ topicId });
      
      // Prioritize database mastery Score from progression object
      let masteryScore = (progression.masteryScore && progression.masteryScore > 0) ? progression.masteryScore / 100 : 0;
      
      if (masteryScore === 0) {
        const masteryData = await TopicMastery.findOne({ userId, topicId });
        masteryScore = (masteryData?.mastery_probability && masteryData.mastery_probability > 0)
          ? masteryData.mastery_probability
          : progression.progressionReadinessScore;
      }

      return {
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
        currentDifficultyLevel: progression.currentDifficultyLevel,
        progressionReadinessScore: progression.progressionReadinessScore,
        readinessScore: progression.progressionReadinessScore,
        attemptCount: stats.totalAttempts || progression.totalAttempts || 0,
        isMastered: progression.isMastered,
        stats: stats,
        progression: progression.difficultyProgression,
        recentPerformance: attempts.map((a) => ({
          problemId: a.problemId,
          solveTime: a.solveTime,
          attempts: a.attempts,
          correctness: a.correctness,
          createdAt: a.createdAt,
        })),
        nextAction: await this.getProgressionRecommendation(userId, topicId),
      };
    } catch (error) {
      logger.error('Error generating progression report:', error);
      throw error;
    }
  }
}

export default TopicProgressionService;
