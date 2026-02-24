/**
 * Rate Limiting Middleware
 * 
 * Prevents abuse by limiting execution and submission requests per user
 * Uses Redis if available, falls back to in-memory store
 * 
 * Configuration from environment:
 * - RATE_LIMIT_EXECUTION_PER_MINUTE: Max code executions per minute (default: 20)
 * - RATE_LIMIT_SUBMISSION_PER_MINUTE: Max submissions per minute (default: 5)
 */

import logger from '../utils/logger.js';

const EXECUTION_LIMIT = parseInt(process.env.RATE_LIMIT_EXECUTION_PER_MINUTE || '20', 10);
const SUBMISSION_LIMIT = parseInt(process.env.RATE_LIMIT_SUBMISSION_PER_MINUTE || '5', 10);
const WINDOW_MS = 60 * 1000; // 1 minute

// Simple in-memory store for rate limiting
class InMemoryStore {
  constructor() {
    this.store = new Map();
  }

  async increment(key) {
    const now = Date.now();
    const entry = this.store.get(key) || { count: 0, resetAt: now + WINDOW_MS };

    // Check if window has expired
    if (now >= entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return { count: 1, remaining: EXECUTION_LIMIT - 1, resetAt: entry.resetAt };
    }

    entry.count++;
    const remaining = Math.max(0, EXECUTION_LIMIT - entry.count);
    this.store.set(key, entry);

    return { count: entry.count, remaining, resetAt: entry.resetAt };
  }

  async reset() {
    // Periodically clean up old entries (every 5 minutes)
    if (this.store.size > 0) {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (now >= value.resetAt) {
          this.store.delete(key);
        }
      }
    }
  }
}

// Lazy-loaded Redis store
let redisClient = null;

async function initRedis() {
  if (redisClient) return redisClient;

  try {
    const redis = await import('redis');
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    });

    redisClient.on('error', (err) => {
      logger.warn('Redis connection error, falling back to in-memory store:', err.message);
      redisClient = null;
    });

    await redisClient.connect();
    logger.info('✅ Connected to Redis for rate limiting');
    return redisClient;
  } catch (error) {
    logger.warn('Redis not available for rate limiting, using in-memory store');
    return null;
  }
}

const store = new InMemoryStore();

// Cleanup timer
setInterval(() => {
  store.reset().catch((err) => {
    logger.warn('Failed to reset rate limit store:', err.message);
  });
}, 5 * 60 * 1000); // Every 5 minutes

/**
 * Rate limit for code execution (run mode)
 * Allows up to EXECUTION_LIMIT requests per minute per user
 */
export const executionRateLimit = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString() || req.ip;
    const key = `exec:${userId}`;

    const result = await store.increment(key);

    // Set response headers
    res.set({
      'X-RateLimit-Limit': EXECUTION_LIMIT,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
    });

    if (result.count > EXECUTION_LIMIT) {
      logger.warn(`Rate limit exceeded for execution: ${userId} (${result.count}/${EXECUTION_LIMIT})`);

      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Maximum code executions per minute exceeded.',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        limit: EXECUTION_LIMIT,
        remaining: 0,
      });
    }

    logger.debug(`Execution attempt: ${userId} (${result.count}/${EXECUTION_LIMIT})`);
    next();
  } catch (error) {
    logger.error('Error in execution rate limit:', error.message);
    // Allow request if rate limiting fails
    next();
  }
};

/**
 * Rate limit for submissions (submit mode)
 * Allows up to SUBMISSION_LIMIT requests per minute per user
 * Stricter than execution rate limit
 */
export const submissionRateLimit = async (req, res, next) => {
  try {
    const userId = req.user?._id?.toString() || req.ip;
    const key = `submit:${userId}`;

    // Check submission limit (stricter than execution)
    const result = await store.increment(key);

    // Override limit for submission check
    const submissionLimit = Math.min(SUBMISSION_LIMIT, EXECUTION_LIMIT);

    res.set({
      'X-RateLimit-Limit': submissionLimit,
      'X-RateLimit-Remaining': Math.max(0, submissionLimit - result.count),
      'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
    });

    if (result.count > submissionLimit) {
      logger.warn(`Rate limit exceeded for submission: ${userId} (${result.count}/${submissionLimit})`);

      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Maximum submissions per minute exceeded.',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        limit: submissionLimit,
        remaining: 0,
      });
    }

    logger.debug(`Submission attempt: ${userId} (${result.count}/${submissionLimit})`);
    next();
  } catch (error) {
    logger.error('Error in submission rate limit:', error.message);
    // Allow request if rate limiting fails
    next();
  }
};

/**
 * Generic rate limiter factory
 * @param {number} limit - Number of requests allowed
 * @param {string} windowKey - Unique key for this rate limit window
 * @returns {Function} Express middleware
 */
export function createRateLimiter(limit, windowKey) {
  return async (req, res, next) => {
    try {
      const userId = req.user?._id?.toString() || req.ip;
      const key = `${windowKey}:${userId}`;

      const result = await store.increment(key);

      res.set({
        'X-RateLimit-Limit': limit,
        'X-RateLimit-Remaining': Math.max(0, limit - result.count),
        'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
      });

      if (result.count > limit) {
        return res.status(429).json({
          success: false,
          message: `Rate limit exceeded for ${windowKey}`,
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
          limit,
          remaining: 0,
        });
      }

      next();
    } catch (error) {
      logger.error(`Error in rate limiter (${windowKey}):`, error.message);
      next();
    }
  };
}

export default {
  executionRateLimit,
  submissionRateLimit,
  createRateLimiter,
};
