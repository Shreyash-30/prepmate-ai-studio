/**
 * Practice Routes
 * 
 * Adaptive practice endpoints for personalized practice recommendations,
 * progression tracking, and attempt recording.
 */

import express from 'express';
import * as practiceController from '../controllers/practiceController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All practice routes require authentication
router.use(auth);

// ============================================
// TOPICS
// ============================================

/**
 * GET /api/practice/topics
 * Get all available topics
 */
router.get('/topics', practiceController.getAllTopics);

/**
 * GET /api/practice/topics/:topicId
 * Get specific topic details
 */
router.get('/topics/:topicId', practiceController.getTopic);

// ============================================
// RECOMMENDATIONS & QUESTIONS
// ============================================

/**
 * GET /api/practice/recommendations
 * Get adaptive recommendations for all topics
 */
router.get('/recommendations', practiceController.getAllRecommendations);

/**
 * GET /api/practice/topics/:topicId/recommendations
 * Get recommendations for specific topic
 */
router.get('/topics/:topicId/recommendations', practiceController.getTopicRecommendations);

/**
 * GET /api/practice/questions/search?keyword=...
 * Search questions by keyword
 */
router.get('/questions/search', practiceController.searchQuestions);

/**
 * POST /api/practice/topics/:topicId/generate-questions
 * Generate personalized questions using LLM
 */
router.post('/topics/:topicId/generate-questions', practiceController.generatePersonalizedQuestions);

/**
 * GET /api/practice/questions/:problemId
 * Get or fetch single question details
 */
router.get('/questions/:problemId', practiceController.getQuestion);

// ============================================
// PROGRESSION & DIFFICULTY
// ============================================

/**
 * GET /api/practice/topics/:topicId/progression
 * Get detailed progression report for topic
 */
router.get('/topics/:topicId/progression', practiceController.getProgressionReport);

/**
 * GET /api/practice/topics/:topicId/recommendation
 * Get progression recommendation (advance/continue/review)
 */
router.get('/topics/:topicId/recommendation', practiceController.getProgressionRecommendation);

/**
 * GET /api/practice/topics/:topicId/next-problems
 * Get next recommended problems at current difficulty level
 */
router.get('/topics/:topicId/next-problems', practiceController.getNextProblems);

/**
 * POST /api/practice/topics/:topicId/advance
 * Advance to next difficulty level
 */
router.post('/topics/:topicId/advance', practiceController.advanceDifficulty);

/**
 * POST /api/practice/topics/:topicId/review
 * Move back to previous difficulty level
 */
router.post('/topics/:topicId/review', practiceController.reviewDifficulty);

// ============================================
// ATTEMPT RECORDING & ANALYTICS
// ============================================

/**
 * POST /api/practice/attempt
 * Record a practice attempt (AI Lab or external)
 */
router.post('/attempt', practiceController.recordPracticeAttempt);

/**
 * GET /api/practice/topics/:topicId/analytics
 * Get detailed analytics for topic
 */
router.get('/topics/:topicId/analytics', practiceController.getTopicAnalytics);

// ============================================
// ADMIN: RESET
// ============================================

/**
 * POST /api/practice/reset/:topicId
 * Reset progression for a topic
 */
router.post('/reset/:topicId', practiceController.resetProgression);

export default router;
