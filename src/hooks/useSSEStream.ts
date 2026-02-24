/**
 * useSSEStream Hook
 * Manages Server-Sent Events streaming for non-blocking real-time updates
 * 
 * Features:
 * - Stream hints, reviews, inline suggestions
 * - Handle connection errors gracefully
 * - Cancel stream anytime
 * - Auto-close on completion
 */

import { useCallback, useRef, useState } from 'react';

export interface StreamingMessage {
  type: 'start' | 'chunk' | 'complete' | 'error';
  content?: string;
  metadata?: Record<string, any>;
  error?: string;
}

interface UseSSEStreamOptions {
  onMessage?: (message: StreamingMessage) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export const useSSEStream = () => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stream = useCallback(
    async (
      url: string,
      messageHandler: (message: StreamingMessage) => void,
      options?: UseSSEStreamOptions
    ) => {
      try {
        setStreaming(true);
        setError(null);

        // Add auth token to URL
        const token = localStorage.getItem('auth_token');
        const urlWithAuth = `${url}${url.includes('?') ? '&' : '?'}token=${token}`;

        const eventSource = new EventSource(urlWithAuth);
        eventSourceRef.current = eventSource;

        // Emit start message
        messageHandler({ type: 'start' });
        options?.onMessage?.({ type: 'start' });

        eventSource.onmessage = (event) => {
          try {
            // Try parsing as JSON, otherwise treat as text
            let message: StreamingMessage;
            try {
              message = JSON.parse(event.data);
            } catch {
              message = { type: 'chunk', content: event.data };
            }

            messageHandler(message);
            options?.onMessage?.(message);

            // Auto-close on completion
            if (message.type === 'complete') {
              eventSource.close();
              setStreaming(false);
              options?.onComplete?.();
            }
          } catch (err) {
            console.error('Error processing stream message:', err);
            const errorMsg = {
              type: 'error' as const,
              error: 'Failed to process message',
            };
            messageHandler(errorMsg);
            options?.onError?.(err instanceof Error ? err : new Error('Unknown error'));
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          setStreaming(false);

          const errorMsg = 'Connection lost';
          setError(errorMsg);
          const errorObject = {
            type: 'error' as const,
            error: errorMsg,
          };
          messageHandler(errorObject);
          options?.onError?.(new Error(errorMsg));
        };

        return eventSource;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
        setStreaming(false);
        options?.onError?.(err instanceof Error ? err : new Error(errorMsg));
        throw err;
      }
    },
    []
  );

  const cancel = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setStreaming(false);
    }
  }, []);

  return {
    stream,
    cancel,
    streaming,
    error,
  };
};

export default useSSEStream;
