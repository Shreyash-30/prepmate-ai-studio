import { useState } from 'react';
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
  const [started, setStarted] = useState(false);

  const container: any = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const item: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  if (started) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
              <Shield className="h-4 w-4" />
            </div>
            <PageTitle>Live Assessment</PageTitle>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2 text-rose-500 shadow-soft animate-pulse">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-mono font-bold tracking-widest">19:42</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2 text-muted-foreground shadow-soft">
              <Lock className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-widest">Integrity Mode</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Problem Brief */}
          <motion.div variants={item} className="lg:col-span-5 space-y-4">
            <div className="glass-card p-6 bg-card border-border/60 shadow-premium relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:rotate-12 transition-transform">
                  <Target className="h-32 w-32" />
               </div>
               <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <MutedText className="text-[10px] uppercase tracking-widest font-bold opacity-60">Sequence 1 of 2</MutedText>
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold text-[10px] uppercase">Medium Intensity</Badge>
                </div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Two Sum</h2>
                <BodyText className="text-sm leading-relaxed text-foreground/80 font-medium">
                  Given an array of integers <CodeText className="bg-muted px-1">nums</CodeText> and an integer <CodeText className="bg-muted px-1">target</CodeText>, return indices of the two numbers such that they add up to target.
                  You may assume that each input would have exactly one solution, and you may not use the same element twice.
                </BodyText>
                
                <div className="space-y-3 pt-2">
                   <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Standard Input</p>
                      <CodeText className="text-[11px] block">nums = [2,7,11,15], target = 9</CodeText>
                   </div>
                   <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                      <p className="text-[9px] font-bold text-emerald-500/70 uppercase mb-1">Target Output</p>
                      <CodeText className="text-[11px] block text-emerald-500/80">[0,1]</CodeText>
                   </div>
                </div>

                <div className="pt-4 border-t border-border/40">
                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Memory Constraints</p>
                   <ul className="space-y-1">
                      <li className="text-[10px] font-medium text-foreground/60 flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-primary" />
                        Time Complexity: O(n) preferred
                      </li>
                      <li className="text-[10px] font-medium text-foreground/60 flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-primary" />
                        Auxiliary Space: O(n) max
                      </li>
                   </ul>
                </div>
               </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
               <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
               <p className="text-[10px] font-bold text-amber-600/80 leading-relaxed uppercase tracking-tight">Warning: Switching windows or opening browser dev tools will result in an immediate session termination and penalty.</p>
            </div>
          </motion.div>

          {/* Neural Code Canvas */}
          <motion.div variants={item} className="lg:col-span-7 space-y-4">
            <div className="glass-card flex flex-col bg-card border-border/60 shadow-premium overflow-hidden h-[600px] rounded-3xl">
              <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-px bg-primary/40 mr-1" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-widest opacity-70">Neural Workspace</span>
                </div>
                <select className="rounded-xl bg-background px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground border border-border shadow-soft outline-none hover:border-primary/40 transition-all">
                  <option>Python 3.10</option>
                  <option>JavaScript (Node v18)</option>
                  <option>C++ (G++ 11)</option>
                </select>
              </div>
              <div className="flex-1 bg-background p-6 font-mono text-xs text-foreground/70 leading-relaxed relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                   <Terminal className="h-64 w-64" />
                </div>
                <div className="relative z-10">
                  <span className="text-primary font-bold">def</span> twoSum(self, nums, target):<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-muted-foreground/30 italic"># Initialize candidate validation matrix</span><br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-primary/60">pass</span>
                </div>
              </div>
              <div className="p-4 bg-muted/10 flex items-center gap-3">
                <Button className="rounded-2xl bg-primary h-12 px-8 font-bold text-xs tracking-widest shadow-glow hover:shadow-primary/40 active:scale-95 transition-all flex-1">
                  COMMIT SOLUTION
                </Button>
                <Button variant="outline" className="rounded-2xl h-12 px-8 border-border bg-background font-bold text-xs tracking-widest hover:border-primary/40 transition-all shadow-soft active:scale-95">
                  DRY RUN
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex justify-center pt-4">
           <button onClick={() => setStarted(false)} className="px-6 py-2 rounded-xl text-[10px] font-bold text-muted-foreground hover:text-rose-500 uppercase tracking-widest transition-all border border-transparent hover:border-rose-500/20 hover:bg-rose-500/5">
            Abort Assessment
          </button>
        </div>
      </motion.div>
    );
  }

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
            onClick={() => setStarted(true)}
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
