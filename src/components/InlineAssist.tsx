/**
 * InlineAssist Component
 * Ctrl+Space triggered inline code suggestions
 * Non-blocking streaming suggestions while user continues coding
 */

import { useState, useEffect } from 'react';
import { Sparkles, X, Copy, Check } from 'lucide-react';
import { usePracticeSession, StreamingMessage } from '@/hooks/usePracticeSession';

interface InlineAssistProps {
  code: string;
  cursorLine: number;
  isOpen: boolean;
  onClose: () => void;
  onAccept?: (suggestion: string) => void;
}

export function InlineAssist({
  code,
  cursorLine,
  isOpen,
  onClose,
  onAccept,
}: InlineAssistProps) {
  const { getInlineAssist } = usePracticeSession();
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch suggestion when opened
  useEffect(() => {
    if (!isOpen) return;

    const fetchSuggestion = async () => {
      try {
        setLoading(true);
        setError(null);
        setSuggestion('');

        await getInlineAssist(code, cursorLine, (message: StreamingMessage) => {
          if (message.type === 'chunk' && message.content) {
            setSuggestion((prev) => prev + message.content);
          } else if (message.type === 'error') {
            setError(message.error || 'Failed to get suggestion');
          }
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get suggestion');
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestion();
  }, [isOpen, code, cursorLine]);

  const handleCopy = () => {
    navigator.clipboard.writeText(suggestion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-md">
      <div className="bg-popover border border-border rounded-lg shadow-lg p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Suggestion</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 py-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <p className="text-xs text-muted-foreground">Analyzing code...</p>
            </div>
          ) : error ? (
            <div className="text-xs text-destructive">{error}</div>
          ) : (
            <>
              <pre className="bg-muted rounded p-2 text-xs overflow-auto max-h-32 text-foreground">
                {suggestion || 'No suggestion available'}
              </pre>

              {suggestion && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 
                             rounded bg-primary/10 text-primary hover:bg-primary/20 
                             transition-colors text-xs font-medium"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      onAccept?.(suggestion);
                      onClose();
                    }}
                    className="flex-1 px-3 py-2 rounded bg-primary text-primary-foreground 
                             hover:bg-primary/90 transition-colors text-xs font-medium"
                  >
                    Insert
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Info */}
        <div className="mt-2 text-xs text-muted-foreground border-t border-border pt-2">
          💡 Tip: Continue typing while suggestion loads
        </div>
      </div>
    </div>
  );
}

export default InlineAssist;
