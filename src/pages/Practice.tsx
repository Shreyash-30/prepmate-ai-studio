import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, BookOpen, Brain, Code2, Database, Cpu, Network, ChevronRight, Zap, Target, Loader, Sparkles, Layout, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { authService } from '@/services/api';
import { useAllRecommendations } from '@/hooks/useTopicRecommendations';
import { useProgressionStatus } from '@/hooks/useProgressionStatus';
import { useQuestionSelection, useGeneratePersonalizedQuestions } from '@/hooks/useQuestionSelection';
import { useQuestionGenerationFlow } from '@/hooks/useQuestionGenerationFlow';
import { QuestionCard } from '@/components/QuestionCard';
import { PageTitle, SectionTitle, CardTitle, BodyText, MutedText } from '@/components/ui/Typography';
import { cn } from '@/lib/utils';

const subjectCategories = [
  { id: 'dsa', name: 'Data Structures & Algorithms', icon: Code2, color: 'bg-indigo-500/10 text-indigo-500', glow: 'shadow-indigo-500/10' },
  { id: 'os', name: 'Operating Systems', icon: Cpu, color: 'bg-emerald-500/10 text-emerald-500', glow: 'shadow-emerald-500/10' },
  { id: 'dbms', name: 'Database Management', icon: Database, color: 'bg-amber-500/10 text-amber-500', glow: 'shadow-amber-500/10' },
  { id: 'networks', name: 'Computer Networks', icon: Network, color: 'bg-cyan-500/10 text-cyan-500', glow: 'shadow-cyan-500/10' },
  { id: 'system-design', name: 'System Design', icon: Brain, color: 'bg-rose-500/10 text-rose-500', glow: 'shadow-rose-500/10' },
];

type View = 'subjects' | 'topics' | 'topic-detail';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as any } },
};

