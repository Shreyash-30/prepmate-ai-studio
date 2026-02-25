/**
 * Practice Controller
 * 
 * Handles adaptive practice endpoints:
 * - GET recommendations for a topic
 * - POST practice attempts
 * - GET progression analytics
 * - GET analytics for a topic
 */

import axios from 'axios';
import { randomBytes } from 'crypto';
import adaptivePracticeService from '../services/adaptivePracticeService.js';
import topicProgressionService from '../services/topicProgressionService.js';
import questionFetchService from '../services/questionFetchService.js';
import llmQuestionGenerationService from '../services/llmQuestionGenerationService.js';
import practiceSessionService from '../services/practiceSessionService.js';
import Topic from '../models/Topic.js';
import PracticeSession from '../models/PracticeSession.js';
import logger from '../utils/logger.js';
import { validateQuestionForPractice, logLegacyAccessAttempt, onlyWrappedQuestionsFilter } from '../middleware/wrappedExecutionEnforcement.js';
import jwt from 'jsonwebtoken';
import FormData from 'form-data';
import AIObservabilityService from '../services/AIObservabilityService.js';

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

    // Step 1: Check GeneratedQuestionLog first (AI questions)
    const { default: GeneratedQuestionLog } = await import('../models/GeneratedQuestionLog.js');
    let question = await GeneratedQuestionLog.findOne({ problemId }).lean();

    // Step 2: If found in GeneratedQuestionLog, map to consistent format for frontend
    if (question) {
      // Map to consistent structure
      const mappedQuestion = {
        problemId: question.problemId,
        problemTitle: question.problemTitle,
        title: question.problemTitle,
        difficulty: question.difficulty,
        description: question.description || question.whyRecommended,
        content: question.description || question.whyRecommended,
        constraints: question.constraints,
        hints: question.hints || [],
        starterCode: question.starterCode,
        wrapperTemplate: question.wrapperTemplate,
        testCases: question.testCasesStructured || [],
        schemaVersion: question.schemaVersion || 2,
        topic: question.topic || question.topicId,
        topicId: question.topicId || question.topic,
        source: 'llm',
      };
      
      return res.status(200).json({
        success: true,
        data: mappedQuestion,
      });
    }

    // Step 3: Fallback to QuestionFetchService (Static/LeetCode questions)
    const staticQuestion = await questionFetchService.getOrFetchQuestion(problemId);

    if (!staticQuestion) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    res.status(200).json({
      success: true,
      data: staticQuestion,
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

// ============================================
// PHASE 3: SESSION MANAGEMENT & AI FEATURES
// ============================================

/**
 * POST /api/practice/session/start
 * Create a new practice session
 */
export const startSession = async (req, res) => {
  try {
    const { problemId, topicId, language, isRevision = false, isValidation = false } = req.body;
    
    // Extract userId - support both authenticated users and demo mode
    let userId;
    if (req.user) {
      userId = req.user._id || req.user.id || req.user._id?.toString();
    } else {
      // Generate a demo user ID if not authenticated
      userId = 'demo-user-' + randomBytes(8).toString('hex');
    }

    if (!problemId || !topicId || !language) {
      logger.warn('Missing required fields in startSession', { problemId, topicId, language });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: problemId, topicId, language',
      });
    }

    logger.info(`[Practice] Starting session - userId: ${userId}, problemId: ${problemId}, topicId: ${topicId}, language: ${language}`);

    // Fetch question from GeneratedQuestionLog or QuestionBank
    let sourceQuestion = null;
    try {
      const { default: GeneratedQuestionLog } = await import('../models/GeneratedQuestionLog.js');
      const { default: QuestionBank } = await import('../models/QuestionBank.js');

      logger.info(`\n🔍 SEARCHING FOR QUESTION: "${problemId}"`);
      
      // Try GeneratedQuestionLog first (for AI-generated questions)
      logger.info(`   Step 1: Checking GeneratedQuestionLog...`);
      sourceQuestion = await GeneratedQuestionLog.findOne({ problemId });
      if (sourceQuestion) {
        logger.info(`   ✅ FOUND in GeneratedQuestionLog!`);
        logger.info(`      Title: ${sourceQuestion.problemTitle}`);
        logger.info(`      Schema: v${sourceQuestion.schemaVersion}`);
        logger.info(`      Active: ${sourceQuestion.isActive}`);
        logger.info(`      Has wrapperTemplate: ${!!sourceQuestion.wrapperTemplate}`);
      } else {
        logger.warn(`   ❌ NOT found in GeneratedQuestionLog`);
      }

      // Fall back to QuestionBank (for platform questions)
      // PHASE 9: Only fetch wrapped v2 questions
      if (!sourceQuestion) {
        logger.info(`   Step 2: Checking QuestionBank with v2 filter...`);
        sourceQuestion = await QuestionBank.findOne({ 
          problemId,
          ...onlyWrappedQuestionsFilter()
        });
        if (sourceQuestion) {
          logger.info(`   ✅ FOUND in QuestionBank!`);
          logger.info(`      Title: ${sourceQuestion.title}`);
          logger.info(`      Schema: v${sourceQuestion.schemaVersion}`);
          logger.info(`      Active: ${sourceQuestion.isActive}`);
        } else {
          logger.warn(`   ❌ NOT found in QuestionBank with v2 filter`);
        }
      }

      // If still not found, check if question exists but doesn't match filter (for debugging)
      if (!sourceQuestion) {
        logger.info(`   Step 3: Checking QuestionBank without v2 filter (debug)...`);
        const debugQuestion = await QuestionBank.findOne({ problemId });
        if (debugQuestion) {
          logger.warn(`❌ Question exists but doesn't match v2 filter:`, {
            problemId,
            schemaVersion: debugQuestion.schemaVersion,
            isActive: debugQuestion.isActive,
            title: debugQuestion.title,
          });
          
          // PHASE 9: Reject legacy questions with clear error
          if (debugQuestion.schemaVersion !== 2) {
            throw new Error(`Question "${problemId}" is not using wrapped execution (schemaVersion: ${debugQuestion.schemaVersion}). Cannot create session.`);
          }
        } else {
          logger.error(`❌ Question "${problemId}" not found in any database!`);
        }
      }

      // Validate question is using wrapped execution
      if (sourceQuestion) {
        const errors = validateQuestionForPractice(sourceQuestion);
        if (errors.length > 0) {
          const qTitle = sourceQuestion.title || sourceQuestion.problemTitle || sourceQuestion.problemId;
          logger.error(`❌ PHASE 9 HARD FAIL: Question failed v2 validation`);
          logger.error(`   Question: ${qTitle}`);
          logger.error(`   Errors: ${errors.join(', ')}`);
          sourceQuestion = null; // Reject invalid question
        }
      }

      logger.info(`✅ Found source question: ${sourceQuestion ? 'yes' : 'no'}`);
    } catch (err) {
      logger.warn(`⚠️ Could not fetch source question: ${err.message}`);
    }

    // Create PracticeSession
    const session = new PracticeSession({
      userId,
      problemId,
      topicId,
      codeLanguage: language,
      status: 'active',
      isRevision,
      isValidation,
      createdAt: new Date(),
      lastActivityAt: new Date(),
    });

    // ✅ POPULATE WRAPPED EXECUTION FIELDS FROM SOURCE QUESTION
    if (sourceQuestion) {
      // For NEW wrapped format (schemaVersion 2): Copy ALL fields, NEVER stringify testCases
      if (sourceQuestion.schemaVersion === 2) {
        logger.info(`  → Populating wrapped execution fields (schemaVersion: 2)`);
        
        // Handle both testCasesStructured (from either QuestionBank or GeneratedQuestionLog)
        const testCasesField = sourceQuestion.testCasesStructured || sourceQuestion.testCases || [];
        
        session.wrapperTemplate = sourceQuestion.wrapperTemplate;
        session.starterCode = sourceQuestion.starterCode;
        session.functionMetadata = sourceQuestion.functionMetadata;
        session.schemaVersion = 2;
        session.isLegacy = false;
        
        // ✅ CRITICAL: Map test cases with BOTH output and expectedOutput for frontend compatibility
        session.testCases = (testCasesField || []).map((tc) => ({
          input: tc.input,  // Keep as object!
          expectedOutput: tc.expectedOutput || tc.output,  // Keep as object!
          output: tc.output || tc.expectedOutput,         // Alias for frontend
          visibility: tc.visibility || 'public',
        }));
        
        // ✅ ADD: Store problem metadata for AI service requests
        session.difficulty = sourceQuestion.difficulty || 'Medium';
        session.problemStatement = sourceQuestion.content || sourceQuestion.description || sourceQuestion.problemTitle || '';
        session.constraints = sourceQuestion.constraints || [];
        
        logger.info(`  → ✅ Loaded ${session.testCases.length} test cases`);
      } else {
        // ❌ HARD FAIL: Only schemaVersion 2 (wrapped execution) supported
        logger.error(`❌ HARD FAIL: Question has unsupported schemaVersion: ${sourceQuestion.schemaVersion || 'undefined'}`);
        return res.status(400).json({
          success: false,
          message: `Only schemaVersion 2 (wrapped execution) is supported. Problem: ${problemId} has version ${sourceQuestion.schemaVersion || 'undefined'}`
        });
      }
    } else {
      // ❌ HARD FAIL: No source question found
      logger.error(`❌ Question "${problemId}" not found for user ${userId}`);
      return res.status(404).json({
        success: false,
        message: `Question not found: ${problemId}. Cannot create session without a valid problem.`,
      });
    }

    await session.save();

    logger.info(`✅ Practice session started: ${session._id} (${session.schemaVersion === 2 ? 'wrapped' : 'legacy'})`);

    res.status(201).json({
      success: true,
      data: {
        sessionId: session._id,
        sessionKey: session.sessionKey,
        createdAt: session.createdAt,
        schemaVersion: session.schemaVersion,
        executionType: session.schemaVersion === 2 ? 'wrapped' : 'legacy',
      },
    });
  } catch (error) {
    logger.error('Error starting practice session:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      user: req.user ? 'present' : 'missing',
    });
    res.status(500).json({
      success: false,
      message: 'Failed to start practice session',
      error: error.message,
      validationErrors: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : null,
    });
  }
};

