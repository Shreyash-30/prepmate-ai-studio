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

      console.log('\n' + '='.repeat(80));
      console.log('🎯 FRONTEND: Topic Click Handler');
      console.log('='.repeat(80));
      console.log(`   Topic ID: ${topicId}`);
      console.log(`   Limit: ${limit}`);
      console.log(`   Auth Token: ${localStorage.getItem('auth_token')?.substring(0, 30) || 'NOT FOUND'}...`);
      console.log(`   Calling: POST /practice/topics/${topicId}/generate-questions?limit=${limit}`);
      console.log('');

      const response = await api.post(`/practice/topics/${topicId}/generate-questions`, {}, {
        params: { limit },
      });

      console.log('✅ RESPONSE RECEIVED FROM BACKEND');
      console.log(`   Full Response:`, response.data);
      console.log(`   Response.data.data:`, response.data?.data);
      console.log(`   Response.data.data.questions:`, response.data?.data?.questions);
      
      // Extract questions - handle nested 'data' structure
      const questionsData = response.data?.data?.questions || response.data?.questions || response.data || [];
      
      console.log(`   Status: 200`);
      console.log(`   Response structure:`);
      console.log(`     - response.data: ${JSON.stringify(Object.keys(response.data || {}))}`);
      console.log(`     - response.data.data: ${JSON.stringify(Object.keys(response.data?.data || {}))}`);
      console.log(`     - Questions extracted from: ${response.data?.data?.questions ? 'response.data.data.questions' : (response.data?.questions ? 'response.data.questions' : 'response.data')}`);
      console.log(`     - Questions count: ${questionsData.length || 0}`);
      console.log(`     - Questions array type: ${Array.isArray(questionsData) ? 'Array' : typeof questionsData}`);
      console.log(`     - Source: ${response.data?.data?.source || response.data?.source || 'unknown'}`);
      console.log(`     - Error in response: ${response.data?.data?.error || response.data?.error || 'None'}`);
      console.log(`   Full questions data:`, questionsData);
      console.log('');

      // Validate and set questions
      if (Array.isArray(questionsData) && questionsData.length > 0) {
        console.log(`✅ Valid questions array with ${questionsData.length} items`);
        setQuestions(questionsData);
        setLastGeneratedTopic(topicId);
        setError(null); // Explicitly clear error
        console.log(`✅ Questions stored in state. Count: ${questionsData.length}`);
        return questionsData;
      } else {
        console.warn('⚠️ No questions found in response or empty array');
        console.warn(`   questionsData type: ${typeof questionsData}`);
        console.warn(`   questionsData is array: ${Array.isArray(questionsData)}`);
        console.warn(`   questionsData length: ${(questionsData as any).length}`);
        
        const errorMessage = response.data?.data?.message || response.data?.data?.error || 'No questions generated. Please try again.';
        console.warn(`   Full error message from backend: ${errorMessage}`);
        
        setQuestions([]);
        setError(errorMessage);
        return [];
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to generate questions';
      console.error('\n❌ ERROR IN FRONTEND Hook');
      console.error(`   Error message: ${errorMsg}`);
      console.error(`   Error status: ${err.response?.status}`);
      console.error(`   Error type: ${err.name}`);
      console.error(`   Full error response:`, err.response?.data);
      console.error(`   Full error object:`, err);
      console.error('\n   Troubleshooting Tip:');
      console.error('   1. Check browser DevTools > Network tab');
      console.error('   2. Look for /practice/topics/.../generate-questions request');
      console.error('   3. Check response status and body');
      console.error('   4. Verify auth_token in LocalStorage');
      console.error('   5. Check if backend is running on port 8000');
      console.error('   6. Check if AI service is running on port 8001');
      console.error('');
      
      setQuestions([]);
      setError(errorMsg);
      console.error('Error generating questions:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { generateQuestions, questions, loading, error, lastGeneratedTopic };
};