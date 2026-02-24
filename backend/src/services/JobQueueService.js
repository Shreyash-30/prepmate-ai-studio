/**
 * Job Queue Service
 * 
 * Manages async ML job processing using BullMQ + Redis
 * - Mastery engine updates
 * - Retention model updates
 * - Weakness detection
 * - Readiness prediction
 * 
 * Non-blocking submission flow:
 * 1. Save session
 * 2. Enqueue ML jobs
 * 3. Return response immediately
 * 4. Worker processes jobs asynchronously
 */

import { Queue, Worker } from 'bullmq';
import redis from 'redis';
import logger from '../utils/logger.js';

// Redis connection state
let redisClient = null;
let redisConnected = false;
let queues = {};
let redisErrorLogged = false; // Prevent spam

// Initialize Redis connection asynchronously (non-blocking)
async function initializeRedis() {
  try {
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    });

    redisClient.on('error', (err) => {
      redisConnected = false;
      // Only log once to avoid spam
      if (!redisErrorLogged) {
        redisErrorLogged = true;
        logger.warn('⚠️  Redis unavailable (will retry in background)');
        logger.warn('   To enable job queuing: docker-compose up -d');
      }
    });
    
    redisClient.on('connect', () => {
      redisConnected = true;
      redisErrorLogged = false; // Reset flag on reconnect
      logger.info('✅ Redis connected - Job queuing enabled');
    });

    await redisClient.connect();
    redisConnected = true;
    
    // Initialize queues only after Redis connected
    queues = {
      masteryUpdate: new Queue('ml-mastery-update', { connection: redisClient }),
      retentionUpdate: new Queue('ml-retention-update', { connection: redisClient }),
      weaknessAnalysis: new Queue('ml-weakness-analysis', { connection: redisClient }),
      readinessPrediction: new Queue('ml-readiness-prediction', { connection: redisClient }),
      codeReview: new Queue('ai-code-review', { connection: redisClient }),
      explanationScore: new Queue('ai-explanation-score', { connection: redisClient }),
    };
    
    logger.info('✅ Job queues initialized');
  } catch (err) {
    if (!redisErrorLogged) {
      logger.warn('⚠️  Redis not available - Running in degraded mode');
      logger.warn('   To enable job queuing: docker-compose up -d');
    }
  }
}

// Start Redis connection in background
initializeRedis();

/**
 * Job Queue Service
 */
class JobQueueService {
  /**
   * Check if Redis is connected and queue exists
   */
  static isQueueAvailable(queueName) {
    if (!redisConnected || !queues[queueName]) {
      return false;
    }
    return true;
  }