/**
 * POST /api/practice/submit
 * Submit code solution and run against ALL test cases (visible + hidden)
 * 
 * Creates official submission record and triggers ML updates asynchronously
 * Implements idempotency to prevent duplicate submissions
 * 
 * Request:
 * {
 *   "sessionId": "session_id",
 *   "code": "def solution(): pass",
 *   "explanation": "My approach is...",  // Optional
 *   "voiceTranscript": "I think...",     // Optional
 *   "idempotencyKey": "unique_key"       // Optional browser-generated key
 * }
 * 
 * Response:
 * {
 *   "status": "pass|fail",
 *   "totalTestCases": 10,
 *   "passedTestCases": 8,
 *   "runtime": 0.234,
 *   "memory": 12,
 *   "judgeDetails": [...],
 *   "mlJobIds": ["job_1", "job_2"],  // Async ML job references
 *   "attemptNumber": 3
 * }
 */
export const submitPractice = async (req, res) => {
  try {
    const { sessionId, code, explanation = '', voiceTranscript = '', idempotencyKey } = req.body;
    const userId = req.user ? (req.user._id || req.user.id) : req.body.userId; // Support demo users

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication or userId required for submission',
      });
    }

    // Validation
    if (!sessionId || !code) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionId, code',
      });
    }

    if (!code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Code cannot be empty',
      });
    }

    // Get session
    const session = await PracticeSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Practice session not found',
      });
    }

    // Verify ownership
    if (session.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Idempotency check: prevent duplicate submissions
    const finalIdempotencyKey = idempotencyKey || `${sessionId}_${Date.now()}_${Math.random()}`;
    
    const existingSubmission = await PracticeSession.findOne({
      _id: sessionId,
      'submissionMetadata.idempotencyKey': finalIdempotencyKey,
    });

    if (existingSubmission?.submissionResult?.verdict) {
      logger.info(`Duplicate submission detected (idempotency): ${finalIdempotencyKey}`);
      return res.status(200).json({
        success: true,
        data: {
          status: existingSubmission.submissionResult.verdict,
          totalTestCases: existingSubmission.submissionResult.totalTests,
          passedTestCases: existingSubmission.submissionResult.passedTests,
          runtime: existingSubmission.submissionResult.executionTime,
          memory: existingSubmission.submissionResult.memoryUsed,
          isDuplicate: true,
          message: 'Submission already processed',
        },
      });
    }

    // Import Judge0 service
    const { default: judge0Service } = await import('../services/judge0Service.js');

    // Check if Judge0 is configured
    if (!judge0Service.isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Code execution service is not configured.',
      });
    }

    logger.info(
      `📝 Submitting code for session ${sessionId}, problem ${session.problemId}, language=${session.codeLanguage}`
    );

    try {
      // ✅ ENFORCE: WRAPPED EXECUTION ONLY (schemaVersion 2)
      // Hard fail if session not properly initialized
      if (!session.schemaVersion || session.schemaVersion !== 2) {
        logger.error(`❌ HARD FAIL: Session ${sessionId} has schemaVersion: ${session.schemaVersion}. Only v2 supported.`);
        return res.status(400).json({
          success: false,
          message: 'Session not using wrapped execution (schemaVersion 2). Cannot submit.',
        });
      }

      const wrapperTemplate = session.wrapperTemplate[session.codeLanguage];
      if (!wrapperTemplate || !wrapperTemplate.includes('__USER_CODE__')) {
        logger.error(`❌ HARD FAIL: Missing or invalid wrapper template for ${session.codeLanguage}`);
        return res.status(400).json({
          success: false,
          message: 'Session missing valid wrapper template',
        });
      }

      if (!Array.isArray(session.testCases) || session.testCases.length === 0) {
        logger.error(`❌ HARD FAIL: No test cases in session`);
        return res.status(400).json({
          success: false,
          message: 'Session missing test cases',
        });
      }

      let submissionResult;
      try {
        // ✅ WRAPPED EXECUTION: Use ALL test cases (visible + hidden) for submission
        const normalizedTestCases = session.testCases.map((tc) => ({
          input: tc.input,  // Already an object
          expectedOutput: tc.expectedOutput,  // Already an object
          visibility: tc.visibility || 'public',
        }));

        logger.info(`Submitting with ${normalizedTestCases.length} test cases (wrapped execution)`);

        submissionResult = await judge0Service.submitWrappedSolution({
          userCode: code,
          language: session.codeLanguage,
          wrapperTemplate: wrapperTemplate,
          testCases: normalizedTestCases,
          timeLimit: 2,
          memoryLimit: 256,
        });
      } catch (error) {
        logger.error('❌ Error in wrapped submission:', error);
        return res.status(500).json({
          success: false,
          message: 'Error submitting wrapped solution: ' + error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
      }

      // Determine verdict
      const isAccepted = submissionResult.verdict === 'accepted';

      logger.info(
        `Submission result: ${submissionResult.verdict} (${submissionResult.passedTests}/${submissionResult.totalTests} test cases)`
      );

      // Update session with submission result
      session.code = code;
      session.explanation = explanation;
      session.voice_transcript = voiceTranscript;
      session.submissionAttempt = (session.submissionAttempt || 0) + 1;
      session.submissionResult = {
        verdict: isAccepted ? 'accepted' : 'wrong_answer',
        passedTests: submissionResult.passedTests,
        totalTests: submissionResult.totalTests,
        executionTime: submissionResult.runtime,
        memoryUsed: submissionResult.memory,
      };
      session.submissionMetadata = {
        idempotencyKey: finalIdempotencyKey,
        submittedAt: new Date(),
        judge0Results: submissionResult.results,
        executionMode: hasWrapperTemplate && hasStructuredTests ? 'wrapped' : 'legacy',
      };
      session.status = isAccepted ? 'completed' : 'submitted';
      session.lastActivityAt = new Date();

      await session.save();

      // Create PracticeAttemptEvent for ML pipeline (asynchronously)
      const mlJobIds = [];

      try {
        // Create PracticeAttemptEvent
        const { default: PracticeAttemptEvent } = await import('../models/PracticeAttemptEvent.js');

        // Check for first success to calculate recall improvement
        let initialSolveTime = null;
        if (isAccepted) {
          const firstSuccess = await PracticeAttemptEvent.findOne({
            userId,
            problemId: session.problemId,
            correctness: true
          }).sort({ createdAt: 1 }).lean();
          
          if (firstSuccess) {
            initialSolveTime = firstSuccess.solveTime;
          }
        }

        const solveTime = Date.now() - (session.createdAt?.getTime() || 0);
        const recallImprovement = initialSolveTime ? (initialSolveTime - solveTime) / initialSolveTime : 0;

        const event = new PracticeAttemptEvent({
          userId,
          problemId: session.problemId,
          topicId: session.topicId,
          mode: 'ai_lab',
          sourceSubmissionId: sessionId,
          attempts: session.submissionAttempt,
          correctness: isAccepted,
          solveTime,
          initialSolveTime: initialSolveTime || (isAccepted ? solveTime : null),
          recallImprovement: isAccepted ? recallImprovement : 0,
          explanation,
          voiceTranscript,
          isFirstSuccess: isAccepted && !initialSolveTime,
          isRetry: session.submissionAttempt > 1,
          isRevision: session.isRevision || false,
          isValidation: session.isValidation || false,
        });

        await event.save();
        logger.info(`Created PracticeAttemptEvent: ${event._id}`);

        // Trigger ML updates asynchronously (non-blocking)
        const mlTriggers = [];

        if (process.env.ENABLE_ML_PIPELINE !== 'false') {
          const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';

          // Trigger mastery update
          mlTriggers.push(
            axios
              .post(
                `${mlServiceUrl}/ai/ml/mastery/update`,
                {
                  userId: userId.toString(),
                  problemId: session.problemId,
                  topicId: session.topicId,
                  isCorrect: isAccepted,
                  attempts: session.submissionAttempt,
                  executionTime: submissionResult.runtime,
                },
                { timeout: 5000 }
              )
              .then(() => {
                logger.info('✅ ML mastery update triggered');
                return 'mastery_update';
              })
              .catch((err) => {
                logger.warn('Failed to trigger mastery update:', err.message);
                return 'mastery_update_failed';
              })
          );

          // Trigger retention update (Phase 5: Neural Sync)
          mlTriggers.push(
            axios
              .post(
                `${mlServiceUrl}/ai/ml/retention/update`,
                {
                  user_id: userId.toString(),
                  topic_id: session.topicId,
                  is_successful_revision: isAccepted,
                  time_since_last_revision_hours: 24, // Fallback if no prior data
                  hints_used: (session.hints || []).length,
                  recall_speed_ms: solveTime,
                  initial_solve_time_ms: initialSolveTime || (isAccepted ? solveTime : null),
                },
                { timeout: 5000 }
              )
              .then(() => {
                logger.info('✅ ML retention update triggered');
                return 'retention_update';
              })
              .catch((err) => {
                logger.warn('Failed to trigger retention update:', err.message);
                return 'retention_update_failed';
              })
          );

          // Trigger weakness analysis if incorrect
          if (!isAccepted) {
            mlTriggers.push(
              axios
                .post(
                  `${mlServiceUrl}/ai/ml/weakness/analyze`,
                  {
                    userId: userId.toString(),
                    problemId: session.problemId,
                    topicId: session.topicId,
                  },
                  { timeout: 5000 }
                )
                .then(() => {
                  logger.info('✅ ML weakness analysis triggered');
                  return 'weakness_analysis';
                })
                .catch((err) => {
                  logger.warn('Failed to trigger weakness analysis:', err.message);
                  return 'weakness_analysis_failed';
                })
            );
          }

          // Wait for all ML triggers (with timeout protection)
          try {
            const results = await Promise.race([
              Promise.all(mlTriggers),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('ML triggers timeout')), 10000)
              ),
            ]);

            mlJobIds.push(...results.filter((r) => r && !r.includes('failed')));
          } catch (error) {
            logger.warn('ML triggers incomplete:', error.message);
            // Don't let ML failures block the response
          }
        }
      } catch (error) {
        logger.warn('Failed to create PracticeAttemptEvent or trigger ML:', error.message);
        // Don't let event creation block the submission response
      }

      // Return successful submission response
      res.status(200).json({
        success: true,
        data: {
          status: isAccepted ? 'pass' : 'fail',
          totalTestCases: submissionResult.totalTests,
          passedTestCases: submissionResult.passedTests,
          runtime: submissionResult.runtime,
          memory: submissionResult.memory,
          attemptNumber: session.submissionAttempt,
          judgeDetails: submissionResult.results,
          mlJobIds,
        },
      });
    } catch (error) {
      logger.error('Error during code submission:', error.message);

      // Determine error response
      let statusCode = 500;
      let message = 'Failed to submit code';

      if (error.message.includes('authentication')) {
        statusCode = 503;
        message = 'Code execution service unavailable';
      } else if (error.message.includes('Rate limit')) {
        statusCode = 429;
        message = error.message;
      } else if (error.message.includes('timeout')) {
        statusCode = 504;
        message = 'Code execution timed out';
      } else if (error.message.includes('No test cases')) {
        statusCode = 400;
        message = 'No test cases available';
      }

      res.status(statusCode).json({
        success: false,
        message,
        error: error.message,
      });
    }
  } catch (error) {
    logger.error('Error in submitPractice controller:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to submit practice',
      error: error.message,
    });
  }
};

