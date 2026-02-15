/**
 * AI Service Hooks
 * React hooks for integrating ML/LLM services into frontend
 * 
 * These hooks call the Node backend proxy routes which then
 * communicate with the Python FastAPI AI service
 */

import { useState, useCallback, useEffect } from 'react';
import api from '../services/api.ts';

// ============================================================
// ML INTELLIGENCE HOOKS
// ============================================================

/**
 * useTopicMastery - Fetch mastery profile for a user
 * Returns mastery levels across all topics (0-1 scale)
 */
export const useTopicMastery = (userId: string) => {
  const [mastery, setMastery] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMastery = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await api.get(`/ai/ml/mastery/profile/${userId}`);
      setMastery(response.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchMastery();
  }, [fetchMastery]);

  return { mastery, loading, error, refetch: fetchMastery };
};

/**
 * useRevisionQueue - Get topics needing revision
 * Returns topics ordered by urgency
 */
export const useRevisionQueue = (userId: string) => {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await api.get(`/ai/ml/retention/queue/${userId}`);
      setQueue(response.data.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchQueue();
    // Refresh every 5 minutes
    const interval = setInterval(fetchQueue, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  return { queue, loading, error, refetch: fetchQueue };
};

/**
 * useWeaknessList - Identify weak/at-risk topics
 * Returns topics with risk scores and recommendations
 */
export const useWeaknessList = (userId: string) => {
  const [weaknesses, setWeaknesses] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeWeaknesses = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await api.post(`/ai/ml/weakness/analyze`, {
        userId,
        includeContestData: true,
      });
      setWeaknesses(response.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    analyzeWeaknesses();
  }, [analyzeWeaknesses]);

  return { weaknesses, loading, error, refetch: analyzeWeaknesses };
};

/**
 * usePlannerTasks - Get personalized study plan
 * Returns daily tasks and topic focus areas
 */
export const usePlannerTasks = (userId: string, options = {}) => {
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await api.post(`/ai/ml/planner/generate`, {
        userId,
        dailyMinutes: (options as any).dailyMinutes || 120,
        targetCompany: (options as any).targetCompany,
        daysAvailable: (options as any).daysAvailable || 30,
      });
      setPlan(response.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, options]);

  useEffect(() => {
    generatePlan();
  }, [generatePlan]);

  return { plan, loading, error, refetch: generatePlan };
};

/**
 * useReadinessPrediction - Get interview readiness score
 * Returns readiness score (0-100), passing probability, and time to readiness
 */
export const useReadinessPrediction = (userId: string, targetCompany?: string) => {
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const predictReadiness = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await api.post(`/ai/ml/readiness/predict`, {
        userId,
        targetCompany,
      });
      setPrediction(response.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, targetCompany]);

  useEffect(() => {
    predictReadiness();
  }, [predictReadiness]);

  return { prediction, loading, error, refetch: predictReadiness };
};

// ============================================================
// LLM SERVICE HOOKS
// ============================================================

/**
 * useMentorChat - AI mentor conversation hook
 * Sends messages and receives mentor feedback
 */
export const useMentorChat = (userId: string, topic: string) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (userMessage: string, context?: any) => {
      setLoading(true);
      try {
        const response = await api.post(`/ai/mentor/chat`, {
          userId,
          topic,
          userMessage,
          preparationContext: context?.preparationContext,
          masteryScore: context?.masteryScore,
          conversationId,
        });

        if (response.data.success) {
          const data = response.data.data;
          setConversationId(data.conversationId);
          setMessages((prev) => [
            ...prev,
            { role: 'user', content: userMessage },
            { role: 'assistant', content: data.mentorResponse },
          ]);
          setError(null);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    },
    [userId, topic, conversationId]
  );

  return { messages, loading, error, sendMessage, conversationId };
};

/**
 * usePracticeReview - Code review hook
 * Submits code for AI review and feedback
 */
export const usePracticeReview = (userId: string) => {
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitCodeForReview = useCallback(
    async (problemDescription: string, userCode: string, language: string, difficulty: string, topic: string, problemId?: string) => {
      setLoading(true);
      try {
        const response = await api.post(`/ai/practice/review`, {
          userId,
          problemDescription,
          userCode,
          language,
          difficulty,
          topic,
          problemId,
        });

        if (response.data.success) {
          setReview(response.data.data);
          setError(null);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  return { review, loading, error, submitCodeForReview };
};

/**
 * useInterviewChat - Interview simulation hook
 * Conducts mock interviews with feedback
 */
export const useInterviewChat = (userId: string) => {
  const [interview, setInterview] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startInterview = useCallback(
    async (problem: any, language: string, difficulty: string, topicTags: string[]) => {
      setLoading(true);
      try {
        const response = await api.post(`/ai/interview/simulate`, {
          userId,
          problemId: problem.id,
          problem: problem.title,
          language,
          difficulty,
          topicTags,
        });

        if (response.data.success) {
          setInterview(response.data.data);
          setMessages([{ role: 'assistant', content: response.data.data.interviewPrompt }]);
          setError(null);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  const respondToInterview = useCallback(
    async (response: string) => {
      setLoading(true);
      try {
        const apiResponse = await api.post(`/ai/interview/respond`, {
          userId,
          interviewId: interview?.id,
          response,
        });

        if (apiResponse.data.success) {
          setMessages((prev) => [
            ...prev,
            { role: 'user', content: response },
            { role: 'assistant', content: apiResponse.data.data.feedback },
          ]);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    },
    [userId, interview]
  );

  return { interview, messages, loading, error, startInterview, respondToInterview };
};

/**
 * useLearningContent - Generate learning material
 * Creates structured learning content for topics
 */
export const useLearningContent = () => {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateContent = useCallback(
    async (topic: string, subject: string, difficultyLevel = 'medium', userKnowledgeLevel = 3, contentType = 'comprehensive') => {
      setLoading(true);
      try {
        const response = await api.post(`/ai/learning/generate`, {
          topic,
          subject,
          difficultyLevel,
          userKnowledgeLevel,
          contentType,
        });

        if (response.data.success) {
          setContent(response.data.data);
          setError(null);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { content, loading, error, generateContent };
};

// ============================================================
// SYSTEM HEALTH HOOKS
// ============================================================

/**
 * useAIServiceHealth - Check if AI service is running
 */
export const useAIServiceHealth = () => {
  const [health, setHealth] = useState<any>(null);
  const [isHealthy, setIsHealthy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await api.get(`/ai/health`);
        setHealth(response.data);
        setIsHealthy(response.data.success);
      } catch (err) {
        setHealth(null);
        setIsHealthy(false);
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { health, isHealthy, loading };
};

export default {
  // ML
  useTopicMastery,
  useRevisionQueue,
  useWeaknessList,
  usePlannerTasks,
  useReadinessPrediction,
  // LLM
  useMentorChat,
  usePracticeReview,
  useInterviewChat,
  useLearningContent,
  // System
  useAIServiceHealth,
};
