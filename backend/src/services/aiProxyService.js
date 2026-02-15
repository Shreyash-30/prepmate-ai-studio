/**
 * AI Proxy Service
 * Handles communication between Node.js backend and Python FastAPI AI service
 * All requests include error handling, retries, and response normalization
 */

import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Helper function to make requests with retry logic
 */
async function callAIService(endpoint, method = 'POST', data = null) {
  let lastError;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const config = {
        method,
        url: `${AI_SERVICE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      };

      if (data) {
        config.data = data;
      }

      console.log(`[AI Service] ${method} ${endpoint} (attempt ${attempt}/${MAX_RETRIES})`);
      const response = await axios(config);
      
      return {
        success: true,
        data: response.data,
        statusCode: response.status,
      };
    } catch (error) {
      lastError = error;
      console.error(`[AI Service] Error on attempt ${attempt}:`, error.message);
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }
    }
  }

  console.error(`[AI Service] Failed after ${MAX_RETRIES} attempts`);
  return {
    success: false,
    error: lastError.message,
    statusCode: lastError.response?.status || 500,
  };
}

/**
 * ML Intelligence Services
 */

export async function callMasteryUpdate(userId, topicId, masteryData) {
  return callAIService('/ml/mastery/update', 'POST', {
    user_id: userId,
    topic_id: topicId,
    ...masteryData,
  });
}

export async function callRetentionUpdate(userId, submissionId, submissionData) {
  return callAIService('/ml/retention/update', 'POST', {
    user_id: userId,
    submission_id: submissionId,
    ...submissionData,
  });
}

export async function callWeaknessAnalyze(userId) {
  return callAIService('/ml/weakness/analyze', 'POST', {
    user_id: userId,
  });
}

export async function callPlannerGenerate(userId, plannerParams) {
  return callAIService('/ml/planner/generate', 'POST', {
    user_id: userId,
    ...plannerParams,
  });
}

export async function callReadinessPredict(userId) {
  return callAIService('/ml/readiness/predict', 'POST', {
    user_id: userId,
  });
}

/**
 * LLM Services
 */

export async function callMentorChat(userId, message, context = {}) {
  return callAIService('/mentor/chat', 'POST', {
    user_id: userId,
    message,
    context,
  });
}

export async function callPracticeReview(userId, submissionId, practiceData) {
  return callAIService('/practice/review', 'POST', {
    user_id: userId,
    submission_id: submissionId,
    ...practiceData,
  });
}

export async function callInterviewChat(userId, message, interviewType = 'tech') {
  return callAIService('/interview/chat', 'POST', {
    user_id: userId,
    message,
    interview_type: interviewType,
  });
}

export async function callLearningFeedback(userId, topicId, performanceData) {
  return callAIService('/learning/feedback', 'POST', {
    user_id: userId,
    topic_id: topicId,
    ...performanceData,
  });
}

/**
 * Health Check
 */

export async function checkAIServiceHealth() {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/ml/health`, {
      timeout: 5000,
    });
    return {
      success: true,
      status: response.data.status,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[AI Service] Health check failed:', error.message);
    return {
      success: false,
      status: 'unavailable',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

export default {
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
};
