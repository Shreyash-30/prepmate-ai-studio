import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Clock, Lock, Play, BarChart3, Brain, MessageSquare, Shield } from 'lucide-react';

const pastInterviews = [
  { id: '1', date: 'Feb 12, 2026', coding: 78, reasoning: 72, communication: 80, pressure: 65 },
  { id: '2', date: 'Feb 8, 2026', coding: 65, reasoning: 60, communication: 70, pressure: 55 },
  { id: '3', date: 'Feb 3, 2026', coding: 58, reasoning: 55, communication: 65, pressure: 50 },
];

export default function MockInterview() {
  const [started, setStarted] = useState(false);

  if (started) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Mock Interview</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-1.5 text-destructive">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-mono font-bold">19:42</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              <span className="text-xs">Hints Disabled</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Problem */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Question 1 of 2</h3>
              <span className="rounded bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">Medium</span>
            </div>
            <h2 className="text-base font-bold text-foreground">Two Sum</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.
              You may assume that each input would have exactly one solution, and you may not use the same element twice.
            </p>
            <div className="rounded-md bg-accent/50 p-3">
              <p className="text-xs text-muted-foreground font-mono">Input: nums = [2,7,11,15], target = 9</p>
              <p className="text-xs text-muted-foreground font-mono">Output: [0,1]</p>
            </div>
          </div>

          {/* Editor placeholder */}
          <div className="glass-card p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">Code Editor</span>
              <select className="rounded bg-accent px-2 py-1 text-xs text-foreground border-none">
                <option>Python</option>
                <option>JavaScript</option>
                <option>C++</option>
              </select>
            </div>
            <div className="flex-1 rounded-md bg-background border border-border p-4 font-mono text-sm text-muted-foreground min-h-[200px]">
              <span className="text-primary">def</span> twoSum(self, nums, target):<br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-muted-foreground/50"># Write your solution here</span><br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-primary">pass</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                Submit
              </button>
              <button className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors">
                Run
              </button>
            </div>
          </div>
        </div>

        <button onClick={() => setStarted(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← End Interview
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mock Interview</h1>
        <p className="text-sm text-muted-foreground">Simulate real interview conditions</p>
      </div>

      {/* Start card */}
      <motion.div whileHover={{ y: -2 }} className="glass-card p-8 text-center max-w-lg mx-auto">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 animate-pulse-glow">
          <Mic className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mt-5 text-lg font-bold text-foreground">Start a Mock Interview</h2>
        <p className="mt-2 text-sm text-muted-foreground">2 LeetCode-mapped questions • 20 min timer • No hints</p>
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> 20 min</span>
          <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Hints off</span>
          <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Tab detection</span>
        </div>
        <button
          onClick={() => setStarted(true)}
          className="mt-6 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
        >
          <Play className="h-4 w-4" /> Begin Interview
        </button>
      </motion.div>

      {/* Past interviews */}
      <h3 className="text-sm font-semibold text-foreground">Past Interviews</h3>
      <div className="space-y-3">
        {pastInterviews.map((interview) => (
          <div key={interview.id} className="glass-card p-4 flex items-center justify-between">
            <span className="text-sm text-foreground">{interview.date}</span>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3 text-primary" /> {interview.coding}%</span>
              <span className="flex items-center gap-1"><Brain className="h-3 w-3 text-warning" /> {interview.reasoning}%</span>
              <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3 text-success" /> {interview.communication}%</span>
            </div>
            <button className="text-xs text-primary hover:underline">View Report</button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
