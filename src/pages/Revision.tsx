import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Clock, AlertTriangle, CheckCircle2, BookOpen, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

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
    } catch (err) {
      console.error('Failed to start revision', err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading revision schedule...</div>;
  }

  const dueTodayCount = topics.filter(t => t.urgencyLevel === 'high' || t.urgencyLevel === 'critical').length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Revision</h1>
        <p className="text-sm text-muted-foreground">Strengthen your retention on previously studied topics</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass-card p-5 text-center">
          <RotateCcw className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-2 text-2xl font-bold text-foreground">{topics.length}</p>
          <p className="text-xs text-muted-foreground">Topics to Revise</p>
        </div>
        <div className="glass-card p-5 text-center">
          <Clock className="mx-auto h-5 w-5 text-warning" />
          <p className="mt-2 text-2xl font-bold text-foreground">{dueTodayCount}</p>
          <p className="text-xs text-muted-foreground">Due/Urgent Priority</p>
        </div>
        <div className="glass-card p-5 text-center">
          <CheckCircle2 className="mx-auto h-5 w-5 text-success" />
          <p className="mt-2 text-2xl font-bold text-foreground">--</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
      </div>

      <div className="space-y-3">
        {topics.map((t) => {
          const retPct = Math.round(t.retentionProbability * 100);
          const isHighPriority = t.urgencyLevel === 'critical' || t.urgencyLevel === 'high';
          return (
            <motion.div key={t.topicId} whileHover={{ y: -1 }} className="glass-card p-4 flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <div className="relative h-12 w-12">
                    <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="none" className="stroke-muted" strokeWidth="3" />
                      <circle cx="18" cy="18" r="16" fill="none"
                        className={`${retPct >= 70 ? 'stroke-success' : retPct >= 50 ? 'stroke-warning' : 'stroke-destructive'}`}
                        strokeWidth="3" strokeDasharray={`${retPct} ${100 - retPct}`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">{retPct}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground capitalize">{t.topicId.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">{t.reasonForRecommendation}</p>
                  <div className="mt-1 flex gap-1.5 opacity-80">
                    <span className="text-[10px]">Mastery: {Math.round(t.masteryProbability * 100)}%</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isHighPriority ? 'bg-destructive/10 text-destructive' :
                  t.urgencyLevel === 'medium' ? 'bg-warning/10 text-warning' :
                  'bg-muted text-muted-foreground'
                }`}>{t.urgencyLevel}</span>
                <button 
                  onClick={() => handleStartRevision(t.topicId)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  Revise Now
                </button>
              </div>
            </motion.div>
          );
        })}
        {topics.length === 0 && (
          <div className="text-center p-8 text-muted-foreground">You are all caught up! No active revision schedules.</div>
        )}
      </div>
    </motion.div>
  );
}
