import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, AlertOctagon, Terminal } from 'lucide-react';
import api from '../services/api';
import { PageTitle, SectionTitle, BodyText, CodeText, MutedText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MonacoEditor from '@/components/MonacoEditor';
import { useProctoring } from '@/hooks/useProctoring';
import VoiceInterviewerOrb from '@/components/VoiceInterviewerOrb';

export default function MockInterviewSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [problems, setProblems] = useState<any[]>([]);
  const [currentProblemIdx, setCurrentProblemIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes
  const [userCode, setUserCode] = useState('');
  const [startIntro, setStartIntro] = useState(false);
  
  const { isFullscreen, requestFullscreen, violations, isTerminated, exitFullscreen } = useProctoring(3);

  // Generate 2 questions on mount
  useEffect(() => {
    const generateQuestions = async () => {
      try {
        // Fallback or generic topic mapping - using Arrays as a safe default for technical interviews
        const res = await api.post('/practice/topics/Arrays/generate-questions', {
          options: { limit: 2 }
        });
        
        if (res.data?.success && res.data.questions?.length > 0) {
          setProblems(res.data.questions.slice(0, 2));
        } else {
          // Fallback static problems if generation fails
          setProblems([
            {
              problemTitle: "Two Sum",
              difficulty: "Medium",
              description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
              constraints: "Time: O(n), Space: O(n)",
              starterCode: { python: "def twoSum(self, nums, target):\n    pass" }
            },
            {
              problemTitle: "Valid Palindrome",
              difficulty: "Easy",
              description: "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.",
              constraints: "Time: O(n), Space: O(1)",
              starterCode: { python: "def isPalindrome(self, s: str) -> bool:\n    pass" }
            }
          ]);
        }
      } catch (err) {
        console.error("Failed to generate questions", err);
        // Load fallback questions on error
        setProblems([
          {
            problemTitle: "Two Sum",
            difficulty: "Medium",
            description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
            constraints: "Time: O(n), Space: O(n)",
            starterCode: { python: "def twoSum(self, nums, target):\n    pass" }
          },
          {
            problemTitle: "Valid Palindrome",
            difficulty: "Easy",
            description: "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.",
            constraints: "Time: O(n), Space: O(1)",
            starterCode: { python: "def isPalindrome(self, s: str) -> bool:\n    pass" }
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    generateQuestions();
  }, []);

  // Timer logic
  useEffect(() => {
    if (!sessionStarted || isTerminated || timeLeft <= 0) return;
    
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [sessionStarted, isTerminated, timeLeft]);

  // Handle auto-termination
  useEffect(() => {
    if (isTerminated) {
      alert("Session Terminated due to security violations.");
      navigate('/mock-interview');
    }
  }, [isTerminated, navigate]);

  const handleStartSession = async () => {
    await requestFullscreen();
    setSessionStarted(true);
    setStartIntro(true);
    if (problems[0]?.starterCode?.python) {
      setUserCode(problems[0].starterCode.python);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary border-t-transparent shadow-glow" />
        <MutedText className="animate-pulse">Synthesizing Interview Environment & Generating AI Problems...</MutedText>
      </div>
    );
  }

  if (!sessionStarted) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] max-w-2xl mx-auto text-center space-y-6">
        <AlertOctagon className="h-16 w-16 text-primary mb-4" />
        <PageTitle>Environment Ready</PageTitle>
        <BodyText>Your 15-minute technical interview has been generated. The AI interviewer will act as a strict engineering manager. You will NOT receive code hints, only conceptual guidance if you ask.</BodyText>
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl text-sm">
          <strong>SECURITY WARNING:</strong> Leaving fullscreen, switching tabs, or clicking outside the browser will result in immediate termination. Ensure you are ready.
        </div>
        <Button onClick={handleStartSession} size="lg" className="rounded-xl px-12 py-6 text-lg tracking-widest bg-primary hover:bg-primary/90">
          ENTER FULLSCREEN & BEGIN
        </Button>
      </div>
    );
  }

  const currentProblem = problems[currentProblemIdx];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      {/* HUD Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-card rounded-2xl border border-border/40 shadow-soft">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-destructive border-transparent bg-destructive/10 font-mono text-lg animate-pulse">
            {formatTime(timeLeft)}
          </Badge>
          <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
            {violations > 0 ? <span className="text-amber-500">WARNINGS: {violations}/3</span> : 'SECURE SESSION'}
          </span>
        </div>
        <div>
           <Button variant="outline" size="sm" onClick={async () => { await exitFullscreen(); navigate('/mock-interview'); }} className="text-xs uppercase tracking-widest">
             End Session
           </Button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 grid lg:grid-cols-2 gap-6 min-h-0">
        
        {/* Left pane: Problem */}
        <div className="bg-card rounded-2xl border border-border/40 shadow-soft overflow-y-auto custom-scrollbar p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20">{currentProblem?.difficulty || 'Medium'}</Badge>
              <MutedText className="text-xs font-bold uppercase tracking-widest">Problem {currentProblemIdx + 1} of 2</MutedText>
            </div>
            
            <h2 className="text-2xl font-bold">{currentProblem?.problemTitle || currentProblem?.title}</h2>
            
            <div className="prose prose-invert prose-sm">
              <p>{currentProblem?.description}</p>
            </div>

            <div className="pt-6 border-t border-border/40">
              <MutedText className="text-[10px] uppercase font-bold tracking-widest mb-2">Constraints & Test Cases</MutedText>
              <CodeText className="text-xs block bg-background p-3 rounded-lg border border-border/50 mb-4">
                {currentProblem?.constraints || 'Standard memory and time limits apply.'}
              </CodeText>
              
              <div className="space-y-3">
                {currentProblem?.testCasesStructured?.filter((tc: any) => tc.visibility === 'public').map((tc: any, idx: number) => (
                  <div key={idx} className="bg-background p-3 rounded-lg border border-border/50">
                     <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Standard Input</p>
                     <CodeText className="text-xs text-foreground block mb-2">{JSON.stringify(tc.input, null, 2)}</CodeText>
                     <p className="text-[10px] font-bold text-emerald-500/70 uppercase mb-1">Target Output</p>
                     <CodeText className="text-xs text-emerald-500/80 block">{JSON.stringify(tc.expectedOutput, null, 2)}</CodeText>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right pane: Code Editor */}
        <div className="bg-card rounded-2xl border border-border/40 shadow-soft flex flex-col overflow-hidden min-h-0">
          <div className="flex flex-col h-full bg-[#1e1e1e]">
            {/* Action Bar from PracticeProblem logic */}
            <div className="h-14 border-b border-border/10 bg-black/40 px-4 flex justify-between items-center shrink-0">
              <Badge variant="outline" className="bg-background/5 text-foreground/70 border-white/10 uppercase tracking-widest text-[10px] font-bold">
                 Python 3.10
              </Badge>
              <Button className="h-8 rounded-lg bg-primary text-xs font-bold tracking-widest text-primary-foreground hover:bg-primary/90 px-6">
                 RUN TESTS
              </Button>
            </div>
            
            <div className="flex-1 relative">
              <MonacoEditor 
                language="python" 
                defaultValue={userCode}
                onChange={setUserCode}
                height="100%"
                theme="dark"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Voice Mentor Orb Component (matching practice lab style exactly) */}
      <VoiceInterviewerOrb 
         sessionId={sessionId || 'demo'} 
         userCode={userCode} 
         problemTitle={currentProblem?.problemTitle || currentProblem?.title}
         startIntro={startIntro}
      />
    </div>
  );
}
