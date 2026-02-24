/**
 * AI Observability Service
 * 
 * Central telemetry, logging, and metrics tracking for:
 * - LLM provider performance
 * - Token usage and cost
 * - Latency and failure rates
 * - ML job execution
 * - Session health
 */

import logger from '../utils/logger.js';

class AIObservabilityService {
  constructor() {
    this.metrics = {
      llm: {
        groq: {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          totalTokens: 0,
          totalCost: 0,
          avgLatency: 0,
          errors: [],
        },
        gemini: {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          totalTokens: 0,
          totalCost: 0,
          avgLatency: 0,
          errors: [],
        },
        together: {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          totalTokens: 0,
          totalCost: 0,
          avgLatency: 0,
          errors: [],
        },
      },
      ml: {
        masteryUpdates: 0,
        retentionUpdates: 0,
        weaknessAnalysis: 0,
        readinessPredictions: 0,
        avgJobDuration: 0,
        failedJobs: 0,
      },
      sessions: {
        active: 0,
        completed: 0,
        abandoned: 0,
      },
      sandbox: {
        totalExecutions: 0,
        successfulExecutions: 0,
        timeouts: 0,
        memoryExceeded: 0,
        runtimeErrors: 0,
      },
    };

    this.sessionCosts = new Map(); // sessionId -> cost object
  }

  /**
   * Log LLM call with metrics
   */
  logLLMCall(provider, endpoint, tokensUsed, cost, latency, success = true, error = null) {
    const metrics = this.metrics.llm[provider];
    if (!metrics) return;

    metrics.totalCalls += 1;
    if (success) {
      metrics.successfulCalls += 1;
    } else {
      metrics.failedCalls += 1;
      if (error) {
        metrics.errors.push({
          timestamp: new Date(),
          endpoint,
          error: error.message || error,
        });
      }
    }

    metrics.totalTokens += tokensUsed;
    metrics.totalCost += cost;
    metrics.avgLatency = (metrics.avgLatency * (metrics.totalCalls - 1) + latency) / metrics.totalCalls;

    logger.info(`📊 LLM Call: [${provider.toUpperCase()}] ${endpoint}`, {
      tokens: tokensUsed,
      cost: `$${cost.toFixed(4)}`,
      latency: `${latency}ms`,
      success,
    });
  }

  /**
   * Track session cost
   */
  logSessionCost(sessionId, userId, endpoint, tokensUsed, cost) {
    if (!this.sessionCosts.has(sessionId)) {
      this.sessionCosts.set(sessionId, {
        sessionId,
        userId,
        calls: [],
        totalTokens: 0,
        totalCost: 0,
      });
    }

    const sessionCost = this.sessionCosts.get(sessionId);
    sessionCost.calls.push({
      endpoint,
      tokens: tokensUsed,
      cost,
      timestamp: new Date(),
    });
    sessionCost.totalTokens += tokensUsed;
    sessionCost.totalCost += cost;

    // Warning if cost exceeds threshold
    if (sessionCost.totalCost > 2.0) {
      logger.warn(`⚠️ Session ${sessionId} cost exceeded $2.00: $${sessionCost.totalCost.toFixed(2)}`);
    }
  }

  /**
   * Log ML job execution
   */
  logMLJob(jobType, jobId, success = true, duration = 0, error = null) {
    if (jobType === 'mastery') {
      this.metrics.ml.masteryUpdates += 1;
    } else if (jobType === 'retention') {
      this.metrics.ml.retentionUpdates += 1;
    } else if (jobType === 'weakness') {
      this.metrics.ml.weaknessAnalysis += 1;
    } else if (jobType === 'readiness') {
      this.metrics.ml.readinessPredictions += 1;
    }

    if (!success) {
      this.metrics.ml.failedJobs += 1;
    }

    this.metrics.ml.avgJobDuration = (this.metrics.ml.avgJobDuration + duration) / 2;

    logger.info(`🧠 ML Job: [${jobType.toUpperCase()}] ${jobId}`, {
      duration: `${duration}ms`,
      success,
      error: error ? error.message : null,
    });
  }

  /**
   * Log sandbox execution
   */
  logSandboxExecution(result) {
    this.metrics.sandbox.totalExecutions += 1;

    if (result.verdict === 'accepted') {
      this.metrics.sandbox.successfulExecutions += 1;
    } else if (result.verdict === 'time_limit_exceeded') {
      this.metrics.sandbox.timeouts += 1;
    } else if (result.verdict === 'memory_limit_exceeded') {
      this.metrics.sandbox.memoryExceeded += 1;
    } else if (result.verdict === 'runtime_error') {
      this.metrics.sandbox.runtimeErrors += 1;
    }

    logger.info(`⚙️ Sandbox Execution: ${result.verdict}`, {
      executionTime: `${result.executionTime}ms`,
      memoryUsed: `${result.memoryUsed}MB`,
    });
  }

  /**
   * Update session count
   */
  updateSessionMetrics(change) {
    if (change.type === 'completed') {
      this.metrics.sessions.completed += 1;
      this.metrics.sessions.active = Math.max(0, this.metrics.sessions.active - 1);
    } else if (change.type === 'abandoned') {
      this.metrics.sessions.abandoned += 1;
      this.metrics.sessions.active = Math.max(0, this.metrics.sessions.active - 1);
    } else if (change.type === 'active') {
      this.metrics.sessions.active += 1;
    }
  }

  /**
   * Get session cost summary
   */
  getSessionCost(sessionId) {
    return this.sessionCosts.get(sessionId) || null;
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    return {
      timestamp: new Date().toISOString(),
      llm: this.metrics.llm,
      ml: this.metrics.ml,
      sessions: this.metrics.sessions,
      sandbox: this.metrics.sandbox,
      sessionCount: this.sessionCosts.size,
    };
  }

  /**
   * Get provider health status
   */
  getProviderHealth() {
    const health = {};
    for (const [provider, metrics] of Object.entries(this.metrics.llm)) {
      const successRate = metrics.totalCalls > 0 ? metrics.successfulCalls / metrics.totalCalls : 0;
      health[provider] = {
        status: successRate >= 0.95 ? 'healthy' : successRate >= 0.8 ? 'degraded' : 'unhealthy',
        successRate: (successRate * 100).toFixed(2) + '%',
        avgLatency: metrics.avgLatency.toFixed(0) + 'ms',
        totalCost: '$' + metrics.totalCost.toFixed(2),
      };
    }
    return health;
  }

  /**
   * Reset metrics (for testing)
   */
  reset() {
    this.metrics = {
      llm: {
        groq: {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          totalTokens: 0,
          totalCost: 0,
          avgLatency: 0,
          errors: [],
        },
        gemini: {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          totalTokens: 0,
          totalCost: 0,
          avgLatency: 0,
          errors: [],
        },
        together: {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          totalTokens: 0,
          totalCost: 0,
          avgLatency: 0,
          errors: [],
        },
      },
      ml: {
        masteryUpdates: 0,
        retentionUpdates: 0,
        weaknessAnalysis: 0,
        readinessPredictions: 0,
        avgJobDuration: 0,
        failedJobs: 0,
      },
      sessions: {
        active: 0,
        completed: 0,
        abandoned: 0,
      },
      sandbox: {
        totalExecutions: 0,
        successfulExecutions: 0,
        timeouts: 0,
        memoryExceeded: 0,
        runtimeErrors: 0,
      },
    };
    this.sessionCosts.clear();
  }
}

export default new AIObservabilityService();
