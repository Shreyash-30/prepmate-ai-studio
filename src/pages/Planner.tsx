import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, CheckCircle2, Circle, Code2, RotateCcw, Mic } from 'lucide-react';

const tasks = [
  { id: '1', label: 'Solve 2 DP problems (Medium)', type: 'practice' as const, done: false },
  { id: '2', label: 'Revise Binary Search notes', type: 'revision' as const, done: true },
  { id: '3', label: 'Complete Graph Traversal set', type: 'practice' as const, done: false },
  { id: '4', label: 'Review Sliding Window weak skills', type: 'revision' as const, done: false },
  { id: '5', label: 'Mock Interview — 20 min session', type: 'interview' as const, done: false },
  { id: '6', label: 'Solve 1 Hard Tree problem', type: 'practice' as const, done: false },
  { id: '7', label: 'Revise Stack/Queue patterns', type: 'revision' as const, done: true },
];

const typeConfig = {
  practice: { icon: Code2, color: 'text-primary', bg: 'bg-primary/10' },
  revision: { icon: RotateCcw, color: 'text-warning', bg: 'bg-warning/10' },
  interview: { icon: Mic, color: 'text-chart-4', bg: 'bg-chart-4/10' },
};

export default function Planner() {
  const [taskList, setTaskList] = useState(tasks);

  const toggle = (id: string) => {
    setTaskList((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const completed = taskList.filter((t) => t.done).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Planner</h1>
        <p className="text-sm text-muted-foreground">Today's recommended tasks</p>
      </div>

      {/* Progress */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">Daily Progress</span>
          <span className="text-sm font-bold text-primary">{completed}/{taskList.length}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(completed / taskList.length) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="h-full rounded-full bg-primary"
          />
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-2">
        {taskList.map((task) => {
          const cfg = typeConfig[task.type];
          return (
            <motion.div
              key={task.id}
              whileHover={{ x: 2 }}
              onClick={() => toggle(task.id)}
              className="glass-card p-4 flex items-center gap-4 cursor-pointer group"
            >
              <div className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${task.done ? 'border-success bg-success/10' : 'border-border group-hover:border-primary'}`}>
                {task.done && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
              </div>
              <div className={`flex h-7 w-7 items-center justify-center rounded ${cfg.bg}`}>
                <cfg.icon className={`h-3.5 w-3.5 ${cfg.color}`} />
              </div>
              <span className={`text-sm flex-1 ${task.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {task.label}
              </span>
              <span className={`text-[10px] font-medium uppercase ${cfg.color}`}>{task.type}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