/**
 * GET /api/practice/session/:sessionId
 * Get practice session details
 */
export const getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user ? req.user._id : null;

    const session = await PracticeSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Practice session not found',
      });
    }

    // Verify ownership (if user is authenticated)
    if (userId && session.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Fetch source question to get full problem details
    let sourceQuestion = null;
    try {
      const { default: GeneratedQuestionLog } = await import('../models/GeneratedQuestionLog.js');
      const { default: QuestionBank } = await import('../models/QuestionBank.js');

      sourceQuestion = await GeneratedQuestionLog.findOne({ problemId: session.problemId });
      
      // PHASE 9: Only fetch wrapped v2 questions
      if (!sourceQuestion) {
        sourceQuestion = await QuestionBank.findOne({ 
          problemId: session.problemId,
          ...onlyWrappedQuestionsFilter()
        });
      }

      // If still not found, check if question exists but doesn't match filter (for debugging)
      if (!sourceQuestion) {
        const debugQuestion = await QuestionBank.findOne({ problemId: session.problemId });
        if (debugQuestion) {
          logger.warn(`❌ Question exists but doesn't match v2 filter:`, {
            problemId: session.problemId,
            schemaVersion: debugQuestion.schemaVersion,
            isActive: debugQuestion.isActive,
          });
        }
      }

      // Validate question is using wrapped execution
      if (sourceQuestion) {
        const errors = validateQuestionForPractice(sourceQuestion);
        if (errors.length > 0) {
          logger.error(`❌ PHASE 9 HARD FAIL: Question failed v2 validation`);
          logger.error(`   Question: ${sourceQuestion.title}`);
          logger.error(`   Errors: ${errors.join(', ')}`);
          sourceQuestion = null; // Reject invalid question
        }
      }
    } catch (err) {
      logger.warn(`Could not fetch source question for ${session.problemId}:`, err.message);
    }

    // Build comprehensive response with problem data
    const responseData = {
      sessionId: session._id,
      sessionKey: session.sessionKey,
      status: session.status,
      codeLanguage: session.codeLanguage,
      code: session.code,
      problemId: session.problemId,
      topicId: session.topicId,
      verdict: session.submissionResult?.verdict,
      passedTests: session.submissionResult?.passedTests,
      totalTests: session.submissionResult?.totalTests,
      hints: session.hints || [],
      schemaVersion: session.schemaVersion,
      isLegacy: session.isLegacy,
      executionMode: session.schemaVersion === 2 ? 'wrapped' : 'legacy',
      
      // Problem metadata from source question
      problemTitle: sourceQuestion?.title || sourceQuestion?.problemTitle || 'Problem',
      problemDescription: sourceQuestion?.content || sourceQuestion?.description || session.problemStatement || '',
      constraints: sourceQuestion?.constraints || '',
      hints: sourceQuestion?.hints || [],
      
      // Code templates
      starterCode: session.starterCode || sourceQuestion?.starterCode,
      wrapperTemplate: session.wrapperTemplate || sourceQuestion?.wrapperTemplate,
      functionMetadata: session.functionMetadata || sourceQuestion?.functionMetadata,
      
      // Test cases - return as-is from session (already proper format)
      // Session stores them correctly from startSession
      testCases: (session.testCases && session.testCases.length > 0) 
        ? session.testCases.map(tc => {
            const plainTC = tc.toObject ? tc.toObject() : tc;
            return {
              ...plainTC,
              output: plainTC.output || plainTC.expectedOutput,
              expectedOutput: plainTC.expectedOutput || plainTC.output
            };
          }) 
        : [],

      costRemaining: {
        hints: session.costGovernance.maxHintCalls - session.costGovernance.hintCallCount,
        llmCalls: session.costGovernance.maxLLMCalls - session.costGovernance.llmCallCount,
        tokensRemaining: session.costGovernance.maxTokensAllowed - session.llmUsageTokens.totalTokens,
      },
      dependencyScore: session.dependencyScore,
    };

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    logger.error('Error getting practice session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get practice session',
      error: error.message,
    });
  }
};

