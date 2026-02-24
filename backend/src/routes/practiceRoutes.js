/**
 * Practice Routes
 * 
 * Adaptive practice endpoints for personalized practice recommendations,
 * progression tracking, and attempt recording.
 */

import express from 'express';
import * as practiceController from '../controllers/practiceController.js';
import auth from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import { executionRateLimit, submissionRateLimit } from '../middleware/rateLimitMiddleware.js';
import { enforceWrappedExecutionMiddleware } from '../middleware/wrappedExecutionEnforcement.js';

const router = express.Router();

// ============================================
// PHASE 9: GLOBAL WRAPPED EXECUTION ENFORCEMENT
// Applied to all practice endpoints to enforce v2 only
// ============================================
router.use(enforceWrappedExecutionMiddleware);

// ============================================
// SESSION START - NO AUTH REQUIRED (demo mode support)
// ============================================

// ============================================
// OPTIONAL AUTH MIDDLEWARE
// ============================================
// Attempt to authenticate but continue even if failed (demo mode support)
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
      req.user = { _id: decoded.userId || decoded._id };
    }
  } catch (err) {
    // Ignore auth errors - allow demo mode
  }
  next();
};

/**
 * POST /api/practice/session/start
 * Start a new practice session
 * Note: Auth is optional - allows demo users without token
 */
router.post('/session/start', optionalAuth, practiceController.startSession);

// ============================================
// CODE EXECUTION - OPTIONAL AUTH (session-based access control)
// ============================================

/**
 * POST /api/practice/run/:sessionId
 * Run code against visible test cases only (no submission)
 * Used for testing during problem solving
 * Rate limited: 20 executions per minute
 * Auth: Optional (session ownership is checked in controller)
 */
router.post('/run/:sessionId', optionalAuth, executionRateLimit, practiceController.runCode);

/**
 * POST /api/practice/submit
 * Submit code solution and run tests
 * Rate limited: 5 submissions per minute
 * Auth: Optional (session ownership is checked in controller)
 */
router.post('/submit', optionalAuth, submissionRateLimit, practiceController.submitPractice);

/**
 * POST /api/practice/voice/:sessionId
 * Process voice input and interact with mentor
 * Body: {transcript, intent, context}
 * Auth: Optional (session ownership is checked in controller)
 */
router.post('/voice/:sessionId', optionalAuth, practiceController.handleVoiceInteraction);

/**
 * POST /api/practice/score-explanation/:sessionId
 * Score and evaluate user's solution explanation
 * Auth: Optional (session ownership is checked in controller)
 */
router.post('/score-explanation/:sessionId', optionalAuth, practiceController.requestScoreExplanation);

/**
 * GET /api/practice/session/:sessionId
 * Get practice session details and state
 * Auth: Optional (session ownership is checked in controller)
 */
router.get('/session/:sessionId', optionalAuth, practiceController.getSession);

/**
 * GET /api/practice/hint/:sessionId
 * Stream hints as Server-Sent Events (SSE)
 * Query params: level, token
 * Auth: Optional (session ownership is checked in controller)
 */
router.get('/hint/:sessionId', optionalAuth, practiceController.streamHint);

/**
 * GET /api/practice/review/:sessionId
 * Stream code review as Server-Sent Events (SSE)
 * Query params: code, token
 * Auth: Optional (session ownership is checked in controller)
 */
router.get('/review/:sessionId', optionalAuth, practiceController.streamCodeReview);

/**
 * GET /api/practice/inline-assist/:sessionId
 * Stream inline code suggestions as SSE
 * Query params: cursorLine, token
 * Auth: Optional (session ownership is checked in controller)
 */
router.get('/inline-assist/:sessionId', optionalAuth, practiceController.requestInlineAssist);

// All other practice routes require authentication
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

// ============================================
// DIAGNOSTICS - DEBUG ONLY
// ============================================

/**
 * GET /api/practice/diagnostic/judge0
 * Test Judge0 connectivity and configuration
 */
router.get('/diagnostic/judge0', async (req, res) => {
  try {
    const { default: judge0Service } = await import('../services/judge0Service.js');
    
    const isConfigured = judge0Service.isConfigured();
    
    if (!isConfigured) {
      return res.status(503).json({
        success: false,
        message: 'Judge0 is NOT configured',
        details: {
          configured: false,
          apiKey: 'JUDGE0_RAPIDAPI_KEY not set',
          solution: 'Set JUDGE0_RAPIDAPI_KEY in .env file'
        }
      });
    }

    // Try a simple submission to test connectivity
    const testCode = 'print("hello")';
    
    try {
      const token = await judge0Service.submitCode({
        code: testCode,
        language: 'python',
        input: '',
        expectedOutput: 'hello',
        timeLimit: 2,
        memoryLimit: 256,
      });

      // Poll for result
      const result = await judge0Service.pollSubmission(token);

      return res.status(200).json({
        success: true,
        message: 'Judge0 is working correctly',
        details: {
          configured: true,
          testSubmission: {
            token,
            statusId: result.status?.id,
            statusDescription: result.status?.description,
            stdout: result.stdout,
            stderr: result.stderr,
            time: result.time,
            memory: result.memory,
          }
        }
      });
    } catch (testError) {
      return res.status(503).json({
        success: false,
        message: 'Judge0 test submission failed',
        details: {
          configured: true,
          error: testError.message,
          stack: process.env.NODE_ENV === 'development' ? testError.stack : undefined
        }
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Diagnostic error',
      details: {
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      }
    });
  }
});

export default router;
