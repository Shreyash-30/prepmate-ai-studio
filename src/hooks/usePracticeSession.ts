/**
 * usePracticeSession Hook
 * Manages practice session state with non-blocking ML updates
 * 
 * Features:
 * - Create practice sessions
 * - Submit code (non-blocking)
 * - Stream hints, reviews, inline suggestions
 * - Track ML job status without blocking UI
 * - Auto-refresh session state
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export interface PracticeSession {
  sessionId: string;
  sessionKey: string;
  userId: string;
  topicId: string;
  problemId: string;
  verdict?: 'accepted' | 'wrong_answer' | 'timeout' | 'memory_exceeded' | 'runtime_error';
  passedTests?: number;
  totalTests?: number;
  executionTime?: number;
  memoryUsed?: number;
  output?: string;
  mlJobIds?: {
    masteryUpdateJobId?: string;
    retentionUpdateJobId?: string;
    weaknessAnalysisJobId?: string;
    readinessPredictionJobId?: string;
  };
  createdAt: string;
  telemetry?: Record<string, any>;
  dependencyScore?: {
    independenceScore: number;
    hintDependency: number;
    voiceDependency: number;
    retryDependency: number;
  };
  // Wrapped execution fields from backend
  testCases?: Array<{ input: any; expectedOutput: any; visibility?: string }>;
  starterCode?: Record<string, string>;
  wrapperTemplate?: string;
  functionMetadata?: Record<string, any>;
  schemaVersion?: number;
}

export interface SubmissionResult {
  verdict: string;
  passedTests: number;
  totalTests: number;
  executionTime: number;
  memoryUsed: number;
  output?: string;
  mlJobIds?: Record<string, string>;
}

export interface StreamingMessage {
  type: 'hint' | 'review' | 'inline_assist' | 'explanation_score' | 'error';
  content: string;
  metadata?: Record<string, any>;
}

export const usePracticeSession = () => {
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Create new practice session
  const createSession = useCallback(
    async (topicId: string, problemId: string, language: string = 'python') => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('auth_token');
        const response = await axios.post(
          `${API_BASE_URL}/practice/session/start`,
          { topicId, problemId, language },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const newSession = response.data.data;
        
        // ✅ Immediately fetch full session data (including testCases)
        const fullSessionResponse = await axios.get(
          `${API_BASE_URL}/practice/session/${newSession.sessionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        const fullSession = fullSessionResponse.data.data;
        console.log(`📦 Full session loaded with ${fullSession.testCases?.length || 0} test cases`);
        
        setSession(fullSession);
        return fullSession;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create session';
        setError(errorMsg);
        console.error('Error creating session:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Get session state (non-blocking poll)
  const refreshSession = useCallback(async () => {
    if (!session?.sessionId) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(
        `${API_BASE_URL}/practice/session/${session.sessionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Log testCases for debugging
      if (response.data.data?.testCases?.length > 0) {
        console.log(`✅ Loaded ${response.data.data.testCases.length} test cases from backend`);
      }

      // Update session without blocking UI
      setSession((prev) => prev ? { ...prev, ...response.data.data } : null);
    } catch (err) {
      console.warn('Failed to refresh session:', err);
    }
  }, [session?.sessionId]);

  // Poll session status (non-blocking, every 2 seconds)
  useEffect(() => {
    if (!session?.sessionId) return;

    const interval = setInterval(() => {
      refreshSession();
    }, 2000);

    return () => clearInterval(interval);
  }, [session?.sessionId, refreshSession]);

  // Submit code solution (non-blocking submission)
  const submitCode = useCallback(
    async (code: string, explanation = '', voiceTranscript = ''): Promise<SubmissionResult> => {
      if (!session?.sessionId) throw new Error('No active session');

      try {
        setSubmitting(true);
        setError(null);

        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();

        const token = localStorage.getItem('auth_token');
        const response = await axios.post(
          `${API_BASE_URL}/practice/submit`,
          {
            sessionId: session.sessionId,
            code,
            explanation,
            voiceTranscript,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: abortControllerRef.current.signal,
          }
        );

        const result = response.data.data;

        // Update session with result but don't block UI
        setSession((prev) =>
          prev
            ? {
                ...prev,
                verdict: result.verdict,
                passedTests: result.passedTests,
                totalTests: result.totalTests,
                executionTime: result.executionTime,
                memoryUsed: result.memoryUsed,
                mlJobIds: result.mlJobIds,
              }
            : null
        );

        return result;
      } catch (err) {
        if (axios.isCancel(err)) {
          console.log('Submit cancelled');
          return {} as SubmissionResult;
        }
        const errorMsg = err instanceof Error ? err.message : 'Failed to submit code';
        setError(errorMsg);
        console.error('Error submitting code:', err);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [session?.sessionId]
  );

  // Stream hint (non-blocking, SSE)
  const getHint = useCallback(
    async (hintLevel: number = 1, onMessage?: (msg: StreamingMessage) => void) => {
      if (!session?.sessionId) throw new Error('No active session');

      const token = localStorage.getItem('auth_token');
      const eventSource = new EventSource(
        `${API_BASE_URL}/practice/hint/${session.sessionId}?level=${hintLevel}&token=${token}`
      );

      return new Promise<void>((resolve, reject) => {
        eventSource.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            onMessage?.(message);
            if (message.type === 'complete' || message.type === 'error') {
              eventSource.close();
              resolve();
            }
          } catch (err) {
            console.error('Error parsing hint message:', err);
            onMessage?.({ type: 'error', content: 'Failed to parse response' });
            eventSource.close();
            reject(err);
          }
        };

        eventSource.onerror = () => {
          onMessage?.({ type: 'error', content: 'Connection lost' });
          eventSource.close();
          reject(new Error('SSE connection failed'));
        };
      });
    },
    [session?.sessionId]
  );

  // Stream code review (non-blocking, SSE)
  const getCodeReview = useCallback(
    async (code: string, onMessage?: (msg: StreamingMessage) => void) => {
      if (!session?.sessionId) throw new Error('No active session');

      const token = localStorage.getItem('auth_token');
      const eventSource = new EventSource(
        `${API_BASE_URL}/practice/review/${session.sessionId}?code=${encodeURIComponent(code)}&token=${token}`
      );

      return new Promise<void>((resolve, reject) => {
        eventSource.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            onMessage?.(message);
            if (message.type === 'complete' || message.type === 'error') {
              eventSource.close();
              resolve();
            }
          } catch (err) {
            console.error('Error parsing review message:', err);
            eventSource.close();
            reject(err);
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          reject(new Error('SSE connection failed'));
        };
      });
    },
    [session?.sessionId]
  );

  // Stream inline suggestion (non-blocking, SSE)
  const getInlineAssist = useCallback(
    async (code: string, cursorLine: number, onMessage?: (msg: StreamingMessage) => void) => {
      if (!session?.sessionId) throw new Error('No active session');

      const token = localStorage.getItem('auth_token');
      const eventSource = new EventSource(
        `${API_BASE_URL}/practice/inline-assist/${session.sessionId}?cursorLine=${cursorLine}&token=${token}`
      );

      return new Promise<void>((resolve, reject) => {
        eventSource.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            onMessage?.(message);
            if (message.type === 'complete' || message.type === 'error') {
              eventSource.close();
              resolve();
            }
          } catch (err) {
            eventSource.close();
            reject(err);
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          reject(new Error('SSE connection failed'));
        };
      });
    },
    [session?.sessionId]
  );

  // Score explanation (non-blocking)
  const scoreExplanation = useCallback(
    async (explanation: string, voiceTranscript?: string) => {
      if (!session?.sessionId) throw new Error('No active session');

      try {
        const token = localStorage.getItem('auth_token');
        const response = await axios.post(
          `${API_BASE_URL}/practice/score-explanation/${session.sessionId}`,
          { explanation, voiceTranscript },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        return response.data.data;
      } catch (err) {
        console.error('Error scoring explanation:', err);
        throw err;
      }
    },
    [session?.sessionId]
  );

  // Run code against visible test cases (non-blocking)
  const runCode = useCallback(
    async (code: string, testCases?: Array<{ input: string; output: string }>) => {
      if (!session?.sessionId) throw new Error('No active session');

      try {
        const token = localStorage.getItem('auth_token');
        const response = await axios.post(
          `${API_BASE_URL}/practice/run/${session.sessionId}`,
          { code, testCases },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        return response.data.data;
      } catch (err) {
        console.error('Error running code:', err);
        throw err;
      }
    },
    [session?.sessionId]
  );

  // Handle voice interaction (non-blocking)
  const handleVoice = useCallback(
    async (transcript: string, intent: 'help' | 'hint' | 'clarification' | 'submit' | 'stuck' = 'help') => {
      if (!session?.sessionId) throw new Error('No active session');

      try {
        const token = localStorage.getItem('auth_token');
        const response = await axios.post(
          `${API_BASE_URL}/practice/voice/${session.sessionId}`,
          { transcript, intent, context: 'current_solving' },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        return response.data.data;
      } catch (err) {
        console.error('Error handling voice interaction:', err);
        throw err;
      }
    },
    [session?.sessionId]
  );

  // Cancel ongoing operations
  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    session,
    loading,
    submitting,
    error,
    createSession,
    refreshSession,
    submitCode,
    getHint,
    getCodeReview,
    getInlineAssist,
    scoreExplanation,
    runCode,
    handleVoice,
    cancel,
  };
};
