/**
 * useTopicAnalytics Hook
 * 
 * Get detailed analytics and performance breakdown for a topic
 * 
 * Usage:
 *   const { analytics, loading, error, refetch } = useTopicAnalytics(topicId);
 */

import { useState, useEffect } from 'react';
import api from '@/services/api';

export const useTopicAnalytics = (topicId) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/practice/topics/${topicId}/analytics`);

      setAnalytics(response.data.data);
    } catch (err) {
      // Handle auth errors gracefully
      if (err.response?.status === 401 || err.message === 'Network Error') {
        setError(null);
      } else {
        setError(err.response?.data?.message || 'Failed to fetch analytics');
        console.error('Error fetching analytics:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!topicId) {
      setAnalytics(null);
      setLoading(false);
      return;
    }

    fetchAnalytics();
  }, [topicId]);

  const refetch = () => {
    if (topicId) {
      fetchAnalytics();
    }
  };

  return { analytics, loading, error, refetch };
};

/**
 * usePerformanceAnalytics Hook
 * 
 * Alias for useTopicAnalytics with alternative naming
 */
export const usePerformanceAnalytics = (topicId) => {
  return useTopicAnalytics(topicId);
};
