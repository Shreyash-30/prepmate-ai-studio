import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight, Check, BookOpen, Brain, History, Sparkles, Target, Zap, ShieldAlert, BadgeCheck, Loader } from 'lucide-react';
import api from '../services/api';
import { PageTitle, SectionTitle, CardTitle, BodyText, MutedText } from '@/components/ui/Typography';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function RevisionWorkspace() {
  const { topicId, sessionId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const sumResp = await api.post('/ai/revision/summary', {
          topicName: topicId?.replace(/_/g, ' ') || 'Topic',
          retentionProbability: 0.5
        });
        if (sumResp.data) {
          setSummary(sumResp.data);
        }
      } catch (err) {
        console.error('Failed to get summary', err);
        setSummary({
          summary: "This is a placeholder summary since the AI endpoint wasn't found.",
          memoryChecklist: ["Review core theoretical concepts", "Trace fundamental algorithms", "Practice handling edge cases"],
          commonPitfalls: ["Forgetting boundary condition checks", "Overlooking simple edge cases"],
          edgeCaseWarnings: ["Handling empty data structures correctly", "Extremely large inputs causing overflow"]
        });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [topicId, sessionId]);

  const handleSubmit = async () => {
    setCompleting(true);
    try {
      const resultsData = [
         { problemId: 'some-problem', correct: true, solveTime: 5000, hintsUsed: 0 }
      ];
      const resp = await api.post('/revision/submit', {
        revisionSessionId: sessionId,
        results: resultsData
      });
      if (resp.data.success) {
        navigate('/revision');
      }
    } catch (err) {
      console.error('Submit failed', err);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary border-t-transparent shadow-glow" />
        <MutedText className="animate-pulse">Loading Mission Briefing...</MutedText>
      </div>
    );
  }

  const container: any = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const item: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div variants={item} className="space-y-2">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/revision')} className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest">
              ← RETENTION QUEUE
            </button>
            <div className="h-1 w-1 rounded-full bg-border" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              MISSION ID: {sessionId?.slice(0, 8)}
            </span>
          </div>
          <PageTitle className="capitalize text-4xl">{topicId?.replace(/_/g, ' ').replace(/-/g, ' ')} Revision</PageTitle>
          <BodyText className="max-w-2xl opacity-70">Synthesized recap and validation set to reinforce neural pathways for this domain.</BodyText>
        </motion.div>
        
        <motion.div variants={item}>
          <Button 
            onClick={handleSubmit} 
            disabled={completing}
            size="lg"
            className="rounded-2xl bg-primary px-8 h-14 font-extrabold text-sm tracking-widest shadow-glow hover:shadow-primary/40 active:scale-95 transition-all group"
          >
            {completing ? <Loader className="w-5 h-5 animate-spin mr-3" /> : <BadgeCheck className="w-5 h-5 mr-3 transition-transform group-hover:scale-110" />}
            COMPLETE REVISION
          </Button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Col: Briefing & Intelligence */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div variants={item} className="glass-card p-6 border-l-4 border-l-primary bg-card shadow-premium relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform">
              <History className="h-24 w-24" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Brain className="h-5 w-5" />
              </div>
              <SectionTitle className="text-lg">Concept Recap</SectionTitle>
            </div>
            <p className="text-sm leading-relaxed text-foreground/80 font-medium">
              {summary?.summary || 'No summary available.'}
            </p>
          </motion.div>
          
          <motion.div variants={item} className="glass-card p-6 bg-card shadow-soft">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <SectionTitle className="text-sm uppercase tracking-widest">Memory Checklist</SectionTitle>
            </div>
            <ul className="space-y-4">
              {(summary?.memoryChecklist || []).map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-3 group">
                  <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-500 transition-colors group-hover:bg-emerald-500/20">
                    <Check className="h-2.5 w-2.5 stroke-[3px]" />
                  </div>
                  <span className="text-xs font-semibold text-foreground/70 group-hover:text-foreground transition-colors leading-snug">{item}</span>
                </li>
              ))}
              {!summary?.memoryChecklist && <MutedText className="text-[10px] animate-pulse">Scanning knowledge base...</MutedText>}
            </ul>
          </motion.div>
          
          <motion.div variants={item} className="glass-card p-6 bg-rose-500/[0.02] border border-rose-500/10 shadow-soft">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <SectionTitle className="text-sm uppercase tracking-widest text-rose-500/80">Critical Traps</SectionTitle>
            </div>
            <ul className="space-y-4">
              {[...(summary?.commonPitfalls || []), ...(summary?.edgeCaseWarnings || [])].map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-3 group">
                  <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 transition-transform group-hover:rotate-12">
                    <Zap className="h-2.5 w-2.5 fill-current" />
                  </div>
                  <span className="text-xs font-semibold text-foreground/70 group-hover:text-rose-500/80 transition-colors leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Right Col: Simulation Stage */}
        <div className="lg:col-span-8">
          <motion.div variants={item} className="glass-card flex flex-col h-full bg-card shadow-premium rounded-3xl overflow-hidden border-border/40">
            <div className="border-b border-border p-6 bg-muted/20 flex items-center justify-between">
              <div>
                <SectionTitle className="text-lg">Validation Stage</SectionTitle>
                <MutedText className="text-[10px] uppercase tracking-widest font-bold mt-1">Interactive Reinforcement Hub</MutedText>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-bold text-primary uppercase">Adaptive Mode</span>
              </div>
            </div>
            
            <div className="flex-1 p-12 flex items-center justify-center flex-col text-center relative">
               <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
               <div className="relative z-10 space-y-6 max-w-md">
                 <div className="flex justify-center">
                    <div className="h-24 w-24 rounded-full bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shadow-inner group-hover:scale-105 transition-transform duration-500">
                      <BookOpen className="h-10 w-10 opacity-60" />
                    </div>
                 </div>
                 <div className="space-y-2">
                   <h3 className="text-xl font-bold text-foreground">Mission Ready</h3>
                   <BodyText className="opacity-60">The simulation environment is prepopulated with 4 targeted problems designed to test specific memory nodes.</BodyText>
                 </div>
                 <MutedText className="text-xs italic bg-muted/30 p-4 rounded-2xl border border-border/50">
                   Note: The IDE Component integration is currently decoupled for this specific revision vector. Click the primary action above to commit your current mastery status.
                 </MutedText>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-muted/50 border border-border/30 text-left">
                       <p className="text-[10px] font-extrabold uppercase text-muted-foreground mb-1">Duration</p>
                       <p className="text-xs font-bold font-mono">15:00 ETA</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-muted/50 border border-border/30 text-left">
                       <p className="text-[10px] font-extrabold uppercase text-muted-foreground mb-1">Target</p>
                       <p className="text-xs font-bold font-mono">95% Retention</p>
                    </div>
                 </div>
               </div>
            </div>
          </motion.div>
        </div>

      </div>

    </motion.div>
  );
}
