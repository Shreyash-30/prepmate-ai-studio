/**
 * useSubmitPracticeAttempt Hook
 * 
 * Submit a practice attempt (from AI Lab or external platform)
 * 
 * Usage:
 *   const { submitAttempt, loading, error } = useSubmitPracticeAttempt();
 *   await submitAttempt({
 *     problemId: '123',
 *     topicId: 'arrays',
 *     mode: 'ai_lab',
 *     solveTime: 5000,
 *     attempts: 2,
 *     hintsUsed: 1,
 *     correctness: true
 *   });
 */

import { useState } from 'react';
import api from '@/services/api';

export const useSubmitPracticeAttempt = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submitAttempt = async (attemptData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/practice/attempt', attemptData);

      return response.data.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to submit attempt';
      setError(errorMsg);
      console.error('Error submitting attempt:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { submitAttempt, loading, error };
};

/**
 * useAdvanceDifficulty Hook
 * 
 * Advance to next difficulty level for a topic
 * 
 * Usage:
 *   const { advance, loading } = useAdvanceDifficulty();
 *   await advance(topicId);
 */
export const useAdvanceDifficulty = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const advance = async (topicId, force = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post(`/practice/topics/${topicId}/advance`, { force });

      return response.data.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to advance difficulty';
      setError(errorMsg);
      console.error('Error advancing difficulty:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { advance, loading, error };
};

/**
 * useReviewDifficulty Hook
 * 
 * Move back to previous difficulty level
 * 
 * Usage:
 *   const { review, loading } = useReviewDifficulty();
 *   await review(topicId);
 */
export const useReviewDifficulty = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const review = async (topicId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post(`/practice/topics/${topicId}/review`);

      return response.data.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to review difficulty';
      setError(errorMsg);
      console.error('Error reviewing difficulty:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { review, loading, error };
};