/**
 * POST /api/practice/hint/:sessionId
 * Request a hint for practice session
 */
export const requestHint = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { hintLevel = 1 } = req.body;
    const userId = req.user ? req.user._id : null;

    const session = await PracticeSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Practice session not found',
      });
    }

    // Verify ownership
    if (session.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Check cost governance
    if (!session.canRequestHint()) {
      return res.status(429).json({
        success: false,
        message: 'Hint limit reached',
      });
    }

    // Get hint via practiceSessionService
    const hint = await practiceSessionService.getHint(session, hintLevel);

    res.status(200).json({
      success: true,
      data: {
        level: hint.level,
        text: hint.hintText,
        dependencyWeight: hint.dependencyWeight,
      },
    });
  } catch (error) {
    logger.error('Error getting hint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get hint',
      error: error.message,
    });
  }
};

/**
 * GET /api/practice/inline-assist/:sessionId
 * Request inline code assistance - streams result via SSE
 * Uses code from session, not request body
 * Query params: cursorLine, token
 */
export const requestInlineAssist = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { cursorLine = 0, token } = req.query;

    // Optional auth - support demo users  
    let userId;
    try {
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
        userId = decoded.userId || decoded._id;
      } else if (req.user) {
        userId = req.user._id;
      }
    } catch (err) {
      // Continue without auth for demo
    }

    const session = await PracticeSession.findById(sessionId);
    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Practice session not found',
      });
      return;
    }

    // Verify ownership (skip if demo)
    if (userId && session.userId.toString() !== userId.toString()) {
      res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    // Check cost governance
    if (!session.canMakeLLMCall()) {
      res.status(429).json({
        success: false,
        message: 'LLM call limit reached',
      });
      return;
    }

    // ✅ Use code from session (already stored), not from request body
    const userCode = session.code || '';
    
    if (!userCode.trim()) {
      res.status(400).json({
        success: false,
        message: 'No code in session to assist with',
      });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Get inline assistance - this will stream back via SSE
    const suggestion = await practiceSessionService.getInlineAssistance(
      session,
      userCode,
      session.problemStatement || '',
      parseInt(cursorLine) || 0
    );

    // Send SSE response
    res.write(`data: ${JSON.stringify({
      type: 'suggestion',
      data: suggestion,
    })}\n\n`);

    res.write(`data: ${JSON.stringify({
      type: 'complete',
    })}\n\n`);

    res.end();
  } catch (error) {
    logger.error('Error getting inline assistance:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message,
    })}\n\n`);
    res.end();
  }
};

/**
 * POST /api/practice/review/:sessionId
 * Request code review for submitted solution
 */
export const requestCodeReview = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const session = await PracticeSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Practice session not found',
      });
    }

    // Verify ownership
    if (session.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Check cost governance
    if (!session.canMakeLLMCall()) {
      return res.status(429).json({
        success: false,
        message: 'LLM call limit reached',
      });
    }

    // Get code review via practiceSessionService
    const review = await practiceSessionService.getCodeReview(session);

    res.status(200).json({
      success: true,
      data: {
        summary: review.reviewSummary,
        scores: review.codeQualityScores,
        insights: review.interviewInsights,
        improvements: review.improvements,
        strengths: review.strengths,
      },
    });
  } catch (error) {
    logger.error('Error getting code review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get code review',
      error: error.message,
    });
  }
};

/**
 * POST /api/practice/score-explanation/:sessionId
 * Score and evaluate user's solution explanation
 * 
 * Request:
 *   {
 *     "explanation": "My approach uses...",
 *     "voiceTranscript": "I think..."
 *   }
 * 
 * Response:
 *   {
 *     "success": true,
 *     "data": {
 *       "clarityScore": 0.85,
 *       "completenessScore": 0.92,
 *       "correctnessScore": 0.88,
 *       "overallScore": 0.88,
 *       "feedback": "Strong explanation..."
 *     }
 *   }
 */
export const requestScoreExplanation = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { explanation, voiceTranscript } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!explanation || !explanation.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Explanation required',
      });
    }

    const session = await PracticeSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Practice session not found',
      });
    }

    // Verify ownership
    if (session.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Check cost governance
    if (!session.canMakeLLMCall()) {
      return res.status(429).json({
        success: false,
        message: 'LLM call limit reached',
      });
    }

    // Score explanation via practiceSessionService
    const score = await practiceSessionService.scoreExplanation(
      session,
      explanation,
      voiceTranscript
    );

    res.status(200).json({
      success: true,
      data: {
        clarityScore: score.clarity_score,
        completenessScore: score.completeness_score,
        correctnessScore: score.correctness_score,
        overallScore: score.overall_score,
        feedback: score.feedback,
      },
    });
  } catch (error) {
    logger.error('Error scoring explanation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to score explanation',
      error: error.message,
    });
  }
};

/**
 * POST /api/practice/hint/:sessionId
 * Stream hint as plain text (Transparent Proxy)
 * Body: {currentCode, language, hintLevel}
 */
export const streamHint = async (req, res) => {
  const { sessionId } = req.params;
  const { currentCode, language, hintLevel } = req.body;
  const userId = req.user ? req.user._id : null;

  try {
    const session = await PracticeSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Practice session not found',
      });
    }

    // Verify ownership (if user authenticated and not demo)
    if (userId && !userId.toString().includes('demo-user') && session.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Check cost governance before starting stream
    if (!session.canRequestHint()) {
      return res.status(403).json({
        success: false,
        message: 'Hint limit exceeded for this session',
      });
    }

    const ai_service_url = process.env.AI_SERVICE_URL || 'http://localhost:8001';

    // Set streaming headers
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("X-Accel-Buffering", "no"); // Disable buffering for Nginx if present

    try {
      const aiResponse = await axios.post(
        `${ai_service_url}/ai/hint/generate`,
        {
          problemTitle: session.problemTitle || session.problemId || 'Coding Problem',
          problemDescription: session.problemStatement || session.problemDescription || '',
          constraints: session.constraints || [],
          testCases: session.testCases || [],
          currentCode,
          language,
          hintLevel: hintLevel || 1
        },
        {
          responseType: "stream",
          timeout: 30000 // 30s timeout for initial connection
        }
      );

      // Binary transparency: pipe raw chunks
      aiResponse.data.on("data", (chunk) => {
        res.write(chunk);
      });

      aiResponse.data.on("end", async () => {
        // Increment usage count on successful completion
        session.incrementHintCount();
        await session.save();
        res.end();
      });

      aiResponse.data.on("error", (err) => {
        logger.error(`AI stream error for session ${sessionId}:`, err.message);
        if (!res.writableEnded) res.end();
      });

      // Handle client abort
      req.on('close', () => {
        if (aiResponse.data.destroy) aiResponse.data.destroy();
      });

    } catch (err) {
      logger.error(`Failed to connect to AI service for hint: ${err.message}`);
      // If we haven't started sending the stream yet, return an error
      if (!res.headersSent) {
        return res.status(502).json({
          success: false,
          message: 'AI Service currently unavailable',
        });
      }
      res.end();
    }
  } catch (error) {
    logger.error(`Error in streamHint controller: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    } else {
      res.end();
    }
  }
};

