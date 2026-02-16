/**
 * useQuestionSelection Hook
 * 
 * Get next recommended problems for a topic at current difficulty level
 * 
 * Usage:
 *   const { questions, loading, error, refetch } = useQuestionSelection(topicId, { limit: 10 });
 */

import { useState, useEffect } from 'react';
import api from '@/services/api';

export const useQuestionSelection = (topicId, options = {}) => {
  const { limit = 5 } = options;
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/practice/topics/${topicId}/next-problems`, {
        params: { limit },
      });

      setQuestions(response.data.data || []);
    } catch (err) {
      // Handle auth errors gracefully
      if (err.response?.status === 401 || err.message === 'Network Error') {
        setError(null);
        setQuestions([]);
      } else {
        setError(err.response?.data?.message || 'Failed to fetch questions');
        console.error('Error fetching questions:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!topicId) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    fetchQuestions();
  }, [topicId, limit]);

  const refetch = () => {
    if (topicId) {
      fetchQuestions();
    }
  };

  return { questions, loading, error, refetch };
};

/**
 * useSearchQuestions Hook
 * 
 * Search for questions by keyword
 * 
 * Usage:
 *   const { search, results, loading, error } = useSearchQuestions();
 *   await search('array', 20);
 */
export const useSearchQuestions = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = async (keyword, limit = 20) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/practice/questions/search', {
        params: { keyword, limit },
      });

      setResults(response.data.data);
      return response.data.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to search questions';
      setError(errorMsg);
      console.error('Error searching questions:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { search, results, loading, error };
};

/**
 * useGetQuestion Hook
 * 
 * Get single question details
 * 
 * Usage:
 *   const { question, loading, error } = useGetQuestion(problemId);
 */
export const useGetQuestion = (problemId) => {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!problemId) {
      setQuestion(null);
      setLoading(false);
      return;
    }

    const fetchQuestion = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get(`/practice/questions/${problemId}`);
        setQuestion(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch question');
        console.error('Error fetching question:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestion();
  }, [problemId]);

  return { question, loading, error };
};
/**
 * useGeneratePersonalizedQuestions Hook
 * 
 * Generate personalized questions using LLM based on user profile and topic intelligence
 * 
 * Usage:
 *   const { generateQuestions, questions, loading, error } = useGeneratePersonalizedQuestions();
 *   await generateQuestions(topicId, { limit: 5 });
 */
export const useGeneratePersonalizedQuestions = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastGeneratedTopic, setLastGeneratedTopic] = useState(null);

  const generateQuestions = async (topicId, options = {}) => {
    try {
      setLoading(true);
      setError(null);

      const { limit = 5 } = options;

      const response = await api.post(`/practice/topics/${topicId}/generate-questions`, {}, {
        params: { limit },
      });

      setQuestions(response.data.data?.questions || []);
      setLastGeneratedTopic(topicId);
      return response.data.data?.questions || [];
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to generate questions';
      setError(errorMsg);
      console.error('Error generating questions:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { generateQuestions, questions, loading, error, lastGeneratedTopic };
};