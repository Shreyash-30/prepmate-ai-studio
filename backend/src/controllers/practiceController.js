/**
 * Practice Controller
 * 
 * Handles adaptive practice endpoints:
 * - GET recommendations for a topic
 * - POST practice attempts
 * - GET progression analytics
 * - GET analytics for a topic
 */

import adaptivePracticeService from '../services/adaptivePracticeService.js';
import topicProgressionService from '../services/topicProgressionService.js';
import questionFetchService from '../services/questionFetchService.js';
import llmQuestionGenerationService from '../services/llmQuestionGenerationService.js';
import Topic from '../models/Topic.js';
import logger from '../utils/logger.js';

/**
 * GET /api/practice/topics
 * 
 * Get all practice topics with metadata
 */
export const getAllTopics = async (req, res) => {
  try {
    const topics = await Topic.find({ isActive: true }).sort({ 'category': 1, 'name': 1 });

    res.status(200).json({
      success: true,
      data: topics,
    });
  } catch (error) {
    logger.error('Error getting topics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get topics',
      error: error.message,
    });
  }
};

/**
 * GET /api/practice/topics/:topicId
 * 
 * Get a specific topic with metadata
 */
export const getTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const topic = await Topic.findOne({ topicId });

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    res.status(200).json({
      success: true,
      data: topic,
    });
  } catch (error) {
    logger.error('Error getting topic:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get topic',
      error: error.message,
    });
  }
};

/**
 * GET /api/practice/topics/:topicId/recommendations
 * 
 * Get adaptive practice recommendations for a topic
 */
export const getTopicRecommendations = async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user._id;

    logger.info(`Getting recommendations for user ${userId}, topic ${topicId}`);

    const recommendations = await adaptivePracticeService.getTopicPracticeRecommendations(
      userId,
      topicId
    );

    res.status(200).json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    logger.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: error.message,
    });
  }
};

/**
 * GET /api/practice/recommendations
 * 
 * Get recommendations for all topics user is practicing
 */
export const getAllRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;

    const recommendations = await adaptivePracticeService.getAllTopicRecommendations(userId);

    res.status(200).json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    logger.error('Error getting all recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: error.message,
    });
  }
};

/**
 * POST /api/practice/attempt
 * 
 * Record a practice attempt (from AI Lab or external)
 * 
 * Body:
 * {
 *   problemId: String,
 *   topicId: String,
 *   mode: "ai_lab" | "external",
 *   solveTime: Number (ms),
 *   attempts: Number,
 *   hintsUsed: Number,
 *   correctness: Boolean,
 *   difficulty: String,
 *   aiFeedback: String (optional),
 *   codeQualityMetrics: {...} (optional)
 * }
 */
export const recordPracticeAttempt = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      problemId,
      topicId,
      mode,
      solveTime,
      attempts,
      hintsUsed,
      correctness,
      difficulty,
      aiFeedback,
      codeQualityMetrics,
    } = req.body;

    // Validation
    if (!problemId || !topicId) {
      return res.status(400).json({
        success: false,
        message: 'problemId and topicId are required',
      });
    }

    logger.info(`Recording attempt for user ${userId}, problem ${problemId}`);

    const attemptData = {
      mode: mode || 'ai_lab',
      solveTime: solveTime || 0,
      attempts: attempts || 1,
      hintsUsed: hintsUsed || 0,
      correctness: correctness === true,
      difficulty: difficulty,
      aiFeedback: aiFeedback,
      codeQualityMetrics: codeQualityMetrics,
    };

    const result = await adaptivePracticeService.recordPracticeAttempt(
      userId,
      problemId,
      topicId,
      attemptData
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'Practice attempt recorded successfully',
    });
  } catch (error) {
    logger.error('Error recording attempt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record attempt',
      error: error.message,
    });
  }
};

/**
 * GET /api/practice/topics/:topicId/progression
 * 
 * Get detailed progression report for a topic
 */
export const getProgressionReport = async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user._id;

    const report = await topicProgressionService.getProgressionReport(userId, topicId);

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Error getting progression report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get progression report',
      error: error.message,
    });
  }
};

/**
 * POST /api/practice/topics/:topicId/advance
 * 
 * Advance to next difficulty level
 */
export const advanceDifficulty = async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user._id;
    const { force } = req.body;

    const result = await topicProgressionService.advanceDifficulty(userId, topicId, force || false);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error advancing difficulty:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to advance difficulty',
      error: error.message,
    });
  }
};