/**
 * GET /api/practice/review/:sessionId
 * Stream code review as Server-Sent Events (SSE)
 * Query params: code, token
 */
export const streamCodeReview = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { code, token } = req.query;
    const reviewCode = decodeURIComponent(code || '');

    // Optional auth - support demo users
    let userId;
    try {
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
        userId = decoded.userId || decoded._id;
      } else if (req.user) {
        userId = req.user._id;
      }
    } catch (err) {
      // Continue without auth for demo
    }

    const session = await PracticeSession.findById(sessionId);
    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Practice session not found',
      });
      return;
    }

    // Verify ownership (skip if demo)
    if (userId && session.userId.toString() !== userId.toString()) {
      res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    // Check cost governance
    if (!session.canMakeLLMCall()) {
      res.status(429).json({
        success: false,
        message: 'LLM call limit reached',
      });
      return;
    }

    // Setup SSE response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
      // Update session code if provided
      if (reviewCode.trim()) {
        session.code = reviewCode;
      }

      // Get code review from service
      const review = await practiceSessionService.getCodeReview(session);

      // Stream review content chunk by chunk
      const reviewContent = review.reviewSummary || review.summary || 'Code review:';
      const lines = reviewContent.split('\n');

      for (const line of lines) {
        if (line.trim()) {
          res.write(`data: ${JSON.stringify({
            type: 'chunk',
            content: line + '\n',
          })}\n\n`);
        }
      }

      // Send additional review items if available
      if (review.improvements && Array.isArray(review.improvements)) {
        res.write(`data: ${JSON.stringify({
          type: 'chunk',
          content: '\\n⚠️ Improvements:\\n',
        })}\n\n`);
        
        for (const improvement of review.improvements) {
          res.write(`data: ${JSON.stringify({
            type: 'chunk',
            content: '  • ' + (improvement.text || improvement) + '\\n',
          })}\n\n`);
        }
      }

      if (review.strengths && Array.isArray(review.strengths)) {
        res.write(`data: ${JSON.stringify({
          type: 'chunk',
          content: '\\n✅ Strengths:\\n',
        })}\n\n`);
        
        for (const strength of review.strengths) {
          res.write(`data: ${JSON.stringify({
            type: 'chunk',
            content: '  • ' + (strength.text || strength) + '\\n',
          })}\n\n`);
        }
      }

      // Send completion message
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        content: 'Review completed',
      })}\n\n`);

      res.end();
    } catch (error) {
      logger.error('Error streaming code review:', error);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        content: error.message || 'Failed to generate review',
        error: error.message,
      })}\n\n`);
      res.end();
    }
  } catch (error) {
    logger.error('Error in streamCodeReview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stream code review',
      error: error.message,
    });
  }
};

