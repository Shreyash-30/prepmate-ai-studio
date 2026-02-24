/**
 * Cost Governance Middleware
 * 
 * Enforces per-user and per-session limits:
 * - Max tokens per session
 * - Max LLM calls per session
 * - Max cost per session
 * - Rate limiting per user
 * 
 * Prevents AI abuse and cost overruns.
 */

import logger from '../utils/logger.js';
import PracticeSession from '../models/PracticeSession.js';

/**
 * Middleware: Check if user can make LLM calls
 */
export const checkCostGovernance = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const userId = req.userId;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId required' });
    }

    const session = await PracticeSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify session belongs to user
    if (session.userId.toString() !== userId.toString()) {
      logger.warn(`🚨 Unauthorized session access attempt: ${userId} -> ${sessionId}`);
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if session can make LLM calls
    if (!session.canMakeLLMCall()) {
      logger.warn(`⚠️ Cost limit exceeded for session ${sessionId}`, {
        hintCalls: session.costGovernance.hintCallCount,
        llmCalls: session.costGovernance.llmCallCount,
        totalTokens: session.llmUsageTokens.totalTokens,
        totalCost: session.llmCostEstimate.totalEstimatedCost,
      });

      return res.status(429).json({
        error: 'Cost limit exceeded',
        details: {
          hintCalls: `${session.costGovernance.hintCallCount}/${session.costGovernance.maxHintCalls}`,
          llmCalls: `${session.costGovernance.llmCallCount}/${session.costGovernance.maxLLMCalls}`,
          tokensUsed: session.llmUsageTokens.totalTokens,
          tokensAllowed: session.costGovernance.maxTokensAllowed,
          costUsed: `$${session.llmCostEstimate.totalEstimatedCost.toFixed(2)}`,
          maxCost: `$${session.costGovernance.costThreshold.toFixed(2)}`,
        },
      });
    }

    // Attach session to request for route handlers
    req.session = session;
    next();
  } catch (error) {
    logger.error('Error in cost governance check:', error.message);
    res.status(500).json({ error: 'Cost governance check failed' });
  }
};

/**
 * Middleware: Check if hints are available
 */
export const checkHintLimit = async (req, res, next) => {
  try {
    const session = req.session;

    if (!session.canRequestHint()) {
      logger.warn(`⚠️ Hint limit exceeded for session ${session._id}`);

      return res.status(429).json({
        error: 'Hint limit exceeded',
        details: {
          hintCalls: `${session.costGovernance.hintCallCount}/${session.costGovernance.maxHintCalls}`,
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error in hint limit check:', error.message);
    res.status(500).json({ error: 'Hint limit check failed' });
  }
};

/**
 * Update LLM usage after call
 */
export const recordLLMUsage = async (sessionId, endpoint, tokensUsed, estimatedCost) => {
  try {
    const session = await PracticeSession.findById(sessionId);
    if (!session) {
      logger.warn(`Session not found for usage recording: ${sessionId}`);
      return;
    }

    // Update appropriate token counter
    switch (endpoint) {
      case '/ai/hint/generate':
        session.llmUsageTokens.hintTokens += tokensUsed;
        session.llmCostEstimate.hintCost += estimatedCost;
        session.costGovernance.hintCallCount += 1;
        break;
      case '/ai/practice/review':
        session.llmUsageTokens.reviewTokens += tokensUsed;
        session.llmCostEstimate.reviewCost += estimatedCost;
        break;
      case '/ai/explanation/score':
        session.llmUsageTokens.explanationTokens += tokensUsed;
        session.llmCostEstimate.explanationCost += estimatedCost;
        break;
      case '/ai/assist/inline':
        session.llmUsageTokens.inlineAssistTokens += tokensUsed;
        session.llmCostEstimate.inlineAssistCost += estimatedCost;
        break;
    }

    // Update totals
    session.llmUsageTokens.totalTokens += tokensUsed;
    session.llmCostEstimate.totalEstimatedCost += estimatedCost;
    session.costGovernance.llmCallCount += 1;
    session.lastActivityAt = new Date();

    await session.save();

    logger.info(`💰 LLM usage recorded for session ${sessionId}`, {
      endpoint,
      tokensUsed,
      estimatedCost: `$${estimatedCost.toFixed(4)}`,
      totalTokens: session.llmUsageTokens.totalTokens,
      totalCost: `$${session.llmCostEstimate.totalEstimatedCost.toFixed(2)}`,
    });
  } catch (error) {
    logger.error('Error recording LLM usage:', error.message);
  }
};

/**
 * Rate limiting per user (max 5 hint requests per minute)
 */
const userHintRateLimit = new Map();

export const enforceHintRateLimit = (req, res, next) => {
  const userId = req.userId;
  const now = Date.now();

  if (!userHintRateLimit.has(userId)) {
    userHintRateLimit.set(userId, []);
  }

  const timestamps = userHintRateLimit.get(userId);
  const oneMinuteAgo = now - 60 * 1000;

  // Remove old entries
  const recentRequests = timestamps.filter((t) => t > oneMinuteAgo);
  userHintRateLimit.set(userId, recentRequests);

  if (recentRequests.length >= 5) {
    logger.warn(`⚠️ Hint rate limit exceeded for user ${userId}`);
    return res.status(429).json({
      error: 'Rate limit exceeded',
      details: 'Maximum 5 hint requests per minute',
    });
  }

  // Record this request
  recentRequests.push(now);
  next();
};

/**
 * Cache hint responses (1 hour TTL)
 */
const hintCache = new Map();

export const getCachedHint = (sessionId, level) => {
  const key = `${sessionId}:${level}`;
  const cached = hintCache.get(key);

  if (cached && cached.timestamp > Date.now() - 60 * 60 * 1000) {
    return cached.data;
  }

  return null;
};

export const cacheHint = (sessionId, level, hintData) => {
  const key = `${sessionId}:${level}`;
  hintCache.set(key, {
    data: hintData,
    timestamp: Date.now(),
  });

  // Cleanup old entries every hour
  if (hintCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of hintCache.entries()) {
      if (v.timestamp < now - 60 * 60 * 1000) {
        hintCache.delete(k);
      }
    }
  }
};

/**
 * Prompt injection defense
 */
export const sanitizePrompt = (userInput) => {
  // Remove dangerous patterns
  const dangerousPatterns = [
    /ignore previous instructions/gi,
    /system prompt/gi,
    /you are now/gi,
    /forget everything/gi,
    /override system/gi,
    /execute command/gi,
  ];

  let sanitized = userInput;
  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Limit input size
  if (sanitized.length > 5000) {
    sanitized = sanitized.substring(0, 5000);
  }

  return sanitized.trim();
};

/**
 * Validate LLM response structure
 */
export const validateLLMResponse = (response, expectedSchema) => {
  if (!response || typeof response !== 'object') {
    return false;
  }

  for (const field of expectedSchema) {
    if (!(field in response)) {
      return false;
    }
  }

  return true;
};

export default {
  checkCostGovernance,
  checkHintLimit,
  recordLLMUsage,
  enforceHintRateLimit,
  getCachedHint,
  cacheHint,
  sanitizePrompt,
  validateLLMResponse,
};
