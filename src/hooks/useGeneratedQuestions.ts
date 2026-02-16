/**
 * Hook: useGeneratedQuestions
 * Fetches LLM-generated practice questions for a specific topic
 * 
 * Usage:
 * const { questions, loading, error } = useGeneratedQuestions(userId, topicId, limit);
 */

import { useState, useEffect } from 'react';
import axios from 'axios';

export const useGeneratedQuestions = (userId, topicId, limit = 5) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);

  useEffect(() => {
    if (!userId || !topicId) {
      setQuestions([]);
      return;
    }

    const fetchQuestions = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('authToken');
        const response = await axios.post(
          `/api/practice/topics/${topicId}/generate-questions`,
          { limit },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        // Extract the actual data from the response
        const data = response.data.data || response.data;
        
        console.log('🤖 Generated Questions:', {
          count: data.questions?.length || 0,
          source: data.source,
          sample: data.questions?.[0],
        });

        // Transform questions to ensure consistent structure
        const transformedQuestions = (data.questions || []).map((q, idx) => ({
          _id: `generated-${idx}-${Date.now()}`,
          problemTitle: q.problemTitle || q.problem_title || 'Untitled',
          difficulty: q.difficulty || 'Medium',
          topic: q.topic || 'Unknown',
          primaryConceptTested: q.primaryConceptTested || q.primary_concept_tested || 'Problem Solving',
          whyRecommended: q.whyRecommended || q.why_recommended || 'Recommended for your learning level',
          hints: q.hints || [],
          approachGuide: q.approachGuide || q.approach_guide || '',
          sourceUrl: q.sourceUrl || q.source_url || '#',
          platform: q.platform || 'unknown',
          generatedFor: q.generatedFor || topicId,
          learnerLevel: q.learnerLevel || 'intermediate',
          isDuplicate: q.isDuplicate || false,
        }));

        setQuestions(transformedQuestions);
        setSource(data.source || 'unknown');
      } catch (err) {
        console.error('Error fetching generated questions:', err);
        setError(err.response?.data?.message || err.message || 'Failed to generate questions');
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [userId, topicId, limit]);

  return { questions, loading, error, source };
};

export default useGeneratedQuestions;
