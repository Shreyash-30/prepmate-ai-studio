import { useState, useCallback, useRef } from 'react';

interface VoiceInteraction {
  transcript: string;
  response: string;
  intent?: string;
  timestamp: number;
}

export enum VoiceInteractionState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  PROCESSING_STT = 'PROCESSING_STT',
  PROCESSING_LLM = 'PROCESSING_LLM',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR'
}

const useVoiceInterviewer = (sessionId: string, userCode: string = '') => {
  const [state, setState] = useState<VoiceInteractionState>(VoiceInteractionState.IDLE);
  const [transcript, setTranscript] = useState('');
  const [streamedResponse, setStreamedResponse] = useState('');
  const [history, setHistory] = useState<VoiceInteraction[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [errorHeader, setErrorHeader] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(window.speechSynthesis);
  
  // Silence Detection Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const maxRecordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (state === VoiceInteractionState.SPEAKING || state === VoiceInteractionState.PROCESSING_LLM) {
      setState(VoiceInteractionState.IDLE);
    }
  }, [state]);

  const speak = useCallback((text: string) => {
    if (isMuted || !synthRef.current) {
      setState(VoiceInteractionState.IDLE);
      return;
    }
    
    synthRef.current.cancel();
    setState(VoiceInteractionState.SPEAKING);
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 0.9; // Slightly lower pitch for a more formal interviewer tone
    
    const loadVoices = () => {
      const voices = synthRef.current?.getVoices() || [];
      const preferredVoice = voices.find(v => 
        (v.name.includes('Google') && v.name.includes('English')) || 
        v.name.includes('Daniel') ||
        (v.lang.startsWith('en') && v.name.includes('Male'))
      ) || voices.find(v => v.lang.startsWith('en'));
      
      if (preferredVoice) utterance.voice = preferredVoice;
    };

    if (synthRef.current.getVoices().length === 0) {
      synthRef.current.onvoiceschanged = loadVoices;
    } else {
      loadVoices();
    }

    utterance.onend = () => setState(VoiceInteractionState.IDLE);
    utterance.onerror = () => {
      setState(VoiceInteractionState.ERROR);
      setErrorHeader('Voice playback failed');
      setTimeout(() => setState(VoiceInteractionState.IDLE), 3000);
    };

    synthRef.current.speak(utterance);
  }, [isMuted]);

  const monitorSilence = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const volume = dataArray.reduce((src, val) => src + val, 0) / dataArray.length;
    
    if (volume < 5) {
      if (silenceStartRef.current === null) {
        silenceStartRef.current = Date.now();
      } else if (Date.now() - silenceStartRef.current > 2000) {
        stopRecording();
        return;
      }
    } else {
      silenceStartRef.current = null;
    }
    
    animationFrameRef.current = requestAnimationFrame(monitorSilence);
  }, []);

  const startRecording = useCallback(async () => {
    if (state !== VoiceInteractionState.IDLE) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
        if (audioBlob.size < 1000) {
          setState(VoiceInteractionState.IDLE);
          return;
        }
        await handleTranscription(audioBlob);
      };

      recorder.start();
      setState(VoiceInteractionState.LISTENING);
      silenceStartRef.current = null;
      monitorSilence();

      maxRecordingTimerRef.current = setTimeout(() => {
        stopRecording();
      }, 30000);

    } catch (err) {
      setState(VoiceInteractionState.ERROR);
      setErrorHeader('Microphone access denied');
      setTimeout(() => setState(VoiceInteractionState.IDLE), 3000);
    }
  }, [state, monitorSilence]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (maxRecordingTimerRef.current) clearTimeout(maxRecordingTimerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
  }, []);

  const handleTranscription = async (audioBlob: Blob) => {
    setState(VoiceInteractionState.PROCESSING_STT);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch(`${API_BASE_URL}/practice/voice/transcribe/${sessionId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: formData
      });

      const result = await response.json();
      if (result.success && result.data.transcript) {
        const text = result.data.transcript.trim();
        if (text.length < 3) {
           setErrorHeader("Didn't catch that. Please speak clearly.");
           setState(VoiceInteractionState.ERROR);
           setTimeout(() => setState(VoiceInteractionState.IDLE), 3000);
           return;
        }
        setTranscript(text);
        
        // INTERVIEW MODIFICATION
        // Prepend contextual instruction to force interviewer persona on the generic mentor endpoint
        const interviewerForcedText = `[SYSTEM OVERRIDE: Act as a strict technical interviewer. Do NOT give code answers. Only evaluate my approach or provide high-level conceptual nudges. Keep it extremely brief.] ${text}`;
        
        await handleAIInteraction(interviewerForcedText, text);
      } else {
        throw new Error('Transcription failed');
      }
    } catch (err) {
      setState(VoiceInteractionState.ERROR);
      setErrorHeader('Transcription failed');
      setTimeout(() => setState(VoiceInteractionState.IDLE), 3000);
    }
  };

  const handleAIInteraction = async (forceText: string, originalText: string) => {
    setState(VoiceInteractionState.PROCESSING_LLM);
    setStreamedResponse('');
    
    const url = `${API_BASE_URL}/practice/voice/${sessionId}`;
    const token = localStorage.getItem('auth_token');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          transcript: forceText, // Use the appended forced text
          userCode: userCode,
          history: history.map(h => ({ transcript: h.transcript, response: h.response })),
        })
      });

      if (!response.body) throw new Error('No response body');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; 
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          
          if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.substring(6));
              if (data.type === 'chunk' || data.content) {
                fullText += data.content || '';
                setStreamedResponse(fullText);
              } else if (data.type === 'done' || data.done) {
                const finalResponse = data.full_response || fullText;
                
                setHistory(prev => [...prev.slice(-4), {
                  transcript: originalText, // Use original text for UI history
                  response: finalResponse,
                  timestamp: Date.now()
                }]);

                speak(finalResponse);
              }
            } catch (e) {}
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setState(VoiceInteractionState.ERROR);
        setErrorHeader('AI Interviewer unavailable');
        setTimeout(() => setState(VoiceInteractionState.IDLE), 3000);
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const toggleMute = () => setIsMuted(prev => !prev);

  return {
    state,
    transcript,
    streamedResponse,
    isMuted,
    errorHeader,
    startRecording,
    stopRecording,
    toggleMute,
    stopSpeaking,
    handleAIInteraction,
    isRecording: state === VoiceInteractionState.LISTENING,
    isProcessing: state === VoiceInteractionState.PROCESSING_STT || state === VoiceInteractionState.PROCESSING_LLM,
    isStreaming: state === VoiceInteractionState.PROCESSING_LLM && streamedResponse.length > 0,
    isSpeaking: state === VoiceInteractionState.SPEAKING
  };
};

export default useVoiceInterviewer;
