/**
 * useProgressionStatus Hook
 * 
 * Get progression data for a topic including current level, readiness, and recommendation
 * 
 * Usage:
 *   const { progression, loading, error, refetch } = useProgressionStatus(topicId);
 */

import { useState, useEffect } from 'react';
import api from '@/services/api';

export const useProgressionStatus = (topicId) => {
  const [progression, setProgression] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProgression = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch progression report
      const [progressResponse, recommendResponse] = await Promise.all([
        api.get(`/practice/topics/${topicId}/progression`),
        api.get(`/practice/topics/${topicId}/recommendation`),
      ]);

      setProgression(progressResponse.data.data);
      setRecommendation(recommendResponse.data.data);
    } catch (err) {
      // Handle auth errors gracefully
      if (err.response?.status === 401 || err.message === 'Network Error') {
        setError(null);
      } else {
        setError(err.response?.data?.message || 'Failed to fetch progression');
        console.error('Error fetching progression:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!topicId) {
      setProgression(null);
      setRecommendation(null);
      setLoading(false);
      return;
    }

    fetchProgression();
  }, [topicId]);

  const refetch = () => {
    if (topicId) {
      fetchProgression();
    }
  };

  return { progression, recommendation, loading, error, refetch };
};

/**
 * useProgressionReport Hook
 * 
 * Get detailed progression report with history for a topic
 * 
 * Usage:
 *   const { report, loading } = useProgressionReport(topicId);
 */
export const useProgressionReport = (topicId) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!topicId) {
      setReport(null);
      setLoading(false);
      return;
    }

    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get(`/practice/topics/${topicId}/progression`);
        setReport(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch report');
        console.error('Error fetching report:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [topicId]);

  return { report, loading, error };
};
