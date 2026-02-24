import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Square, Volume2, VolumeX, MessageSquare, Loader2, X, AlertCircle } from 'lucide-react';
import useVoiceInterviewer, { VoiceInteractionState } from '../hooks/useVoiceInterviewer';

interface VoiceInterviewerOrbProps {
  sessionId: string;
  userCode?: string;
  problemTitle?: string;
  startIntro?: boolean;
}

const VoiceInterviewerOrb: React.FC<VoiceInterviewerOrbProps> = ({ sessionId, userCode = '', problemTitle, startIntro }) => {
  const {
    state,
    isRecording,
    isProcessing,
    isStreaming,
    transcript,
    streamedResponse,
    isMuted,
    errorHeader,
    startRecording,
    stopRecording,
    toggleMute,
    stopSpeaking,
    handleAIInteraction,
  } = useVoiceInterviewer(sessionId, userCode);

  const [isOpen, setIsOpen] = useState(false);
  const introPlayed = useRef(false);

  // Auto-open bubble when interaction starts
  useEffect(() => {
    if (state !== VoiceInteractionState.IDLE) {
      setIsOpen(true);
    }
  }, [state]);

  useEffect(() => {
    if (startIntro && problemTitle && !introPlayed.current) {
      introPlayed.current = true;
      setIsOpen(true);
      const forcedText = `[SYSTEM OVERRIDE: Act as a strict technical interviewer. Introduce yourself briefly, mention we are doing a mock interview, and present the following problem to the candidate: ${problemTitle}. Ask them for their initial approach.]`;
      handleAIInteraction(forcedText, `Start Interview - Problem: ${problemTitle}`);
    }
  }, [startIntro, problemTitle, handleAIInteraction]);

  const getOrbColor = () => {
    switch (state) {
      case VoiceInteractionState.LISTENING: return 'bg-destructive shadow-[0_0_30px_rgba(239,68,68,0.5)]';
      case VoiceInteractionState.PROCESSING_STT:
      case VoiceInteractionState.PROCESSING_LLM: return 'bg-primary shadow-[0_0_30px_rgba(59,130,246,0.5)]';
      case VoiceInteractionState.SPEAKING: return 'bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)]';
      case VoiceInteractionState.ERROR: return 'bg-destructive animate-bounce';
      default: return 'bg-gradient-to-br from-primary to-indigo-600';
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[9999] flex flex-col items-end gap-4">
      {/* Transcript & Response Bubble */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-80 md:w-96 bg-background/95 backdrop-blur-xl border border-destructive/20 rounded-2xl shadow-2xl p-4 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2 border-b border-border/50 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-destructive/80 flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                AI Interviewer Active
              </span>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            </div>

            <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {state === VoiceInteractionState.ERROR && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs">
                  <AlertCircle size={14} />
                  <span>{errorHeader || 'An error occurred'}</span>
                </div>
              )}

              {transcript && (
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-muted-foreground mb-1">You</span>
                  <div className="bg-muted text-foreground px-3 py-2 rounded-2xl rounded-tr-none text-sm max-w-[90%]">
                    {transcript}
                  </div>
                </div>
              )}

              {state === VoiceInteractionState.PROCESSING_STT && (
                <div className="flex items-center gap-2 text-foreground animate-pulse">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-xs italic">Transcribing...</span>
                </div>
              )}

              {state === VoiceInteractionState.PROCESSING_LLM && !streamedResponse && (
                <div className="flex items-center gap-2 text-amber-500 animate-pulse">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-xs italic">Evaluating approach...</span>
                </div>
              )}

              {(streamedResponse) && (
                <div className="flex flex-col items-start border-t border-border/40 pt-4">
                  <span className="text-[10px] text-amber-500 mb-1 font-bold tracking-widest uppercase">Interviewer</span>
                  <div className="text-foreground text-sm leading-relaxed prose prose-sm prose-invert max-w-full font-medium">
                    {streamedResponse}
                    {isStreaming && <span className="inline-block w-1.5 h-4 ml-1 bg-amber-500 animate-pulse align-middle" />}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2 bg-secondary/50 backdrop-blur-md px-3 py-2 rounded-full border border-white/10"
            >
              <button 
                onClick={toggleMute} 
                className={`p-1.5 rounded-full transition-colors ${isMuted ? 'text-destructive bg-destructive/10' : 'text-amber-500 hover:bg-amber-500/10'}`}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <button 
                onClick={stopSpeaking}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-full transition-colors"
                title="Stop speaking"
              >
                <Square size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: state === VoiceInteractionState.IDLE ? 1.05 : 1 }}
          whileTap={{ scale: state === VoiceInteractionState.IDLE ? 0.95 : 1 }}
          disabled={state !== VoiceInteractionState.IDLE && state !== VoiceInteractionState.LISTENING}
          onClick={() => {
            if (state === VoiceInteractionState.LISTENING) stopRecording();
            else if (state === VoiceInteractionState.IDLE) {
              if (!isOpen) setIsOpen(true);
              startRecording();
            }
          }}
          className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 overflow-hidden border-4 border-white/10 ${getOrbColor()} ${
            state !== VoiceInteractionState.IDLE && state !== VoiceInteractionState.LISTENING ? 'cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          {/* Waveform Background for Listening/Speaking */}
          {(state === VoiceInteractionState.LISTENING || state === VoiceInteractionState.SPEAKING) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    height: [10, i % 2 === 0 ? 40 : 25, 10],
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 0.6, 
                    delay: i * 0.1,
                    ease: "easeInOut" 
                  }}
                  className="w-1 mx-0.5 bg-white rounded-full"
                />
              ))}
            </div>
          )}

          <div className="relative z-10 text-white">
            {state === VoiceInteractionState.LISTENING ? <Square fill="currentColor" size={24} /> : 
             (state === VoiceInteractionState.PROCESSING_STT || state === VoiceInteractionState.PROCESSING_LLM) ? <Loader2 size={24} className="animate-spin" /> :
             state === VoiceInteractionState.SPEAKING ? <Volume2 size={24} /> :
             state === VoiceInteractionState.ERROR ? <AlertCircle size={24} /> :
             <Mic size={24} />}
          </div>
        </motion.button>
      </div>
    </div>
  );
};

export default VoiceInterviewerOrb;
