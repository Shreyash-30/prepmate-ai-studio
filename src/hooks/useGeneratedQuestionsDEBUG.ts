/**
 * Debug Hook for Question Generation
 * Shows exactly what's happening at each step
 */

import { useEffect, useState } from 'react';

export const useGeneratedQuestionsDebug = (questions: any[], loading: boolean, error: any, llmQuestions: any[]) => {
  const [debugInfo, setDebugInfo] = useState({
    questionsCount: 0,
    isLoading: false,
    hasError: false,
    llmQuestionsCount: 0,
    questionsStructure: null,
    timestamp: new Date().toISOString(),
  });

  useEffect(() => {
    const info = {
      questionsCount: Array.isArray(questions) ? questions.length : 0,
      isLoading: loading || false,
      hasError: !!error,
      llmQuestionsCount: Array.isArray(llmQuestions) ? llmQuestions.length : 0,
      questionsStructure: questions?.length > 0 ? Object.keys(questions[0] || {}) : null,
      timestamp: new Date().toISOString(),
      errorMessage: error?.message || error?.toString() || null,
      firstQuestion: questions?.length > 0 ? JSON.stringify(questions[0], null, 2).substring(0, 200) : null,
    };

    setDebugInfo(info);

    // Log to console for debugging
    console.log('🔍 DEBUG: Question Generation State', info);

    if (Array.isArray(questions) && questions.length > 0) {
      console.log('✅ Questions available:', questions.length);
      console.log('📊 Question structure:', Object.keys(questions[0] || {}));
      console.log('📝 First question:', questions[0]);
    } else {
      console.warn('⚠️ No questions in state');
    }

    if (Array.isArray(llmQuestions) && llmQuestions.length > 0) {
      console.log('✅ LLM Questions available:', llmQuestions.length);
      console.log('📊 LLM Question structure:', Object.keys(llmQuestions[0] || {}));
      console.log('📝 First LLM question:', llmQuestions[0]);
    } else if (llmQuestions !== undefined) {
      console.warn('⚠️ LLM Questions empty or not array:', llmQuestions);
    }

    if (error) {
      console.error('❌ Error:', error);
    }

    if (loading) {
      console.log('⏳ Loading questions...');
    }
  }, [questions, loading, error, llmQuestions]);

  return debugInfo;
};

/**
 * Hook to log state changes in Practice page
 */
export const usePracticeStateDebug = (state: any) => {
  useEffect(() => {
    console.log('📌 PRACTICE PAGE STATE UPDATE:', {
      selectedTopicId: state.selectedTopicId,
      useLLMQuestions: state.useLLMQuestions,
      llmQuestionsCount: state.llmQuestions?.length || 0,
      llmLoading: state.llmLoading,
      llmError: state.llmError,
      nextProblemsCount: state.nextProblems?.length || 0,
      timestamp: new Date().toISOString(),
    });
  }, [state.selectedTopicId, state.useLLMQuestions, state.llmQuestions, state.llmLoading, state.llmError]);
};