/**
 * POST /api/practice/topics/:topicId/review
 * 
 * Move back to previous difficulty level
 */
export const reviewDifficulty = async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user._id;

    const result = await topicProgressionService.reviewPreviousDifficulty(userId, topicId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error reviewing difficulty:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review difficulty',
      error: error.message,
    });
  }
};

/**
 * GET /api/practice/topics/:topicId/recommendation
 * 
 * Get progression recommendation (advance/continue/review)
 */
export const getProgressionRecommendation = async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user._id;

    const recommendation = await topicProgressionService.getProgressionRecommendation(
      userId,
      topicId
    );

    res.status(200).json({
      success: true,
      data: recommendation,
    });
  } catch (error) {
    logger.error('Error getting recommendation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendation',
      error: error.message,
    });
  }
};

/**
 * GET /api/practice/topics/:topicId/next-problems
 * 
 * Get next recommended problems for current level
 */
export const getNextProblems = async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user._id;
    const { limit = 5 } = req.query;

    const problems = await topicProgressionService.getNextProblems(
      userId,
      topicId,
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      data: problems,
    });
  } catch (error) {
    logger.error('Error getting next problems:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get next problems',
      error: error.message,
    });
  }
};

/**
 * GET /api/practice/topics/:topicId/analytics
 * 
 * Get detailed analytics for a topic
 */
export const getTopicAnalytics = async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user._id;

    const analytics = await adaptivePracticeService.getTopicAnalytics(userId, topicId);

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error getting analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
      error: error.message,
    });
  }
};

/**
 * GET /api/practice/questions/search
 * 
 * Search questions by keyword
 */
export const searchQuestions = async (req, res) => {
  try {
    const { keyword, limit = 20 } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: 'keyword query parameter is required',
      });
    }

    const results = await questionFetchService.searchQuestions(keyword, parseInt(limit));

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Error searching questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search questions',
      error: error.message,
    });
  }
};

/**
 * GET /api/practice/questions/:problemId
 * 
 * Get or fetch single question details
 */
export const getQuestion = async (req, res) => {
  try {
    const { problemId } = req.params;

    const question = await questionFetchService.getOrFetchQuestion(problemId);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error) {
    logger.error('Error getting question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get question',
      error: error.message,
    });
  }
};

/**
 * POST /api/practice/reset/:topicId
 * 
 * Reset progression for a topic (admin feature)
 */
export const resetProgression = async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user._id;

    // Could add admin check here if needed

    const result = await topicProgressionService.resetTopicProgression(userId, topicId);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Progression reset successfully',
    });
  } catch (error) {
    logger.error('Error resetting progression:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset progression',
      error: error.message,
    });
  }
};
/**
 * GET /api/practice/topics/:topicId/generate-questions
 * 
 * Generate personalized questions using LLM based on user profile and topic intelligence
 */
export const generatePersonalizedQuestions = async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user._id;
    const { limit = 5 } = req.query;

    console.log('\n' + '='.repeat(80));
    console.log('📌 FRONTEND REQUEST RECEIVED');
    console.log('='.repeat(80));
    console.log(`   From: Frontend (Practice.tsx)`);
    console.log(`   Route: POST /api/practice/topics/:topicId/generate-questions`);
    console.log(`   Topic ID (params): ${topicId}`);
    console.log(`   User ID (from token): ${userId}`);
    console.log(`   Limit (query): ${limit}`);
    console.log('');
    
    logger.info(`Generating personalized questions for user ${userId}, topic ${topicId}`);

    const result = await llmQuestionGenerationService.generatePersonalizedQuestions(
      userId,
      topicId,
      { limit: parseInt(limit) }
    );

    console.log('\n✅ RESPONSE READY TO SEND TO FRONTEND');
    console.log(`   Questions generated: ${result.questions?.length || 0}`);
    console.log(`   Source: ${result.source}`);
    console.log('   Result keys:', Object.keys(result));
    console.log('   Full result:', JSON.stringify(result, null, 2).substring(0, 500));
    console.log('');
    
    // Validate response structure before sending
    if (!result.questions || !Array.isArray(result.questions)) {
      console.log('⚠️ WARNING: Questions field missing or not an array!');
      console.log('   Questions type:', typeof result.questions);
      console.log('   Questions value:', result.questions);
    }
    
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.log(`\n❌ ERROR IN QUESTION GENERATION`);
    console.log(`   Error: ${error.message}`);
    console.log('');
    
    logger.error('Error generating questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate questions',
      error: error.message,
    });
  }
};