export default function Practice() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('subjects');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [useLLMQuestions, setUseLLMQuestions] = useState(false);

  const { data: recommendations, loading: recommendationsLoading, error: recommendationsError } = useAllRecommendations();
  const { progression: selectedProgression, recommendation: nextAction } = useProgressionStatus(selectedTopicId);
  const { questions: nextProblems, loading: questionsLoading } = useQuestionSelection(selectedTopicId, { limit: 15 });
  const { generateQuestions, questions: llmQuestions, loading: llmLoading, error: llmError } = useGeneratePersonalizedQuestions();
  const [userProfile, setUserProfile] = useState<any>(null);

  useQuestionGenerationFlow(selectedTopicId, useLLMQuestions, llmQuestions || [], llmLoading, llmError);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await authService.getProfile();
        setUserProfile(response.data.user);
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    };
    fetchUser();
  }, []);

  const getSubjectStats = (subjectId: string) => {
    const isLCConnected = userProfile?.platformProfiles?.leetcode?.connected;
    const lcSolved = userProfile?.platformProfiles?.leetcode?.totalSolved || 0;

    if (!recommendations || recommendations.length === 0) {
      if (subjectId === 'dsa' && isLCConnected) {
        const estimatedProficiency = Math.min(95, Math.max(5, Math.round((lcSolved / 500) * 100)));
        return { modules: 0, completion: estimatedProficiency, totalSolved: lcSolved, totalQuestions: 0 };
      }
      return { modules: 0, completion: 0, totalSolved: 0, totalQuestions: 0 };
    }
    
    const relevantRecs = recommendations.filter(r => (r.topic?.category || 'dsa') === subjectId);
    const modules = relevantRecs.length;
    
    // Calculate total solved from topics
    let totalSolved = relevantRecs.reduce((sum, r) => sum + (r.successfulAttempts || 0), 0);
    
    // Prioritize LeetCode profile count for DSA
    if (subjectId === 'dsa' && isLCConnected) {
      totalSolved = Math.max(totalSolved, lcSolved);
    }
    
    // Calculate Proficiency
    let avgMastery = modules > 0 
      ? Math.round(relevantRecs.reduce((sum, r) => sum + (r.masteryScore || 0), 0) / modules * 100) 
      : 0;

    // Fallback if AI mastery is 0 but we have solved problems
    if (avgMastery === 0 && (totalSolved > 0)) {
      avgMastery = Math.min(95, Math.max(5, Math.round((totalSolved / 500) * 100))); 
    }
    
    const totalQuestions = relevantRecs.reduce((sum, r) => sum + (r.topic?.questionCount || 0), 0);
    
    return { modules, completion: avgMastery, totalSolved, totalQuestions };
  };

  useEffect(() => {
    if (selectedTopicId && view === 'topic-detail') {
      setUseLLMQuestions(true);
      generateQuestions(selectedTopicId, { limit: 5 }).catch(err => {
        console.error('Error generating LLM questions:', err);
        setUseLLMQuestions(false);
      });
    }
  }, [selectedTopicId, view]);

  const stats = (recommendations && recommendations.length > 0) ? {
    totalTopics: recommendations.length,
    mastered: recommendations.filter(r => (r.masteryScore || 0) >= 0.8).length,
    practicing: recommendations.filter(r => 0.4 <= (r.masteryScore || 0) && (r.masteryScore || 0) < 0.8).length,
    needHelp: recommendations.filter(r => (r.masteryScore || 0) < 0.4).length,
  } : { totalTopics: 0, mastered: 0, practicing: 0, needHelp: 0 };

  if (recommendationsError && !recommendations) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 max-w-md text-center">
          <p className="font-bold mb-1">Retrieval Error</p>
          <p className="text-sm opacity-80">{recommendationsError}</p>
        </div>
        <button onClick={() => window.location.reload()} className="text-sm font-bold text-primary hover:underline transition-all">
          Retry Sync
        </button>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
        <button onClick={() => setView('subjects')} className="hover:text-primary transition-colors">Curriculum</button>
        {view !== 'subjects' && (
          <>
            <ChevronRight className="h-3 w-3 opacity-30" />
            <button onClick={() => setView('topics')} className="hover:text-primary transition-colors">Topics</button>
          </>
        )}
        {view === 'topic-detail' && (
          <>
            <ChevronRight className="h-3 w-3 opacity-30" />
            <span className="text-foreground">{selectedProgression?.topic?.name || 'Loading...'}</span>
          </>
        )}
      </nav>

      {view === 'subjects' && (
        <>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <motion.div variants={item}>
              <PageTitle>Core Curriculum</PageTitle>
              <BodyText className="mt-1">Select a core subject to explore advanced topics and assessments.</BodyText>
            </motion.div>
            <motion.div variants={item} className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI PATHFINDER ENABLED
            </motion.div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {subjectCategories.map((s) => {
              const sStats = getSubjectStats(s.id);
              return (
                <motion.button
                  key={s.id}
                  variants={item}
                  whileHover={{ y: -5 }}
                  onClick={() => setView('topics')}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-left shadow-soft transition-all duration-300 hover:shadow-premium hover:border-primary/20",
                    s.glow
                  )}
                >
                  <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity pointer-events-none", s.color)} />
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl shadow-inner", s.color)}>
                    <s.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">{s.name}</h3>
                  <MutedText className="mt-2 text-xs leading-relaxed">
                    Advanced path including foundational concepts, interview patterns, and practical applications.
                  </MutedText>
                   <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{sStats.totalSolved} Problems</span>
                      <div className="h-1 w-1 rounded-full bg-border" />
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">{sStats.completion}% Proficiency</span>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </>
      )}

      {view === 'topics' && (
        <>
          <div className="flex items-center justify-between gap-4">
            <motion.div variants={item}>
              <PageTitle>Strategic Topics</PageTitle>
              <BodyText className="mt-1">Master individual concepts through adaptive learning paths.</BodyText>
            </motion.div>
            <button onClick={() => setView('subjects')} className="text-xs font-bold text-primary hover:underline"> CURRICULUM OVERVIEW </button>
          </div>
          
          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Strategic Topics', value: stats.totalTopics, color: 'bg-primary/5 text-primary' },
              { label: 'Mastered', value: stats.mastered, color: 'bg-emerald-500/5 text-emerald-500' },
              { label: 'In Progress', value: stats.practicing, color: 'bg-amber-500/5 text-amber-500' },
              { label: 'Risk Areas', value: stats.needHelp, color: 'bg-rose-500/5 text-rose-500' },
            ].map((stat) => (
              <motion.div key={stat.label} variants={item} className={cn("p-4 rounded-2xl border border-border bg-card shadow-soft text-center", stat.color)}>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mt-4">
            {recommendationsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 w-full rounded-2xl bg-muted animate-pulse" />
              ))
            ) : recommendations && recommendations.length > 0 ? (
              recommendations.map((rec) => (
                <motion.button
                  key={rec.topicId}
                  variants={item}
                  whileHover={{ x: 5 }}
                  onClick={() => { setSelectedTopicId(rec.topicId); setView('topic-detail'); }}
                  className="group relative flex items-center justify-between rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition-all hover:border-primary/30 hover:shadow-premium"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      rec.masteryScore >= 0.8 ? 'bg-emerald-500/10 text-emerald-500' :
                      rec.masteryScore >= 0.4 ? 'bg-indigo-500/10 text-indigo-500' :
                      'bg-rose-500/10 text-rose-500'
                    )}>
                      <Layout className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors capitalize">
                        {rec.topic?.name || rec.topicId.replace(/-/g, ' ')}
                      </h4>
                      <div className="mt-1 flex items-center gap-3">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          rec.masteryScore >= 0.8 ? 'text-emerald-500' :
                          rec.masteryScore >= 0.4 ? 'text-indigo-500' :
                          'text-rose-500'
                        )}>
                          {Math.round(rec.masteryScore * 100)}% Proficiency
                        </span>
                        <div className="h-1 w-1 rounded-full bg-border" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{rec.successfulAttempts || (Math.round((rec.attemptCount || 0) / 2)) || 0} Problems</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all" />
                </motion.button>
              ))
            ) : (
              <div className="lg:col-span-2 p-12 text-center rounded-2xl border-2 border-dashed border-border">
                <MutedText>No learning modules identified for this curriculum yet.</MutedText>
              </div>
            )}
          </div>
        </>
      )}

      {view === 'topic-detail' && selectedProgression && (
        <div className="space-y-8">
          <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <button 
                onClick={() => setView('topics')}
                className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest mb-2 flex items-center gap-1"
              >
                ← Back to Modules
              </button>
              <PageTitle className="capitalize">{selectedProgression?.topic?.name || 'Knowledge Module'}</PageTitle>
              <BodyText className="mt-1 max-w-2xl">{selectedProgression?.topic?.description || 'Strategic mastery path for this specific domain.'}</BodyText>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <Brain className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Module Intelligence</p>
                <p className="text-xs font-bold text-foreground">Adaptive Tier 4</p>
              </div>
            </div>
          </motion.div>

          {/* Intelligence Panel */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mt-2">
            {[
              { label: 'Mastery Level', value: `${Math.round((selectedProgression.masteryScore || 0) * 100)}%`, icon: Target, variant: 'emerald' },
              { label: 'Readiness Rank', value: selectedProgression.progressionReadinessScore >= 0.7 ? 'Tier 1' : selectedProgression.progressionReadinessScore >= 0.4 ? 'Tier 2' : 'Tier 3', icon: Zap, variant: 'indigo' },
              { label: 'Complexity', value: selectedProgression.currentDifficultyLevel || 'Standard', icon: Code2, variant: 'amber' },
              { label: 'Solved Problems', value: String(selectedProgression.successfulAttempts || selectedProgression.stats?.successfulAttempts || (Math.round((selectedProgression.attemptCount || 0) / 2)) || 0), icon: Info, variant: 'cyan' },
            ].map((s) => (
              <motion.div key={s.label} variants={item} className="relative overflow-hidden p-6 rounded-2xl border border-border bg-card shadow-soft group hover:shadow-premium transition-all">
                <div className={cn("absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity", 
                  s.variant === 'emerald' ? 'text-emerald-500' : s.variant === 'indigo' ? 'text-indigo-500' : s.variant === 'amber' ? 'text-amber-500' : 'text-cyan-500'
                )}>
                  <s.icon className="h-16 w-16 -mr-4 -mt-4" />
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{s.label}</p>
                <p className={cn("text-2xl font-bold tracking-tight", 
                  s.variant === 'emerald' ? 'text-emerald-500' : s.variant === 'indigo' ? 'text-indigo-500' : s.variant === 'amber' ? 'text-amber-500' : 'text-cyan-500'
                )}>{s.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Recommended Questions */}
          <motion.div variants={item} className="space-y-6">
            <div className="flex items-center justify-between">
              <SectionTitle>Curated Assessments</SectionTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Live Engine</span>
                </div>
              </div>
            </div>
            
            {(llmLoading || questionsLoading) ? (
              <div className="p-12 text-center rounded-2xl border border-border bg-card/50 flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary border-t-transparent shadow-glow" />
                <MutedText className="animate-pulse">Personalizing your path based on telemetry...</MutedText>
              </div>
            ) : (useLLMQuestions && llmQuestions && llmQuestions.length > 0) ? (
              <div className="grid grid-cols-1 gap-6">
                {llmQuestions.map((question, idx) => (
                  <QuestionCard
                    key={idx}
                    problemTitle={question.problemTitle || question.title || 'Advanced assessment'}
                    difficulty={(question.difficulty || 'Medium').charAt(0).toUpperCase() + (question.difficulty || 'Medium').slice(1).toLowerCase() as any}
                    topic={selectedProgression?.topic?.name || question.topic || 'DSA'}
                    whyRecommended={question.whyRecommended || question.reasoning || ''}
                    sourceUrl={question.sourceUrl}
                    platform={question.platform || 'LeetCode'}
                    primaryConceptTested={question.primaryConceptTested || question.concept}
                    hints={question.hints || []}
                    approachGuide={question.approachGuide || ''}
                    isDuplicate={question.isDuplicate || false}
                    learnerLevel={question.learnerLevel}
                    onAILabClick={() => {
                      const problemId = question.problemId || (question.problemTitle || question.title || 'problem')
                        .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
                      navigate(`/ai-lab/${problemId}`, { state: { problem: question } });
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 text-center rounded-2xl border-2 border-dashed border-border">
                <MutedText>No strategic assessments matched your current profile for this module.</MutedText>
              </div>
            )}
          </motion.div>

          {nextAction && (
            <motion.div variants={item} className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.02] p-8">
              <div className="absolute top-0 right-0 p-8 opacity-[0.05] rotate-12">
                <Sparkles className="h-32 w-32" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
                  <Zap className="h-8 w-8 fill-current" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-bold text-foreground">Next Strategic Pivot</h3>
                  <BodyText className="mt-2 text-sm opacity-80">{nextAction.recommendation}</BodyText>
                </div>
                <button className="whitespace-nowrap rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition-all hover:translate-y-[-2px] hover:shadow-primary/40 active:translate-y-0">
                  Execute Strategy
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