/**
 * POST /api/practice/run/:sessionId
 * Run code against visible test cases (for testing during development)
 * 
 * SUPPORTS:
 * - Wrapped code execution (new LeetCode-style)
 * - Legacy stdin-based execution (backward compat)
 * 
 * Does NOT count as official submission:
 * - No PracticeAttemptEvent created
 * - No ML updates triggered
 * - Only visible test cases executed
 * 
 * Request:
 * {
 *   "code": "def solution(): pass",
 *   "testCases": [{"input": "1", "expectedOutput": "1"}]  // Optional
 * }
 * 
 * Response:
 * {
 *   "verdict": "accepted|wrong_answer|runtime_error|time_limit_exceeded|memory_limit_exceeded",
 *   "passedTests": 2,
 *   "totalTests": 3,
 *   "runtime": 0.234,
 *   "memory": 12,
 *   "results": [
 *     {
 *       "input": "1",
 *       "expectedOutput": "1",
 *       "actualOutput": "1",
 *       "verdict": "accepted",
 *       "time": 0.05,
 *       "memory": 10
 *     }
 *   ]
 * }
 */
export const runCode = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { code, testCases } = req.body;
    const userId = req.user ? req.user._id : null;

    // Validation
    if (!code || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Code is required',
      });
    }

    // Get session
    const session = await PracticeSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Practice session not found',
      });
    }

    // Verify ownership (if user exists)
    if (userId && session.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Import Judge0 service
    const { default: judge0Service } = await import('../services/judge0Service.js');

    // Check if Judge0 is configured
    if (!judge0Service.isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Code execution service is not configured. Contact administrators.',
      });
    }

    logger.info(`🏃 Running code for session ${sessionId}, language=${session.codeLanguage}`);

    try {
      // ✅ ENFORCE: WRAPPED EXECUTION ONLY (schemaVersion 2)
      // Hard fail if session not properly initialized
      if (!session.schemaVersion || session.schemaVersion !== 2) {
        logger.error(`❌ HARD FAIL: Session ${sessionId} has schemaVersion: ${session.schemaVersion}. Only v2 supported.`);
        return res.status(400).json({
          success: false,
          message: 'Session not using wrapped execution (schemaVersion 2).',
        });
      }

      const wrapperTemplate = session.wrapperTemplate[session.codeLanguage];
      if (!wrapperTemplate || !wrapperTemplate.includes('__USER_CODE__')) {
        logger.error(`❌ HARD FAIL: Missing or invalid wrapper template for ${session.codeLanguage}`);
        return res.status(400).json({
          success: false,
          message: 'Session missing valid wrapper template',
        });
      }

      if (!Array.isArray(session.testCases) || session.testCases.length === 0) {
        logger.error(`❌ HARD FAIL: No test cases in session`);
        return res.status(400).json({
          success: false,
          message: 'Session missing test cases',
        });
      }

      try {
        logger.info(`Running wrapped tests: ${session.testCases.length} total`);
        
        // ✅ Filter to visible test cases only (for display)
        const visibleTestCases = session.testCases
          .filter((tc) => tc && (tc.visibility === 'public' || tc.visibility === undefined))
          .map((tc) => ({
            input: tc.input,    // Already an object
            expectedOutput: tc.expectedOutput,  // Already an object
            visibility: tc.visibility || 'public',
          }));

        if (visibleTestCases.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No visible test cases found',
          });
        }

        // Add performance timer
        const runStartTime = Date.now();

        const result = await judge0Service.runWrappedTests({
          userCode: code,
          language: session.codeLanguage,
          wrapperTemplate: wrapperTemplate,
          testCases: visibleTestCases,
          timeLimit: 2,
          memoryLimit: 256,
        });

        // Track execution time
        const runExecutionTime = Date.now() - runStartTime;
        logger.info(`⏱️  Wrapped execution completed in ${runExecutionTime}ms`);
        
        // Update session telemetry
        session.telemetry = session.telemetry || {};
        session.telemetry.run_count = (session.telemetry.run_count || 0) + 1;
        session.telemetry.lastRunTime = runExecutionTime;
        session.lastActivityAt = new Date();

        await session.save().catch((err) => {
          logger.warn('Failed to update session telemetry:', err.message);
        });

        return res.status(200).json({
          success: true,
          data: {
            verdict: result.verdict,
            passedTests: result.passedTests,
            totalTests: result.totalTests,
            runtime: result.runtime,
            memory: result.memory,
            results: result.results,
            executionMode: 'wrapped',
            schemaVersion: session.schemaVersion,
            executionTimeMs: runExecutionTime,
          },
        });
      } catch (error) {
        logger.error('❌ Error in wrapped execution:', error.message);
        logger.error('Error type:', error.constructor.name);
        logger.error('Stack:', error.stack);
        
        return res.status(500).json({
          success: false,
          message: 'Error executing wrapped tests: ' + error.message,
          errorType: error.constructor.name,
          details: process.env.NODE_ENV === 'development' ? {
            stack: error.stack,
            code: error.code,
            apiResponse: error.response?.data || undefined,
          } : undefined,
        });
      }
    } catch (error) {
      logger.error('Error running code:', error.message);

      // Determine error status code
      let statusCode = 500;
      let message = 'Failed to run code';

      if (error.message.includes('authentication')) {
        statusCode = 503;
        message = 'Code execution service authentication failed';
      } else if (error.message.includes('Rate limit')) {
        statusCode = 429;
        message = error.message;
      } else if (error.message.includes('timeout')) {
        statusCode = 504;
        message = 'Code execution timed out';
      } else if (error.message.includes('Unsupported language')) {
        statusCode = 400;
        message = error.message;
      }

      res.status(statusCode).json({
        success: false,
        message,
        error: error.message,
      });
    }
  } catch (error) {
    logger.error('Error in runCode controller:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to run code',
      error: error.message,
    });
  }
};

