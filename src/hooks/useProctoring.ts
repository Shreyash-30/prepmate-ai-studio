import { useState, useEffect, useCallback } from 'react';

export interface ProctoringState {
  violations: number;
  violationLog: { time: Date; reason: string }[];
  isTerminated: boolean;
}

export function useProctoring(maxViolations: number = 3) {
  const [state, setState] = useState<ProctoringState>({
    violations: 0,
    violationLog: [],
    isTerminated: false,
  });

  const [isFullscreen, setIsFullscreen] = useState(false);

  const addViolation = useCallback((reason: string) => {
    setState((prev) => {
      const newViolations = prev.violations + 1;
      const isTerminated = newViolations >= maxViolations;
      
      const newLog = [
        ...prev.violationLog,
        { time: new Date(), reason }
      ];

      return {
        violations: newViolations,
        violationLog: newLog,
        isTerminated
      };
    });
  }, [maxViolations]);

  // Handle visibility change (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !state.isTerminated && isFullscreen) {
        addViolation('Tab switching or window minimization detected');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [addViolation, state.isTerminated, isFullscreen]);

  // Handle blur (clicking outside browser)
  useEffect(() => {
    const handleBlur = () => {
      if (!state.isTerminated && isFullscreen) {
        addViolation('Window focus lost');
      }
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [addViolation, state.isTerminated, isFullscreen]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);

      if (!isCurrentlyFullscreen && !state.isTerminated) {
        // Automatically add a violation if they exit fullscreen prematurely
        addViolation('Exited fullscreen mode');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [addViolation, state.isTerminated]);

  const requestFullscreen = useCallback(async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error('Error attempting to enable fullscreen:', err);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  }, []);

  return {
    ...state,
    isFullscreen,
    requestFullscreen,
    exitFullscreen,
  };
}
