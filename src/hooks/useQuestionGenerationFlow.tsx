/**
 * Complete Debug Flow Tracer for Question Generation
 * Step-by-step inspection of:
 * 1. Hook state updates
 * 2. API response handling
 * 3. Component rendering
 * 4. Question array population
 */

import { useEffect, useRef } from 'react';

interface DebugTrace {
  step: string;
  timestamp: string;
  data: any;
  status: 'info' | 'warning' | 'error' | 'success';
}

class QuestionGenerationDebugger {
  private traces: DebugTrace[] = [];
  private maxTraces = 50;

  log(step: string, data: any, status: 'info' | 'warning' | 'error' | 'success' = 'info') {
    const trace: DebugTrace = {
      step,
      timestamp: new Date().toISOString(),
      data,
      status,
    };

    this.traces.push(trace);
    if (this.traces.length > this.maxTraces) {
      this.traces.shift();
    }

    const emoji = {
      info: '📝',
      warning: '⚠️',
      error: '❌',
      success: '✅',
    }[status];

    console.log(`${emoji} [${step}]`, data);

    // Store in window for debugging in browser console
    (window as any).__questionGenerationDebug = this.traces;
  }

  getTraces() {
    return this.traces;
  }

  clear() {
    this.traces = [];
  }

  export() {
    return JSON.stringify(this.traces, null, 2);
  }
}

export const questionGenerationDebugger = new QuestionGenerationDebugger();

/**
 * Hook to trace the complete question generation flow
 */
export const useQuestionGenerationFlow = (
  selectedTopicId: string | null,
  useLLMQuestions: boolean,
  llmQuestions: any[],
  llmLoading: boolean,
  llmError: any,
) => {
  const previousStateRef = useRef({
    selectedTopicId: null,
    useLLMQuestions: false,
    llmQuestionsCount: 0,
    llmLoading: false,
    hasError: false,
  });

  useEffect(() => {
    const current = {
      selectedTopicId,
      useLLMQuestions,
      llmQuestionsCount: Array.isArray(llmQuestions) ? llmQuestions.length : 0,
      llmLoading,
      hasError: !!llmError,
      timestamp: new Date().toISOString(),
    };

    const prev = previousStateRef.current;

    // Detect state changes
    if (current.selectedTopicId !== prev.selectedTopicId) {
      questionGenerationDebugger.log(
        'TOPIC_SELECTED',
        {
          oldTopic: prev.selectedTopicId,
          newTopic: current.selectedTopicId,
        },
        'info'
      );
    }

    if (current.llmLoading && !prev.llmLoading) {
      questionGenerationDebugger.log('LOADING_STARTED', { topic: current.selectedTopicId }, 'info');
    }

    if (!current.llmLoading && prev.llmLoading) {
      questionGenerationDebugger.log(
        'LOADING_COMPLETED',
        {
          questionsGenerated: current.llmQuestionsCount,
          hasError: current.hasError,
          errorMessage: llmError?.message || llmError,
        },
        current.hasError ? 'error' : 'success'
      );
    }

    if (current.llmQuestionsCount > prev.llmQuestionsCount) {
      questionGenerationDebugger.log(
        'QUESTIONS_POPULATED',
        {
          newCount: current.llmQuestionsCount,
          previousCount: prev.llmQuestionsCount,
          questions: llmQuestions.map((q: any) => ({
            title: q.problemTitle || q.title,
            difficulty: q.difficulty,
            concept: q.primaryConceptTested,
          })),
        },
        'success'
      );
    }

    if (current.llmQuestionsCount === 0 && prev.llmQuestionsCount > 0) {
      questionGenerationDebugger.log(
        'QUESTIONS_CLEARED',
        { reason: 'Questions array became empty' },
        'warning'
      );
    }

    if (current.hasError && !prev.hasError) {
      questionGenerationDebugger.log(
        'ERROR_OCCURRED',
        { errorMessage: llmError?.message || llmError },
        'error'
      );
    }

    previousStateRef.current = current;
  }, [selectedTopicId, useLLMQuestions, llmQuestions, llmLoading, llmError]);

  return {
    traces: questionGenerationDebugger.getTraces(),
    exportDebug: questionGenerationDebugger.export.bind(questionGenerationDebugger),
  };
};

/**
 * Component for displaying debug info
 */
export const QuestionGenerationDebugPanel = () => {
  const traces = questionGenerationDebugger.getTraces();

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-h-64 overflow-y-auto font-mono max-w-md">
      <div className="font-bold mb-2">🐛 Question Gen Debug Log</div>
      {traces.length === 0 ? (
        <p className="text-gray-400">No events yet...</p>
      ) : (
        traces.map((trace, idx) => (
          <div key={idx} className="mb-2 pb-2 border-b border-gray-600">
            <div className="font-bold">{trace.step}</div>
            <div className="text-gray-400">{trace.timestamp}</div>
            <pre className="text-gray-300 whitespace-pre-wrap break-words">
              {JSON.stringify(trace.data, null, 2)}
            </pre>
          </div>
        ))
      )}
    </div>
  );
};