/**
 * POST /api/practice/voice/:sessionId
 * Process voice transcript and provide mentor guidance
 * 
 * Body:
 * {
 *   "transcript": "I'm not sure how to start this problem",
 *   "intent": "help|hint|clarification|submit",
 *   "context": "current_code"
 * }
 * 
 * Response:
 * {
 *   "intent": "help",
 *   "response": "Let me help you get started...",
 *   "actionSuggested": "hint|review|continue",
 *   "voiceReady": true  // Indicates if TTS should be played
 * }
 */
/**
 * POST /api/practice/voice/:sessionId
 * Process voice input and interact with mentor (Streaming)
 */
export const handleVoiceInteraction = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { transcript, userCode, history } = req.body;
    const userId = req.user ? (req.user._id || req.user.id) : null;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ success: false, message: 'Transcript is required' });
    }

    const session = await PracticeSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (userId && session.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!session.canMakeLLMCall()) {
      return res.status(429).json({ success: false, message: 'LLM call limit reached' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    logger.info(`🎤 Voice interaction starting for session ${sessionId}`);

    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
    
    let intentInfo = { intent: 'general', dependencyWeight: 0 };
    let fullResponse = '';
    let buffer = '';
    try {
      const response = await axios({
        method: 'post',
        url: `${AI_SERVICE_URL}/ai/lab/voice-interact`,
        data: {
          transcript,
          userCode: userCode || session.code || '',
          history: history || [],
          problemContext: {
            title: session.problemId,
            difficulty: session.difficulty,
            description: session.description || session.problemStatement,
            language: session.codeLanguage,
            submissionResult: session.submissionResult || null,
            testCasesPassed: session.submissionResult?.passedTests || 0,
            totalTestCases: session.submissionResult?.totalTests || 0,
            lastVerdict: session.submissionResult?.verdict || null,
            constraints: session.constraints || [],
            starterCode: session.starterCode || null,
            functionMetadata: session.functionMetadata || null
          }
        },
        responseType: 'stream'
      });

      logger.info(`🔗 Connected to AI Service for voice, starting stream for session ${sessionId}`);

      response.data.on('data', async (chunk) => {
        const rawChunk = chunk.toString();
        logger.debug(`[Voice] Received chunk: ${rawChunk.substring(0, 50)}...`);
        buffer += rawChunk;
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              logger.debug(`[Voice] Parsed message type: ${data.type || 'unknown'}`);
              if (data.type === 'intent') {
                intentInfo = data.data;
                logger.info(`[Voice] Intent detected: ${intentInfo.intent}`);
              } else if (data.content) {
                fullResponse += data.content;
              } else if (data.type === 'error') {
                logger.error(`[Voice] AI Service returned error: ${data.message}`);
              }
              res.write(line + '\n\n');
            } catch (e) {
              logger.warn(`[Voice] Failed to parse SSE line: ${line.substring(0, 50)}...`);
            }
          }
        }
      });

      response.data.on('end', async () => {
        logger.info(`🏁 Voice stream completed for session ${sessionId}. Response length: ${fullResponse.length}`);
        // Handle any remaining data in buffer
        if (buffer.startsWith('data: ')) {
          try {
            const data = JSON.parse(buffer.substring(6));
            if (data.type === 'intent') intentInfo = data.data;
            else if (data.content) fullResponse += data.content;
            res.write(buffer + '\n\n');
          } catch (e) {}
        }

        // Log interaction and update telemetry
        try {
          await practiceSessionService.logVoiceInteraction(session, {
            transcript,
            response: fullResponse,
            intent: intentInfo.intent,
            dependencyWeight: intentInfo.dependencyWeight,
            tokenUsage: 150 // Estimate
          });
        } catch (err) {
          logger.error('Error post-processing voice interaction:', err);
        }
        res.end();
      });

    } catch (apiError) {
      logger.error('AI Service Error (Voice):', apiError.message);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Voice service unavailable' })}\n\n`);
      res.end();
    }

  } catch (error) {
    logger.error('Error in handleVoiceInteraction:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Voice interaction failed' });
    } else {
      res.end();
    }
  }
};

