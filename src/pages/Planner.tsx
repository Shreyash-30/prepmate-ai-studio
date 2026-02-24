import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarCheck, CheckCircle2, Circle, Code2, RotateCcw, Mic, Sparkles, Target, Zap, Layout, ChevronRight, ListTodo } from 'lucide-react';
import { PageTitle, SectionTitle, CardTitle, BodyText, MutedText } from '@/components/ui/Typography';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const tasks = [
  { id: '1', label: 'Solve 2 DP problems (Medium)', type: 'practice' as const, done: false, priority: 'High' },
  { id: '2', label: 'Revise Binary Search notes', type: 'revision' as const, done: true, priority: 'Normal' },
  { id: '3', label: 'Complete Graph Traversal set', type: 'practice' as const, done: false, priority: 'High' },
  { id: '4', label: 'Review Sliding Window weak skills', type: 'revision' as const, done: false, priority: 'Critical' },
  { id: '5', label: 'Mock Interview — 20 min session', type: 'interview' as const, done: false, priority: 'High' },
  { id: '6', label: 'Solve 1 Hard Tree problem', type: 'practice' as const, done: false, priority: 'Normal' },
  { id: '7', label: 'Revise Stack/Queue patterns', type: 'revision' as const, done: true, priority: 'Normal' },
];

const typeConfig = {
  practice: { icon: Code2, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  revision: { icon: RotateCcw, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  interview: { icon: Mic, color: 'text-rose-500', bg: 'bg-rose-500/10' },
};

export default function Planner() {
  const [taskList, setTaskList] = useState(tasks);

  const toggle = (id: string) => {
    setTaskList((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const completed = taskList.filter((t) => t.done).length;
  const progress = (completed / taskList.length) * 100;

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div variants={item}>
          <PageTitle>Active Objectives</PageTitle>
          <BodyText className="mt-1">Strategically sequenced tasks to optimize your mastery trajectory.</BodyText>
        </motion.div>
        <motion.div variants={item} className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
          <CalendarCheck className="h-3.5 w-3.5 text-primary" />
          DAY 14 OF 30 • ELITE TRACK
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Progress & Stats Sidebar */}
        <motion.div variants={item} className="lg:col-span-4 space-y-6">
          <div className="glass-card p-6 bg-card border-border/60 shadow-premium relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform">
              <Target className="h-24 w-24" />
            </div>
            <div className="flex items-center justify-between mb-4">
               <CardTitle className="text-sm uppercase tracking-widest opacity-70">Daily Sync</CardTitle>
               <span className="text-xl font-bold text-primary">{completed}/{taskList.length}</span>
            </div>
            <div className="space-y-4">
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden border border-border/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full bg-primary shadow-glow"
                />
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase text-center tracking-widest">
                {progress === 100 ? "OBJECTIVES SECURED" : `${Math.round(progress)}% TACTICAL PROGRESS`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[
              { label: 'Weekly Streak', value: '12 Days', icon: Zap, color: 'text-amber-500' },
              { label: 'Total XP', value: '14,200', icon: Sparkles, color: 'text-indigo-500' },
              { label: 'Accuracy', value: '92%', icon: Target, color: 'text-emerald-500' }
            ].map((stat, i) => (
              <div key={i} className="glass-card p-4 flex items-center gap-4 bg-muted/20 border border-border/40 shadow-soft">
                 <div className={cn("p-2 rounded-xl bg-card border border-border/50", stat.color)}>
                    <stat.icon className="h-4 w-4" />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{stat.label}</p>
                    <p className="text-sm font-bold text-foreground">{stat.value}</p>
                 </div>
              </div>
            ))}
          </div>

          <div className="p-6 rounded-2xl bg-primary/[0.02] border border-primary/10">
             <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-2">AI Insights</h4>
             <p className="text-xs leading-relaxed text-foreground/70 font-medium">According to your performance telemetry, completing <span className="text-foreground font-bold">"Review Sliding Window"</span> today will prevent a theoretical 15% retention drop.</p>
          </div>
        </motion.div>

        {/* Task Engine */}
        <motion.div variants={item} className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-2 mb-2">
            <SectionTitle className="text-lg">Mission Log</SectionTitle>
            <MutedText className="text-[10px] uppercase font-bold tracking-widest">Strategic Priority View</MutedText>
          </div>
          
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {taskList.map((task) => {
                const cfg = typeConfig[task.type];
                return (
                  <motion.div
                    key={task.id}
                    layout
                    whileHover={{ x: 4 }}
                    onClick={() => toggle(task.id)}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border bg-card p-5 cursor-pointer shadow-soft transition-all duration-300",
                      task.done ? "border-border/40 opacity-60 bg-muted/10" : "border-border/60 hover:border-primary/20 hover:shadow-premium"
                    )}
                  >
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all",
                        task.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border group-hover:border-primary group-hover:bg-primary/5"
                      )}>
                        {task.done && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </div>
                      
                      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all shadow-inner", cfg.bg, cfg.color)}>
                        <cfg.icon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1">
                        <span className={cn(
                          "text-sm font-bold tracking-tight transition-all",
                          task.done ? "text-muted-foreground line-through decoration-emerald-500/50" : "text-foreground group-hover:text-primary"
                        )}>
                          {task.label}
                        </span>
                        {!task.done && (
                          <div className="mt-1.5 flex items-center gap-3">
                            <span className={cn(
                              "text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md",
                              task.priority === 'Critical' ? 'bg-rose-500/10 text-rose-500' :
                              task.priority === 'High' ? 'bg-amber-500/10 text-amber-500' :
                              'bg-muted text-muted-foreground'
                            )}>
                              {task.priority} Priority
                            </span>
                            <div className="h-1 w-1 rounded-full bg-border" />
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">{task.type} sector</span>
                          </div>
                        )}
                      </div>

                      <ChevronRight className={cn(
                        "h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-1",
                        task.done && "hidden"
                      )} />
                      {task.done && (
                        <div className="flex items-center gap-1.5 text-emerald-500">
                           <span className="text-[9px] font-bold uppercase tracking-widest">Completed</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          
          <div className="pt-6">
             <Button variant="ghost" className="w-full h-14 border-2 border-dashed border-border rounded-2xl text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground hover:bg-muted/30 hover:text-foreground hover:border-border transition-all">
               <ListTodo className="h-4 w-4 mr-2" /> Add custom tactical sub-objective
             </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
