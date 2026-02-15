import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Brain, Code2, Database, Cpu, Network, ChevronRight, Zap, Target } from 'lucide-react';

const subjects = [
  { id: 'dsa', name: 'Data Structures & Algorithms', icon: Code2, topics: 15, solved: 120, color: 'bg-primary/10 text-primary' },
  { id: 'os', name: 'Operating Systems', icon: Cpu, topics: 8, solved: 32, color: 'bg-success/10 text-success' },
  { id: 'dbms', name: 'Database Management', icon: Database, topics: 6, solved: 18, color: 'bg-warning/10 text-warning' },
  { id: 'networks', name: 'Computer Networks', icon: Network, topics: 7, solved: 14, color: 'bg-chart-4/10 text-chart-4' },
  { id: 'system-design', name: 'System Design', icon: Brain, topics: 10, solved: 8, color: 'bg-destructive/10 text-destructive' },
];

const dsaTopics = [
  { id: 'arrays', name: 'Arrays & Hashing', mastery: 85, readiness: 'High', difficulty: 'Medium', questions: 34 },
  { id: 'two-pointers', name: 'Two Pointers', mastery: 72, readiness: 'Medium', difficulty: 'Medium', questions: 18 },
  { id: 'sliding-window', name: 'Sliding Window', mastery: 60, readiness: 'Medium', difficulty: 'Hard', questions: 12 },
  { id: 'stacks', name: 'Stacks & Queues', mastery: 82, readiness: 'High', difficulty: 'Easy', questions: 22 },
  { id: 'binary-search', name: 'Binary Search', mastery: 55, readiness: 'Low', difficulty: 'Hard', questions: 20 },
  { id: 'linked-lists', name: 'Linked Lists', mastery: 70, readiness: 'Medium', difficulty: 'Medium', questions: 16 },
  { id: 'trees', name: 'Trees & BST', mastery: 62, readiness: 'Medium', difficulty: 'Hard', questions: 28 },
  { id: 'graphs', name: 'Graphs', mastery: 40, readiness: 'Low', difficulty: 'Hard', questions: 24 },
  { id: 'dp', name: 'Dynamic Programming', mastery: 35, readiness: 'Low', difficulty: 'Hard', questions: 30 },
  { id: 'greedy', name: 'Greedy Algorithms', mastery: 68, readiness: 'Medium', difficulty: 'Medium', questions: 14 },
];

type View = 'subjects' | 'topics' | 'topic-detail';

function getMasteryColor(level: number) {
  if (level >= 80) return 'text-success';
  if (level >= 60) return 'text-primary';
  if (level >= 40) return 'text-warning';
  return 'text-destructive';
}

export default function Practice() {
  const [view, setView] = useState<View>('subjects');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<typeof dsaTopics[0] | null>(null);

  const goToTopics = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setView('topics');
  };

  const goToDetail = (topic: typeof dsaTopics[0]) => {
    setSelectedTopic(topic);
    setView('topic-detail');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => setView('subjects')} className="hover:text-foreground transition-colors">Practice</button>
        {view !== 'subjects' && (
          <>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => setView('topics')} className="hover:text-foreground transition-colors capitalize">{selectedSubject}</button>
          </>
        )}
        {view === 'topic-detail' && selectedTopic && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{selectedTopic.name}</span>
          </>
        )}
      </div>

      {view === 'subjects' && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Practice</h1>
            <p className="text-sm text-muted-foreground">Choose a subject to start practicing</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((s) => (
              <motion.button
                key={s.id}
                whileHover={{ y: -2 }}
                onClick={() => goToTopics(s.id)}
                className="glass-card p-5 text-left group"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">{s.name}</h3>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{s.topics} topics</span>
                  <span>{s.solved} solved</span>
                </div>
                <ArrowRight className="mt-3 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </motion.button>
            ))}
          </div>
        </>
      )}

      {view === 'topics' && (
        <>
          <h1 className="text-2xl font-bold text-foreground capitalize">{selectedSubject} — Topics</h1>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {dsaTopics.map((t) => (
              <motion.button
                key={t.id}
                whileHover={{ y: -1 }}
                onClick={() => goToDetail(t)}
                className="glass-card p-4 text-left flex items-center justify-between group"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className={`font-medium ${getMasteryColor(t.mastery)}`}>{t.mastery}% mastery</span>
                    <span>{t.questions} questions</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    t.readiness === 'High' ? 'bg-success/10 text-success' :
                    t.readiness === 'Medium' ? 'bg-warning/10 text-warning' :
                    'bg-destructive/10 text-destructive'
                  }`}>
                    {t.readiness}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </motion.button>
            ))}
          </div>
        </>
      )}

      {view === 'topic-detail' && selectedTopic && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-foreground">{selectedTopic.name}</h1>

          {/* Intelligence Panel */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Mastery', value: `${selectedTopic.mastery}%`, icon: Target, color: getMasteryColor(selectedTopic.mastery) },
              { label: 'Readiness', value: selectedTopic.readiness, icon: Zap, color: 'text-primary' },
              { label: 'Rec. Difficulty', value: selectedTopic.difficulty, icon: Brain, color: 'text-warning' },
              { label: 'Questions', value: String(selectedTopic.questions), icon: BookOpen, color: 'text-muted-foreground' },
            ].map((s) => (
              <div key={s.label} className="glass-card p-4">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <p className={`mt-2 text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Recommended Questions */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Recommended Questions</h3>
            <div className="space-y-2">
              {['Easy', 'Medium', 'Hard'].map((diff) => (
                <div key={diff} className="flex items-center justify-between rounded-md bg-accent/50 p-3">
                  <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full ${diff === 'Easy' ? 'bg-success' : diff === 'Medium' ? 'bg-warning' : 'bg-destructive'}`} />
                    <span className="text-sm text-foreground">{diff} — 5 questions</span>
                  </div>
                  <button className="text-xs font-medium text-primary hover:underline">Start →</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              Open AI Practice Lab
            </button>
            <button className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors">
              Solve Externally
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
