/**
 * PracticeProblem Page - Redesigned
 * Premium AI Code Lab Experience
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, HelpCircle, RefreshCw, CheckCircle, AlertCircle, 
  Loader, Zap, Terminal, Code2, BookOpen, Sparkles, 
  ChevronRight, Brain, Lightbulb, Play
} from 'lucide-react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { usePracticeSession } from '@/hooks/usePracticeSession';
import { MonacoEditor } from '@/components/MonacoEditor';
import { InlineAssist } from '@/components/InlineAssist';
import { CodeReviewPanel } from '@/components/CodeReviewPanel';
import { ExplanationModal } from '@/components/ExplanationModal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import VoiceMentorOrb from '@/components/VoiceMentorOrb';
import { PageTitle, SectionTitle, CardTitle, BodyText, MutedText, CodeText } from '@/components/ui/Typography';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface ProblemData {
  id: string;
  problemId?: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  initialCode: string;
  language?: 'python' | 'javascript' | 'java' | 'cpp' | 'go';
  testCases?: Array<{ input: string; output: string }>;
  constraints?: string[];
  problemTitle?: string;
  topic?: string;
  whyRecommended?: string;
  hints?: string[];
  approachGuide?: string;
  topicId?: string;
}

export default function PracticeProblem() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { problemId } = useParams<{ problemId: string }>();
  const location = useLocation();
  const locationState = location.state as { problem?: ProblemData } | null;

  const {
    session,
    loading: sessionLoading,
    submitting,
    error: sessionError,
    createSession,
    submitCode,
    getHint,
    runCode,
    handleVoice,
    cancel,
  } = usePracticeSession();

  // Local state
  const [problem, setProblem] = useState<ProblemData | null>(null);
  const [loadingProblem, setLoadingProblem] = useState(true);
  const [code, setCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [savedCode, setSavedCode] = useState<Record<string, string>>({}); 
  const [cursorLine, setCursorLine] = useState(0);
  const [hints, setHints] = useState<string[]>([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [gettingHint, setGettingHint] = useState(false);
  const [showInlineAssist, setShowInlineAssist] = useState(false);
  const [showCodeReview, setShowCodeReview] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [hintText, setHintText] = useState("");
  const [running, setRunning] = useState(false);
  const [runResults, setRunResults] = useState<any>(null);

  // Load problem
  useEffect(() => {
    const loadProblem = async () => {
      try {
        setLoadingProblem(true);
        if (locationState?.problem) {
          const selectedProblem = locationState.problem;
          const problemData: ProblemData = {
            id: selectedProblem.problemId || selectedProblem.id || problemId || 'unknown',
            title: selectedProblem.problemTitle || selectedProblem.title || 'Unknown Problem',
            description: selectedProblem.description || selectedProblem.whyRecommended || 'Solve this problem',
            difficulty: (selectedProblem.difficulty?.toLowerCase() as any) || 'medium',
            initialCode: selectedProblem.initialCode || `# Solve the problem\n# Write your solution here`,
            testCases: selectedProblem.testCases || [],
            constraints: selectedProblem.constraints || [],
            topic: selectedProblem.topic || (selectedProblem as any).topicId,
            topicId: (selectedProblem as any).topicId || selectedProblem.topic,
            whyRecommended: selectedProblem.whyRecommended,
            hints: selectedProblem.hints,
            approachGuide: selectedProblem.approachGuide,
          };
          setProblem(problemData);
          setCode(problemData.initialCode);
        } else {
          const token = localStorage.getItem('auth_token') || 'demo-token';
          const response = await fetch(`${API_BASE_URL}/practice/questions/${problemId}`, { 
            headers: { Authorization: `Bearer ${token}` } 
          }).catch(() => null);

          if (response?.ok) {
            const result = await response.json();
            const data = result.data;
            const problemData: ProblemData = {
              id: data.problemId || data.id || problemId || 'unknown',
              problemId: data.problemId || data.id,
              title: data.title || data.problemTitle || 'Unknown Problem',
              description: data.description || data.content || 'Solve this problem',
              difficulty: data.difficulty?.toLowerCase() as any || 'medium',
              initialCode: data.starterCode?.python || data.starterCode?.javascript || data.initialCode || data.code || `# Solve the problem\n# Write your solution here`,
              testCases: data.testCases || [],
              constraints: data.constraints || [],
              topicId: data.topicId || data.topic,
            };
            setProblem(problemData);
            setCode(problemData.initialCode);
          } else {
            const defaultProblem: ProblemData = {
              id: problemId || 'two-sum',
              title: 'Two Sum',
              description: 'Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target.',
              difficulty: 'easy',
              initialCode: 'def twoSum(nums: list[int], target: int) -> list[int]:\n    pass',
              testCases: [{ input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' }],
              constraints: ['2 <= nums.length <= 104', '-109 <= nums[i] <= 109'],
            };
            setProblem(defaultProblem);
            setCode(defaultProblem.initialCode);
          }
        }
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to load problem' });
      } finally {
        setLoadingProblem(false);
      }
    };
    loadProblem();
  }, [problemId, locationState, toast]);

  // Initialize session
  useEffect(() => {
    if (!session && problem) {
      const language = problem.language || 'python';
      setSelectedLanguage(language);
      createSession((problem as any).topic || (problem as any).topicId || 'general', (problem as any).problemId || problem.id, language).catch(() => {
        toast({ title: 'Error', description: 'Failed to create session' });
      });
    }
  }, [problem]);

  // Load starter code from session
  useEffect(() => {
    if (!session) return;
    const sessionData = session as any;
    if (sessionData.schemaVersion === 2 && sessionData.starterCode?.[selectedLanguage]) {
      const starter = sessionData.starterCode[selectedLanguage];
      setCode(starter);
      setSavedCode(prev => ({...prev, [selectedLanguage]: starter}));
    }
  }, [session, selectedLanguage]);

  const handleLanguageChange = (newLanguage: string) => {
    setSavedCode(prev => ({...prev, [selectedLanguage]: code}));
    const newCode = savedCode[newLanguage] || ((session as any)?.starterCode?.[newLanguage]) || problem?.initialCode || `# Write your solution here`;
    setCode(newCode);
    setSelectedLanguage(newLanguage);
  };

  const handleGetHint = async () => {
    if (!session?.sessionId) return;
    try {
      setGettingHint(true);
      setHintText("");
      const token = localStorage.getItem('auth_token') || 'demo-token';
      const response = await fetch(`${API_BASE_URL}/practice/hint/${session.sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentCode: code, language: selectedLanguage, hintLevel: hintLevel + 1 })
      });
      if (!response.ok) throw new Error("Failed to get hint");
      const reader = response.body!.getReader();
      const decoder = new TextDecoder("utf-8");
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        setHintText(prev => prev + decoder.decode(value, { stream: true }));
      }
      setHintLevel((prev) => Math.min(prev + 1, 5));
    } catch (err) {
      toast({ title: 'Hint Error', description: 'Failed to get hint' });
    } finally {
      setGettingHint(false);
    }
  };

  const handleInlineAssist = (codeStr: string, line: number) => {
    setCursorLine(line);
    setShowInlineAssist(true);
    // Optionally we could auto-trigger something here
  };

  const handleSubmit = async () => {
    if (!code.trim()) return;
    try {
      const result = await submitCode(code);
      if (result.verdict === 'accepted') {
        toast({ title: 'Accepted! ✅', description: `Passed all ${result.totalTests} tests` });
        setTimeout(() => setShowExplanation(true), 500);
      } else {
        toast({ title: 'Not Accepted', description: `${result.passedTests}/${result.totalTests} tests passed` });
      }
    } catch (err) {
      toast({ title: 'Submission Error', description: 'Failed to submit' });
    }
  };

  const handleRun = async () => {
    const testCasesToUse = (session as any)?.testCases;
    if (!code.trim() || !testCasesToUse?.length) return;
    try {
      setRunning(true);
      setRunResults(null);
      const result = await runCode(code, testCasesToUse);
      setRunResults(result);
      if (result.verdict === 'accepted') {
        toast({ title: '✅ Test Passed!', description: 'All test cases passed' });
      } else {
        toast({ title: '⚠️ Test Failed', description: `${result.passedTests}/${result.totalTests} tests passed` });
      }
    } catch (err) {
      toast({ title: 'Run Error', description: 'Failed to run code' });
    } finally {
      setRunning(false);
    }
  };

  if (loadingProblem) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary border-t-transparent shadow-glow" />
        <MutedText className="animate-pulse">Loading AI Lab Workspace...</MutedText>
      </div>
    );
  }

  const styles = {
    easy: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    hard: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  }[problem!.difficulty] || 'bg-muted text-muted-foreground';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-20">
      {/* Header Info */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/practice')} 
              className="group flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest"
            >
              <ChevronRight className="h-3 w-3 rotate-180 transition-transform group-hover:-translate-x-0.5" />
              PRACTICE ROOM
            </button>
            <div className="h-1 w-1 rounded-full bg-border" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              ID: {problem!.id}
            </span>
            {problem!.topic && (
              <>
                <div className="h-1 w-1 rounded-full bg-border" />
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                  CONCEPT: {problem!.topic}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <PageTitle className="text-2xl md:text-3xl lg:text-4xl">{problem!.title}</PageTitle>
            <Badge className={cn("px-4 py-1.5 font-bold text-[10px] uppercase border shadow-md transition-all hover:scale-105 cursor-default", styles)}>
              {problem!.difficulty}
            </Badge>
          </div>
          <BodyText className="max-w-4xl text-foreground/70 leading-relaxed font-medium text-sm md:text-base">
            {problem!.description}
          </BodyText>
        </div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="flex items-center gap-4 bg-card/40 hover:bg-card/60 p-4 rounded-2xl border border-border/50 backdrop-blur-xl self-stretch lg:self-auto shadow-premium transition-all group"
        >
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
            <Brain className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Cognitive Sync</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">Active Analysis</span>
              <div className="flex gap-0.5">
                {[1, 2, 3].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ height: [4, 12, 4] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="w-1 bg-primary rounded-full"
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left: Problem Details & Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Constraints Card */}
          {problem!.constraints && problem!.constraints.length > 0 && (
            <div className="glass-card p-5 border-l-4 border-l-primary/40 bg-card shadow-soft">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 rounded bg-primary/10 text-primary">
                  <Terminal className="w-3.5 h-3.5" />
                </div>
                <CardTitle className="text-xs uppercase tracking-widest opacity-70">Constraints</CardTitle>
              </div>
              <ul className="space-y-2.5">
                {(Array.isArray(problem!.constraints) ? problem!.constraints : typeof problem!.constraints === 'string' ? (problem!.constraints as string).split('\n') : []).map((c, i) => (
                  <li key={i} className="text-xs text-foreground/80 font-mono leading-tight flex items-start gap-2">
                    <span className="text-primary font-bold">»</span>
                    {c as any}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Test Cases Preview */}
          <div className="glass-card p-5 bg-card shadow-soft overflow-hidden border border-border/40">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Play className="w-4 h-4" />
                </div>
                <CardTitle className="text-[10px] uppercase tracking-widest opacity-70">Sanity Checks</CardTitle>
              </div>
              <Badge variant="outline" className="text-[9px] font-bold px-1.5">
                {(session as any)?.testCases?.length || 0} TOTAL
              </Badge>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {((session as any)?.testCases || []).map((tc: any, i: number) => (
                <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-2 group hover:bg-muted/50 transition-all border-l-2 border-l-transparent hover:border-l-indigo-500">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 flex items-center gap-1">
                      <ChevronRight className="h-2 w-2" /> Input
                    </span>
                    <CodeText className="text-[10px] truncate block bg-black/5 dark:bg-black/20 border-none">
                      {typeof tc.input === 'object' ? JSON.stringify(tc.input) : tc.input}
                    </CodeText>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-emerald-500/70 uppercase flex items-center gap-1">
                      <ChevronRight className="h-2 w-2" /> Expected
                    </span>
                    <CodeText className="text-[10px] truncate block bg-emerald-500/5 border-none text-emerald-600 dark:text-emerald-400">
                      {typeof tc.expectedOutput === 'object' ? JSON.stringify(tc.expectedOutput) : tc.expectedOutput}
                    </CodeText>
                  </div>
                </div>
              ))}
              {(!(session as any)?.testCases?.length) && (
                <div className="flex flex-col items-center justify-center py-8 opacity-40">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
                  <MutedText className="text-[10px] italic text-center">Synthesizing test harnesses...</MutedText>
                </div>
              )}
            </div>
          </div>

          {/* AI Hints Sidebar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <CardTitle className="text-[10px] uppercase tracking-widest opacity-60">Adaptive Assistance</CardTitle>
              <Badge variant="outline" className="text-[9px] bg-muted/20 border-border/40">{hintLevel}/5</Badge>
            </div>
            
            <div className="glass-card p-4 space-y-4 max-h-[400px] overflow-y-auto bg-primary/[0.01] border-primary/10">
              <AnimatePresence mode="popLayout">
                {!hintText && hints.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-10 opacity-40 text-center">
                    <Lightbulb className="h-10 w-10 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Logic Decoupled</p>
                    <p className="text-[10px] mt-1">Unlock hints for strategic direction.</p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {hints.map((hint, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-xl border border-border/60 bg-background p-3 text-xs shadow-soft"
                      >
                        <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                          <Brain className="h-3 w-3" />
                          <span className="text-[9px] font-bold uppercase tracking-widest">STRATEGY LAYER {i + 1}</span>
                        </div>
                        <p className="text-foreground/80 leading-relaxed font-medium">{hint}</p>
                      </motion.div>
                    ))}
                    {hintText && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl bg-primary/[0.03] p-4 text-xs text-foreground border border-primary/20 shadow-glow"
                      >
                        <div className="font-bold text-primary mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest">
                          <Sparkles className="h-3 w-3" />
                          Live Feedback • Level {hintLevel}
                        </div>
                        <div className="prose prose-invert prose-xs whitespace-pre-wrap leading-relaxed italic text-foreground/90 font-medium">
                          {hintText}
                        </div>
                        {gettingHint && (
                          <span className="inline-block w-1.5 h-3 ml-1 bg-primary animate-pulse align-middle" />
                        )}
                      </motion.div>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </div>
            <Button
              variant="outline"
              onClick={handleGetHint}
              disabled={gettingHint || hintLevel >= 5}
              className="w-full rounded-xl border-dashed border-primary/30 text-primary font-bold text-xs h-12 hover:bg-primary/5 transition-all shadow-soft"
            >
              {gettingHint ? <Loader className="w-4 h-4 animate-spin mr-2" /> : <HelpCircle className="w-4 h-4 mr-2" />}
              {hintLevel === 0 ? "REQUEST STRATEGY" : `ESCALATE HINT (${hintLevel}/5)`}
            </Button>
          </div>
        </div>

        {/* Right: Code Editor & Execution */}
        <div className="lg:col-span-3 space-y-4 h-full flex flex-col">
          <div className="glass-card flex-1 flex flex-col bg-card border-border/60 shadow-premium overflow-hidden min-h-[600px] rounded-2xl">
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 shadow-inner">
                  <Code2 className="h-4 w-4" />
                </div>
                <h2 className="text-xs font-bold text-foreground uppercase tracking-widest opacity-70">Workspace Engine</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-background rounded-lg border border-border p-1">
                  {['python', 'javascript', 'java', 'cpp'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => handleLanguageChange(lang)}
                      className={cn(
                        "px-3 py-1 text-[10px] font-bold uppercase transition-all rounded-md",
                        selectedLanguage === lang ? "bg-primary text-white shadow-soft" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {lang === 'cpp' ? 'C++' : lang}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Monaco Container */}
            <div className="flex-1 relative border-b border-border">
              <MonacoEditor
                key={selectedLanguage}
                defaultValue={code || problem?.initialCode}
                language={selectedLanguage}
                onChange={setCode}
                onInlineAssist={handleInlineAssist}
                loading={sessionLoading}
                height="100%"
              />
              
              {/* Optional Inline Assist Overlay */}
              <AnimatePresence>
                {showInlineAssist && (
                  <div className="absolute inset-x-0 bottom-0 z-20">
                    <InlineAssist
                      code={code}
                      cursorLine={cursorLine}
                      isOpen={showInlineAssist}
                      onClose={() => setShowInlineAssist(false)}
                      onAccept={(suggestion) => {
                        setCode((prev) => prev + '\n' + suggestion);
                        setShowInlineAssist(false);
                      }}
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Execution Console */}
            <div className="bg-muted/10 p-4">
              <AnimatePresence>
                {runResults && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={cn(
                      "mb-4 p-4 rounded-xl border-2 transition-all shadow-soft",
                      runResults.verdict === 'accepted' ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {runResults.verdict === 'accepted' ? <CheckCircle className="h-5 w-5 text-emerald-500" /> : <AlertCircle className="h-5 w-5 text-rose-500" />}
                        <span className="text-sm font-bold uppercase tracking-tight text-foreground">
                          {runResults.verdict === 'accepted' ? 'Success' : 'Process Terminated'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Harness Tests</p>
                          <p className="text-xs font-bold text-foreground">{runResults.passedTests}/{runResults.totalTests}</p>
                        </div>
                        <div className="h-8 w-px bg-border/50" />
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Cycle Time</p>
                          <p className="text-xs font-bold text-foreground">{runResults.maxExecutionTime?.toFixed(3) || runResults.executionTime}s</p>
                        </div>
                      </div>
                    </div>
                    {runResults.testResults?.[0]?.stderr && (
                      <div className="mt-3 p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-[10px] text-rose-300 overflow-x-auto whitespace-pre">
                        {runResults.testResults[0].stderr}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Bar */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleRun}
                  disabled={running || sessionLoading}
                  className="rounded-xl border-border bg-background h-12 px-6 font-bold text-xs tracking-widest shadow-soft hover:shadow-premium transition-all active:scale-95 group"
                >
                  {running ? <Loader className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2 group-hover:fill-current" />}
                  DRY RUN
                </Button>

                <Button
                  size="lg"
                  onClick={handleSubmit}
                  disabled={submitting || sessionLoading}
                  className="flex-1 rounded-xl bg-primary h-12 font-bold text-xs tracking-widest shadow-glow hover:shadow-primary/40 transition-all active:scale-95 group"
                >
                  {submitting ? <Loader className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />}
                  EXECUTE & EVALUATE
                </Button>

                <div className="h-12 w-px bg-border/50 mx-1" />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCodeReview(!showCodeReview)}
                  className={cn("h-12 w-12 rounded-xl transition-all", showCodeReview ? "bg-primary/10 text-primary" : "hover:bg-muted")}
                >
                  <RefreshCw className={cn("h-5 w-5", submitting && "animate-spin")} />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowExplanation(true)}
                  className="h-12 w-12 rounded-xl hover:bg-indigo-500/10 hover:text-indigo-500"
                >
                  <BookOpen className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CodeReviewPanel
        code={code}
        isOpen={showCodeReview}
        onClose={() => setShowCodeReview(false)}
      />

      <ExplanationModal
        code={code}
        isOpen={showExplanation}
        onClose={() => setShowExplanation(false)}
        onSubmit={() => {
          toast({ title: 'Explanation Submitted ✅', description: 'Mastery metrics updated' });
        }}
      />

      {sessionError && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-500">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-xs font-bold uppercase tracking-tight">{typeof sessionError === 'string' ? sessionError : "Logic Engine Failure"}</p>
        </motion.div>
      )}

      {/* Voice AI Mentor Orb */}
      {session && session.sessionId && (
        <VoiceMentorOrb sessionId={session.sessionId} userCode={code} />
      )}
    </motion.div>
  );
}
