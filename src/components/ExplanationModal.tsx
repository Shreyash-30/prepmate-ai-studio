/**
 * ExplanationModal Component
 * Allows users to input code explanation and voice transcript
 * Scores explanation in real-time (non-blocking)
 */

import { useState } from 'react';
import { AlertCircle, Award, Mic, Send, X } from 'lucide-react';
import { usePracticeSession } from '@/hooks/usePracticeSession';
import { Button } from '@/components/ui/button';

interface ExplanationScoreResult {
  clarityScore: number;
  completenessScore: number;
  correctnessScore: number;
  overallScore: number;
  feedback: string;
}

interface ExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (explanation: string, voiceTranscript?: string) => void;
  code: string;
}

export function ExplanationModal({
  isOpen,
  onClose,
  onSubmit,
  code,
}: ExplanationModalProps) {
  const { scoreExplanation } = usePracticeSession();
  const [explanation, setExplanation] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [scoreResult, setScoreResult] = useState<ExplanationScoreResult | null>(null);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScoreExplanation = async () => {
    if (!explanation.trim()) {
      setError('Please enter an explanation');
      return;
    }

    try {
      setScoring(true);
      setError(null);

      const result = await scoreExplanation(explanation, voiceTranscript);
      setScoreResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to score explanation');
    } finally {
      setScoring(false);
    }
  };

  const handleSubmit = () => {
    if (!explanation.trim()) {
      setError('Please enter an explanation');
      return;
    }

    onSubmit?.(explanation, voiceTranscript);
    handleClose();
  };

  const handleClose = () => {
    setExplanation('');
    setVoiceTranscript('');
    setScoreResult(null);
    setError(null);
    onClose();
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      // In real implementation, would process audio here
    } else {
      // Start recording
      setIsRecording(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-lg max-w-md w-full mx-4 max-h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Explain Your Solution</h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Code snippet */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Your Code</label>
            <pre className="mt-1 bg-muted rounded p-2 text-xs overflow-auto max-h-20 text-foreground">
              {code}
            </pre>
          </div>

          {/* Explanation input */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Explanation (Write or Record)
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Describe your approach, logic, and key insights..."
              className="mt-1 w-full h-24 p-2 rounded border border-border bg-muted text-foreground 
                       text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Voice recording */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">Voice Explanation</label>
              <button
                onClick={toggleRecording}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  isRecording
                    ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                }`}
              >
                <Mic className="h-3 w-3" />
                {isRecording ? 'Recording...' : 'Start Recording'}
              </button>
            </div>
            {voiceTranscript && (
              <div className="bg-muted rounded p-2 text-xs text-muted-foreground">
                {voiceTranscript}
              </div>
            )}
          </div>

          {/* Score result */}
          {scoreResult && (
            <div className="bg-primary/5 border border-primary/20 rounded p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Award className="h-4 w-4" />
                Explanation Score
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="text-base font-semibold text-foreground">
                    {Math.round(scoreResult.clarityScore * 100)}%
                  </div>
                  <div className="text-muted-foreground">Clarity</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-semibold text-foreground">
                    {Math.round(scoreResult.completenessScore * 100)}%
                  </div>
                  <div className="text-muted-foreground">Complete</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-semibold text-foreground">
                    {Math.round(scoreResult.correctnessScore * 100)}%
                  </div>
                  <div className="text-muted-foreground">Correct</div>
                </div>
              </div>

              <div className="pt-2 border-t border-primary/10">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Feedback:</span>{' '}
                  {scoreResult.feedback}
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex gap-2 rounded bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => {
              if (!scoring) handleScoreExplanation();
            }}
            disabled={scoring || !explanation.trim()}
            className="flex-1 text-xs"
          >
            {scoring ? 'Scoring...' : 'Score'}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!explanation.trim()}
            className="flex-1 text-xs flex items-center gap-1 justify-center"
          >
            <Send className="h-3 w-3" />
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ExplanationModal;
