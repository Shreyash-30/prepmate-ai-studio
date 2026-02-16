/**
 * useTopicRecommendations Hook
 * 
 * Get adaptive practice recommendations for a specific topic
 * 
 * Usage:
 *   const { data, loading, error, refetch } = useTopicRecommendations(topicId);
 */

import { useState, useEffect } from 'react';
import api from '@/services/api';

export const useTopicRecommendations = (topicId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/practice/topics/${topicId}/recommendations`);

      setData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch recommendations');
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!topicId) {
      setData(null);
      setLoading(false);
      return;
    }

    fetchRecommendations();
  }, [topicId]);

  const refetch = () => {
    if (topicId) {
      fetchRecommendations();
    }
  };

  return { data, loading, error, refetch };
};

/**
 * useAllRecommendations Hook
 * 
 * Get adaptive recommendations for all topics
 * 
 * Usage:
 *   const { data, loading, error, refetch } = useAllRecommendations();
 */
export const useAllRecommendations = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/practice/recommendations');

      setData(response.data.data || []);
    } catch (err) {
      // Check if error is due to missing authentication
      if (err.response?.status === 401 || err.message === 'Network Error') {
        // Silently fail - user not logged in yet
        setError(null);
        setData([]);
      } else {
        setError(err.response?.data?.message || 'Failed to fetch recommendations');
        console.error('Error fetching recommendations:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const refetch = () => {
    fetchRecommendations();
  };

  return { data, loading, error, refetch };
};
