/**
 * AI Proxy Routes
 * Routes that proxy requests from frontend → Node backend → Python AI service
 * All routes are protected by JWT authentication middleware
 */

import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  callMasteryUpdate,
  callRetentionUpdate,
  callWeaknessAnalyze,
  callPlannerGenerate,
  callReadinessPredict,
  callMentorChat,
  callPracticeReview,
  callInterviewChat,
  callLearningFeedback,
  checkAIServiceHealth,
} from '../services/aiProxyService.js';

const router = express.Router();

/**
 * Health Check Endpoint
 * GET /api/ai/health
 */
router.get('/health', authMiddleware, async (req, res) => {
  try {
    const health = await checkAIServiceHealth();
    return res.status(health.success ? 200 : 503).json(health);
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * ML Intelligence Routes
 */

/**
 * Update Mastery Score
 * POST /api/ai/ml/mastery/update
 */
router.post('/ml/mastery/update', authMiddleware, async (req, res) => {
  try {
    const { topicId, ...masteryData } = req.body;
    
    if (!topicId) {
      return res.status(400).json({
        success: false,
        error: 'topicId is required',
      });
    }

    const result = await callMasteryUpdate(req.user.id, topicId, masteryData);
    
    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Mastery update error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Update Retention Data
 * POST /api/ai/ml/retention/update
 */
router.post('/ml/retention/update', authMiddleware, async (req, res) => {
  try {
    const { submissionId, ...retentionData } = req.body;
    
    if (!submissionId) {
      return res.status(400).json({
        success: false,
        error: 'submissionId is required',
      });
    }

    const result = await callRetentionUpdate(req.user.id, submissionId, retentionData);
    
    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Retention update error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Analyze Weak Topics
 * POST /api/ai/ml/weakness/analyze
 */
router.post('/ml/weakness/analyze', authMiddleware, async (req, res) => {
  try {
    const result = await callWeaknessAnalyze(req.user.id);
    
    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Weakness analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Generate Study Plan
 * POST /api/ai/ml/planner/generate
 */
router.post('/ml/planner/generate', authMiddleware, async (req, res) => {
  try {
    const result = await callPlannerGenerate(req.user.id, req.body);
    
    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Planner generation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Predict Interview Readiness
 * POST /api/ai/ml/readiness/predict
 */
router.post('/ml/readiness/predict', authMiddleware, async (req, res) => {
  try {
    const result = await callReadinessPredict(req.user.id);
    
    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Readiness prediction error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * LLM Services Routes
 */

/**
 * Mentor Chat
 * POST /api/ai/mentor/chat
 */
router.post('/mentor/chat', authMiddleware, async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required',
      });
    }

    const result = await callMentorChat(req.user.id, message, context || {});
    
    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Mentor chat error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Practice Review
 * POST /api/ai/practice/review
 */
router.post('/practice/review', authMiddleware, async (req, res) => {
  try {
    const { submissionId, ...practiceData } = req.body;
    
    if (!submissionId) {
      return res.status(400).json({
        success: false,
        error: 'submissionId is required',
      });
    }

    const result = await callPracticeReview(req.user.id, submissionId, practiceData);
    
    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Practice review error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Interview Chat
 * POST /api/ai/interview/chat
 */
router.post('/interview/chat', authMiddleware, async (req, res) => {
  try {
    const { message, interviewType } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required',
      });
    }

    const result = await callInterviewChat(req.user.id, message, interviewType || 'tech');
    
    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Interview chat error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Learning Feedback
 * POST /api/ai/learning/feedback
 */
router.post('/learning/feedback', authMiddleware, async (req, res) => {
  try {
    const { topicId, ...performanceData } = req.body;
    
    if (!topicId) {
      return res.status(400).json({
        success: false,
        error: 'topicId is required',
      });
    }

    const result = await callLearningFeedback(req.user.id, topicId, performanceData);
    
    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Learning feedback error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
