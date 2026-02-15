import { motion } from 'framer-motion';
import { RotateCcw, Clock, AlertTriangle, CheckCircle2, BookOpen, ChevronRight } from 'lucide-react';

const revisionTopics = [
  { topic: 'Dynamic Programming', retention: 35, lastPracticed: '3 days ago', priority: 'High', weakSkills: ['Memoization', 'State transitions'] },
  { topic: 'Graph Traversal', retention: 50, lastPracticed: '5 days ago', priority: 'High', weakSkills: ['BFS', 'Topological Sort'] },
  { topic: 'Binary Search', retention: 60, lastPracticed: '2 days ago', priority: 'Medium', weakSkills: ['Search on answer'] },
  { topic: 'Trees & BST', retention: 65, lastPracticed: '4 days ago', priority: 'Medium', weakSkills: ['Balancing'] },
  { topic: 'Sliding Window', retention: 72, lastPracticed: '1 day ago', priority: 'Low', weakSkills: [] },
  { topic: 'Stacks & Queues', retention: 80, lastPracticed: '6 days ago', priority: 'Low', weakSkills: [] },
];

export default function Revision() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Revision</h1>
        <p className="text-sm text-muted-foreground">Strengthen your retention on previously studied topics</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass-card p-5 text-center">
          <RotateCcw className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-2 text-2xl font-bold text-foreground">12</p>
          <p className="text-xs text-muted-foreground">Topics to Revise</p>
        </div>
        <div className="glass-card p-5 text-center">
          <Clock className="mx-auto h-5 w-5 text-warning" />
          <p className="mt-2 text-2xl font-bold text-foreground">4</p>
          <p className="text-xs text-muted-foreground">Due Today</p>
        </div>
        <div className="glass-card p-5 text-center">
          <CheckCircle2 className="mx-auto h-5 w-5 text-success" />
          <p className="mt-2 text-2xl font-bold text-foreground">87%</p>
          <p className="text-xs text-muted-foreground">Completion Rate</p>
        </div>
      </div>

      <div className="space-y-3">
        {revisionTopics.map((t) => (
          <motion.div key={t.topic} whileHover={{ y: -1 }} className="glass-card p-4 flex items-center justify-between group cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <div className="relative h-12 w-12">
                  <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-muted" strokeWidth="3" />
                    <circle cx="18" cy="18" r="16" fill="none"
                      className={`${t.retention >= 70 ? 'stroke-success' : t.retention >= 50 ? 'stroke-warning' : 'stroke-destructive'}`}
                      strokeWidth="3" strokeDasharray={`${t.retention} ${100 - t.retention}`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">{t.retention}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{t.topic}</p>
                <p className="text-xs text-muted-foreground">Last practiced {t.lastPracticed}</p>
                {t.weakSkills.length > 0 && (
                  <div className="mt-1 flex gap-1.5">
                    {t.weakSkills.map((s) => (
                      <span key={s} className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                t.priority === 'High' ? 'bg-destructive/10 text-destructive' :
                t.priority === 'Medium' ? 'bg-warning/10 text-warning' :
                'bg-muted text-muted-foreground'
              }`}>{t.priority}</span>
              <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                Revise Now
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
