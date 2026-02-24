/**
 * CodeReviewPanel Component
 * Displays streaming code review feedback with performance insights
 * Non-blocking panel updates while user continues working
 */

import { useState, useEffect } from 'react';
import { FileText, AlertCircle, CheckCircle, Sparkles, X } from 'lucide-react';
import { usePracticeSession, StreamingMessage } from '@/hooks/usePracticeSession';

interface ReviewItem {
  type: 'improvement' | 'issue' | 'praise';
  line?: number;
  message: string;
}

interface CodeReviewPanelProps {
  code: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CodeReviewPanel({
  code,
  isOpen,
  onClose,
}: CodeReviewPanelProps) {
  const { getCodeReview } = usePracticeSession();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentReview, setCurrentReview] = useState('');

  // Fetch review when opened
  useEffect(() => {
    if (!isOpen || !code) return;

    const fetchReview = async () => {
      try {
        setLoading(true);
        setError(null);
        setReviews([]);
        setCurrentReview('');

        await getCodeReview(code, (message: StreamingMessage) => {
          if (message.type === 'chunk' && message.content) {
            setCurrentReview((prev) => prev + message.content);

            // Try to parse review items from content
            try {
              const lines = (prev + message.content).split('\n');
              const parsed: ReviewItem[] = [];

              for (const line of lines) {
                if (line.includes('✓') || line.includes('✅')) {
                  parsed.push({ type: 'praise', message: line.replace(/^[✓✅]+\s*/u, '').trim() });
                } else if (line.includes('⚠') || line.includes('⚡')) {
                  parsed.push({ type: 'improvement', message: line.replace(/^[⚠⚡]+\s*/u, '').trim() });
                } else if (line.includes('❌') || line.includes('🛑')) {
                  parsed.push({ type: 'issue', message: line.replace(/^[❌🛑]+\s*/u, '').trim() });
                }
              }

              if (parsed.length > 0) {
                setReviews(parsed);
              }
            } catch {
              // Continue streaming if parsing fails
            }
          } else if (message.type === 'error') {
            setError(message.error || 'Failed to get review');
          }
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get review');
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [isOpen, code]);

  if (!isOpen) return null;

  const praiseCount = reviews.filter((r) => r.type === 'praise').length;
  const issueCount = reviews.filter((r) => r.type === 'issue').length;
  const improvementCount = reviews.filter((r) => r.type === 'improvement').length;

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-md max-h-96 flex flex-col">
      <div className="bg-popover border border-border rounded-lg shadow-lg p-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Code Review</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stats */}
        {!loading && reviews.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3 pb-3 border-b border-border">
            <div className="text-center">
              <div className="text-sm font-semibold text-success">{praiseCount}</div>
              <div className="text-xs text-muted-foreground">Good</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-warning">{improvementCount}</div>
              <div className="text-xs text-muted-foreground">Improve</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-destructive">{issueCount}</div>
              <div className="text-xs text-muted-foreground">Issues</div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="space-y-2 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 py-4">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <p className="text-xs text-muted-foreground">Reviewing your code...</p>
            </div>
          ) : error ? (
            <div className="text-xs text-destructive">{error}</div>
          ) : reviews.length === 0 && !loading ? (
            <div className="text-xs text-muted-foreground text-center py-4">
              No issues found! ✨
            </div>
          ) : (
            reviews.map((review, idx) => (
              <div
                key={idx}
                className="flex gap-2 p-2 rounded bg-muted text-xs"
              >
                {review.type === 'praise' && (
                  <CheckCircle className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                )}
                {review.type === 'improvement' && (
                  <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                )}
                {review.type === 'issue' && (
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  {review.line && (
                    <span className="text-muted-foreground text-xs">
                      Line {review.line}:{' '}
                    </span>
                  )}
                  <span className="text-foreground">{review.message}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info */}
        <div className="mt-2 text-xs text-muted-foreground border-t border-border pt-2">
          💡 Reviews update as you code (non-blocking)
        </div>
      </div>
    </div>
  );
}

export default CodeReviewPanel;
