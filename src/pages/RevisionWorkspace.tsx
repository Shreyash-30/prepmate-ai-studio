import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, Check, BookOpen } from 'lucide-react';
import api from '../services/api';

export default function RevisionWorkspace() {
  const { topicId, sessionId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [completing, setCompleting] = useState(false);

  // Hardcode state for demo - real impl would use PracticeProblem IDE component
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      // In a real flow, we'd fetch the session details to know the problems.
      // For this implementation, we will fetch the summary and wait for user to 'solve' fake questions.
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
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [topicId, sessionId]);

  const handleSubmit = async () => {
    setCompleting(true);
    try {
      // Fake solve results for demo
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
    return <div className="p-8 text-center">Loading Workspace...</div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground capitalize">{topicId?.replace(/_/g, ' ')} Revision</h1>
          <p className="text-sm text-muted-foreground">Session ID: {sessionId}</p>
        </div>
        <button 
          onClick={handleSubmit} 
          disabled={completing}
          className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90">
          {completing ? 'Submitting...' : 'Complete Revision'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Recap */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card p-5 border-l-4 border-l-primary">
            <h3 className="font-semibold text-lg mb-2">Topic Recap</h3>
            <p className="text-sm text-muted-foreground">{summary?.summary || 'No summary available.'}</p>
          </div>
          
          <div className="glass-card p-5">
            <h3 className="font-semibold text-sm mb-3">Memory Checklist</h3>
            <ul className="space-y-2">
              {summary?.memoryChecklist?.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-success mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
              {!summary?.memoryChecklist && <li className="text-sm text-muted-foreground">Loading...</li>}
            </ul>
          </div>
          
          <div className="glass-card p-5 border-l-4 border-l-warning">
            <h3 className="font-semibold text-sm mb-3 text-warning">Pitfalls & Warnings</h3>
            <ul className="space-y-2">
              {[...(summary?.commonPitfalls || []), ...(summary?.edgeCaseWarnings || [])].map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-warning flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Col: Problems */}
        <div className="lg:col-span-2 space-y-4">
           {/* Mock problem view */}
           <div className="glass-card flex flex-col h-[600px]">
              <div className="border-b border-border p-4 bg-muted/20">
                 <h2 className="font-semibold">Revision Problem Set</h2>
                 <p className="text-xs text-muted-foreground mt-1">Solve the reinforcement and validation problems.</p>
              </div>
              <div className="flex-1 p-8 flex items-center justify-center text-muted-foreground flex-col">
                 <BookOpen className="h-12 w-12 opacity-50 mb-4" />
                 <p>IDE Component integration bypassed for demo.</p>
                 <p className="text-sm mt-2 opacity-70">Click 'Complete Revision' to simulate submitting results.</p>
              </div>
           </div>
        </div>

      </div>

    </motion.div>
  );
}