  /**
   * Enqueue mastery update job
   */
  static async enqueueMasteryUpdate(payload) {
    try {
      if (!this.isQueueAvailable('masteryUpdate')) {
        logger.warn('Redis unavailable: Mastery update scheduled but not queued. Processing disabled.');
        return `mock-job-${Date.now()}`; // Return mock ID for dev mode
      }

      const job = await queues.masteryUpdate.add('update', payload, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      logger.info(`📊 Mastery update job enqueued: ${job.id}`);
      return job.id;
    } catch (error) {
      logger.warn(`Mastery update job failed, queuing disabled: ${error.message}`);
      return `mock-job-${Date.now()}`;
    }
  }

  /**
   * Enqueue retention model update job
   */
  static async enqueueRetentionUpdate(payload) {
    try {
      if (!this.isQueueAvailable('retentionUpdate')) {
        logger.warn('Redis unavailable: Retention update scheduled but not queued. Processing disabled.');
        return `mock-job-${Date.now()}`;
      }

      const job = await queues.retentionUpdate.add('update', payload, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      logger.info(`🧠 Retention update job enqueued: ${job.id}`);
      return job.id;
    } catch (error) {
      logger.warn(`Retention update job failed, queuing disabled: ${error.message}`);
      return `mock-job-${Date.now()}`;
    }
  }

  /**
   * Enqueue weakness detection job
   */
  static async enqueueWeaknessAnalysis(payload) {
    try {
      if (!this.isQueueAvailable('weaknessAnalysis')) {
        logger.warn('Redis unavailable: Weakness analysis scheduled but not queued. Processing disabled.');
        return `mock-job-${Date.now()}`;
      }

      const job = await queues.weaknessAnalysis.add('analyze', payload, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      logger.info(`🔍 Weakness analysis job enqueued: ${job.id}`);
      return job.id;
    } catch (error) {
      logger.warn(`Weakness analysis job failed, queuing disabled: ${error.message}`);
      return `mock-job-${Date.now()}`;
    }
  }

  /**
   * Enqueue readiness prediction job
   */
  static async enqueueReadinessPrediction(payload) {
    try {
      if (!this.isQueueAvailable('readinessPrediction')) {
        logger.warn('Redis unavailable: Readiness prediction scheduled but not queued. Processing disabled.');
        return `mock-job-${Date.now()}`;
      }

      const job = await queues.readinessPrediction.add('predict', payload, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      logger.info(`⚡ Readiness prediction job enqueued: ${job.id}`);
      return job.id;
    } catch (error) {
      logger.warn(`Readiness prediction job failed, queuing disabled: ${error.message}`);
      return `mock-job-${Date.now()}`;
    }
  }

  /**
   * Enqueue code review job
   */
  static async enqueueCodeReview(payload) {
    try {
      if (!this.isQueueAvailable('codeReview')) {
        logger.warn('Redis unavailable: Code review scheduled but not queued. Processing disabled.');
        return `mock-job-${Date.now()}`;
      }

      const job = await queues.codeReview.add('review', payload, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      logger.info(`📝 Code review job enqueued: ${job.id}`);
      return job.id;
    } catch (error) {
      logger.warn(`Code review job failed, queuing disabled: ${error.message}`);
      return `mock-job-${Date.now()}`;
    }
  }

  /**
   * Enqueue explanation score job
   */
  static async enqueueExplanationScore(payload) {
    try {
      if (!this.isQueueAvailable('explanationScore')) {
        logger.warn('Redis unavailable: Explanation scoring scheduled but not queued. Processing disabled.');
        return `mock-job-${Date.now()}`;
      }

      const job = await queues.explanationScore.add('score', payload, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      logger.info(`⭐ Explanation score job enqueued: ${job.id}`);
      return job.id;
    } catch (error) {
      logger.warn(`Explanation score job failed, queuing disabled: ${error.message}`);
      return `mock-job-${Date.now()}`;
    }
  }

  /**
   * Enqueue all ML jobs for a submission
   */
  static async enqueueSubmissionMLJobs(sessionId, userId, topicId, sessionData) {
    try {
      const jobIds = {
        masteryUpdateJobId: await JobQueueService.enqueueMasteryUpdate({
          sessionId,
          userId,
          topicId,
          ...sessionData,
        }),
        retentionUpdateJobId: await JobQueueService.enqueueRetentionUpdate({
          sessionId,
          userId,
          topicId,
          ...sessionData,
        }),
        weaknessAnalysisJobId: await JobQueueService.enqueueWeaknessAnalysis({
          sessionId,
          userId,
          topicId,
          ...sessionData,
        }),
        readinessPredictionJobId: await JobQueueService.enqueueReadinessPrediction({
          sessionId,
          userId,
          topicId,
          ...sessionData,
        }),
      };

      logger.info(`✅ All ML jobs enqueued for session ${sessionId}`);
      return jobIds;
    } catch (error) {
      logger.error('Error enqueuing submission ML jobs:', error.message);
      // Non-blocking: don't throw, return partial results
      return {
        masteryUpdateJobId: null,
        retentionUpdateJobId: null,
        weaknessAnalysisJobId: null,
        readinessPredictionJobId: null,
        error: error.message,
      };
    }
  }

  /**
   * Get job status
   */
  static async getJobStatus(jobId, queueName) {
    try {
      const queue = queues[queueName];
      if (!queue) return null;

      const job = await queue.getJob(jobId);
      if (!job) return null;

      return {
        id: job.id,
        name: job.name,
        progress: job.progress(),
        status: await job.getState(),
        attempts: job.attemptsMade,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace,
      };
    } catch (error) {
      logger.error('Error getting job status:', error.message);
      return null;
    }
  }

  /**
   * Complete graceful shutdown
   */
  static async shutdown() {
    try {
      for (const queueName in queues) {
        await queues[queueName].close();
      }
      if (redisClient && redisConnected) {
        await redisClient.disconnect();
      }
      logger.info('✅ Job queue and Redis disconnected gracefully');
    } catch (error) {
      logger.warn('Error during queue shutdown:', error.message);
    }
  }
}

export { JobQueueService, queues, redisClient };
