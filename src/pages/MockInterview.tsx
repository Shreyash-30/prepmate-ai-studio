import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Clock, Lock, Play, BarChart3, Brain, MessageSquare, Shield, ChevronRight, Zap, Target, Award, AlertCircle, Terminal } from 'lucide-react';
import { PageTitle, SectionTitle, CardTitle, BodyText, MutedText, CodeText } from '@/components/ui/Typography';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const pastInterviews = [
  { id: '1', date: 'Feb 12, 2026', coding: 78, reasoning: 72, communication: 80, pressure: 65, status: 'Qualified' },
  { id: '2', date: 'Feb 8, 2026', coding: 65, reasoning: 60, communication: 70, pressure: 55, status: 'Needs Improvement' },
  { id: '3', date: 'Feb 3, 2026', coding: 58, reasoning: 55, communication: 65, pressure: 50, status: 'Novice' },
];

export default function MockInterview() {
  const navigate = useNavigate();

  const handleStart = () => {
    // Generate a temporary session ID and navigate to the session page
    const sessionId = `int_${Date.now()}`;
    navigate(`/interview/session/${sessionId}`);
  };

  const container: any = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const item: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div variants={item}>
          <PageTitle>Candidate Validation</PageTitle>
          <BodyText className="mt-1">High-fidelity interview simulation engine for pressure-tested performance metrics.</BodyText>
        </motion.div>
        <motion.div variants={item} className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
          <Award className="h-3.5 w-3.5 text-primary" />
          ELITE STATUS READY
        </motion.div>
      </div>

      {/* Start Sequence Hero */}
      <motion.div 
        variants={item}
        whileHover={{ y: -5 }} 
        className="glass-card p-12 text-center max-w-2xl mx-auto border-2 border-primary/20 bg-card shadow-premium relative overflow-hidden group rounded-[2.5rem]"
      >
        <div className="absolute inset-0 bg-primary/[0.02] group-hover:bg-primary/[0.04] transition-colors" />
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 group-hover:scale-110 transition-transform">
           <Zap className="h-48 w-48" />
        </div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-primary text-white shadow-glow animate-float">
            <Mic className="h-10 w-10 fill-current" />
          </div>
          <h2 className="mt-8 text-3xl font-bold text-foreground tracking-tight">Stage 1: Technical Screening</h2>
          <BodyText className="mt-2 text-base opacity-70">2 High-Intensity Problems • No Progressive Hints • Live Pressure Monitoring</BodyText>
          
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            {[
              { icon: Clock, label: '20 MIN LIMIT', color: 'text-amber-500' },
              { icon: Lock, label: '0 HINTS ALLOTTED', color: 'text-rose-500' },
              { icon: Shield, label: 'INTEGRITY ENGINE', color: 'text-indigo-500' }
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-muted/50 border border-border/50">
                 <stat.icon className={cn("h-4 w-4", stat.color)} />
                 <span className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/70">{stat.label}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={handleStart}
            size="lg"
            className="mt-10 rounded-2xl bg-primary px-10 h-14 font-extrabold text-sm tracking-widest shadow-glow hover:shadow-primary/40 active:scale-95 transition-all group scale-105"
          >
            <Play className="h-5 w-5 mr-3 fill-current group-hover:scale-110" /> BEGIN ASSESSMENT
          </Button>
        </div>
      </motion.div>

      {/* Analytics History */}
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between px-2">
          <SectionTitle className="text-lg">Performance Logs</SectionTitle>
          <MutedText className="text-[10px] uppercase font-bold tracking-widest">Temporal Analysis</MutedText>
        </div>
        
        <div className="space-y-4">
          {pastInterviews.map((interview, idx) => (
            <motion.div 
              key={interview.id} 
              variants={item}
              whileHover={{ x: 4 }}
              className="glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-primary/20 shadow-soft"
            >
              <div className="flex items-center gap-6">
                <div className="h-12 w-12 rounded-2xl bg-muted/50 border border-border/50 flex flex-col items-center justify-center font-bold">
                   <span className="text-[10px] text-muted-foreground uppercase leading-none">{interview.date.split(' ')[0]}</span>
                   <span className="text-sm text-foreground">{interview.date.split(' ')[1].replace(',', '')}</span>
                </div>
                <div>
                   <h4 className="text-sm font-bold text-foreground mb-1 group-hover:text-primary transition-colors">Session Log #{interview.id}</h4>
                   <Badge className={cn("text-[8px] uppercase font-extrabold py-0 h-4", 
                      interview.status === 'Qualified' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                      interview.status === 'Needs Improvement' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                      'bg-muted text-muted-foreground'
                   )}>
                      {interview.status}
                   </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-8 md:gap-12">
                {[
                  { icon: BarChart3, value: interview.coding, label: 'Code', color: 'text-primary' },
                  { icon: Brain, value: interview.reasoning, label: 'Logic', color: 'text-amber-500' },
                  { icon: MessageSquare, value: interview.communication, label: 'Voice', color: 'text-emerald-500' }
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                     <div className="flex items-center gap-2">
                        <stat.icon className={cn("h-3.5 w-3.5", stat.color)} />
                        <span className="text-sm font-bold text-foreground">{stat.value}%</span>
                     </div>
                     <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                  </div>
                ))}
              </div>

              <button className="text-[10px] font-extrabold text-primary hover:underline uppercase tracking-widest flex items-center gap-1">
                FULL TELEMETRY <ChevronRight className="h-3 w-3" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
