import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Clock, AlertTriangle, CheckCircle2, BookOpen, ChevronRight, Zap, History, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { PageTitle, SectionTitle, CardTitle, BodyText, MutedText } from '@/components/ui/Typography';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface RevisionTopic {
  topicId: string;
  retentionProbability: number;
  stabilityScore: number;
  masteryProbability: number;
  riskScore: number;
  urgencyLevel: string;
  revisionPriority: number;
  reasonForRecommendation: string;
  nextRevisionDate?: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export default function Revision() {
  const [topics, setTopics] = useState<RevisionTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const response = await api.get('/revision/queue');
        if (response.data.success) {
          setTopics(response.data.prioritizedTopics || []);
        }
      } catch (error) {
        console.error('Failed to load revision queue', error);
      } finally {
        setLoading(false);
      }
    };
    fetchQueue();
  }, []);

  const handleStartRevision = async (topicId: string) => {
    try {
      const resp = await api.post('/revision/start', { topicId });
      if (resp.data.success) {
        navigate(`/revision/${topicId}/session/${resp.data.revisionSessionId}`);
      }
    } catch (err: any) {
      console.error('Failed to start revision', err);
      alert(err.response?.data?.message || 'Failed to start revision. No problems available.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary border-t-transparent shadow-glow" />
        <MutedText className="animate-pulse">Optimizing revision schedule...</MutedText>
      </div>
    );
  }

  const dueTodayCount = topics.filter(t => t.urgencyLevel === 'high' || t.urgencyLevel === 'critical').length;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <motion.div variants={item}>
          <PageTitle>Active Retention</PageTitle>
          <BodyText className="mt-1">AI-powered spaced repetition to ensure long-term mastery of critical concepts.</BodyText>
        </motion.div>
        <motion.div variants={item} className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
          <History className="h-3.5 w-3.5 text-primary" />
          NEURAL SYNC ACTIVE
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {[
          { label: 'Topics in Queue', value: topics.length, icon: RotateCcw, color: 'text-primary', bg: 'bg-primary/5' },
          { label: 'High Priority', value: dueTodayCount, icon: Clock, color: 'text-rose-500', bg: 'bg-rose-500/5' },
          { label: 'Retained Stability', value: '84%', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/5' },
        ].map((stat, i) => (
          <motion.div key={i} variants={item} className={cn("p-6 rounded-2xl border border-border bg-card shadow-soft text-center group transition-all hover:shadow-premium", stat.bg)}>
            <stat.icon className={cn("mx-auto h-6 w-6 mb-3", stat.color)} />
            <p className="text-3xl font-bold tracking-tight text-foreground">{stat.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <SectionTitle>Revision Queue</SectionTitle>
          <MutedText className="text-[10px] uppercase tracking-widest font-bold">Priority Sorted</MutedText>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence>
            {topics.map((t, idx) => {
              const retPct = Math.round(t.retentionProbability * 100);
              const isHighPriority = t.urgencyLevel === 'critical' || t.urgencyLevel === 'high';
              
              return (
                <motion.div 
                  key={t.topicId} 
                  variants={item}
                  layout
                  whileHover={{ x: 4 }}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:border-primary/30 hover:shadow-premium"
                >
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="relative shrink-0 flex items-center justify-center">
                        <svg className="h-14 w-14 -rotate-90 transform" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" className="stroke-muted opacity-20" strokeWidth="3" />
                          <circle 
                            cx="18" 
                            cy="18" 
                            r="16" 
                            fill="none"
                            className={cn(
                              "transition-all duration-700 ease-out",
                              retPct >= 70 ? 'stroke-emerald-500' : retPct >= 50 ? 'stroke-amber-500' : 'stroke-rose-500'
                            )}
                            strokeWidth="3" 
                            strokeDasharray={`${retPct} 100`} 
                            strokeLinecap="round" 
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xs font-bold text-foreground">{retPct}%</span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-base font-bold text-foreground capitalize group-hover:text-primary transition-colors">
                            {t.topicId.replace(/_/g, ' ').replace(/-/g, ' ')}
                          </h4>
                          {isHighPriority && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                              <Zap className="h-2.5 w-2.5 text-rose-500 fill-current" />
                              <span className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter">Urgent</span>
                            </div>
                          )}
                        </div>
                        <MutedText className="text-xs leading-relaxed max-w-lg">
                          {t.reasonForRecommendation}
                        </MutedText>
                        <div className="mt-3 flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Stable Master: {Math.round(t.masteryProbability * 100)}%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-border" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Rank: {t.revisionPriority}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden md:flex flex-col items-end text-right">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md",
                          isHighPriority ? 'text-rose-500' : t.urgencyLevel === 'medium' ? 'text-amber-500' : 'text-muted-foreground'
                        )}>
                          {t.urgencyLevel} RISK
                        </span>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => handleStartRevision(t.topicId)}
                        className="rounded-xl px-5 h-10 font-bold shadow-glow hover:shadow-primary/40 transition-all active:scale-95 group-hover:scale-105"
                      >
                        Launch Revision
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {topics.length === 0 && (
            <motion.div variants={item} className="p-12 text-center rounded-2xl border-2 border-dashed border-border flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Retention Sync Complete</CardTitle>
                <MutedText className="mt-1">All topics are within their optimal retention thresholds.</MutedText>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <motion.div variants={item} className="p-8 rounded-2xl border border-border bg-muted/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
          <Sparkles className="h-32 w-32" />
        </div>
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-foreground">Why Revision Matters?</h4>
            <BodyText className="mt-1">Our AI tracks your <span className="text-primary font-semibold">Forgetting Curve</span>. Missing a revision cycle can drop retention from 90% to 40% in just 72 hours. Stay consistent to build permanent memory.</BodyText>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