/**
 * POST /api/practice/voice/transcribe/:sessionId
 * Transcribe audio blob to text using Groq Whisper
 */
export const transcribeVoice = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const audioFile = req.file;

    if (!audioFile) {
      return res.status(400).json({ success: false, message: 'Audio file is required' });
    }

    const session = await PracticeSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Check cost governance (transcription also counts as LLM usage)
    if (!session.canMakeLLMCall()) {
      return res.status(429).json({ success: false, message: 'LLM call limit reached' });
    }

    logger.info(`🎙️ Transcribing audio for session ${sessionId} (${audioFile.size} bytes)`);

    const formData = new FormData();
    formData.append('file', audioFile.buffer, {
      filename: 'audio.webm',
      contentType: audioFile.mimetype,
    });
    formData.append('model', process.env.VOICE_STT_MODEL || 'whisper-large-v3');

    logger.info(`🎙️ Sending to Groq Whisper: ${audioFile.size} bytes, model: ${process.env.VOICE_STT_MODEL || 'whisper-large-v3'}`);
    
    let groqResponse;
    try {
      groqResponse = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        }
      });
    } catch (axiosError) {
      const errorData = axiosError.response?.data;
      logger.error('Groq Whisper API Error:', {
        status: axiosError.response?.status,
        data: errorData,
        message: axiosError.message
      });
      throw new Error(errorData?.error?.message || axiosError.message);
    }

    const transcript = groqResponse.data.text;
    logger.info(`📝 Transcription successful: "${transcript.substring(0, 50)}..."`);

    res.status(200).json({
      success: true,
      data: { transcript }
    });

  } catch (error) {
    logger.error('Transcription Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to transcribe audio',
      error: error.response?.data?.error?.message || error.message
    });
  }
};