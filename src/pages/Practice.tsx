import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Brain, Code2, Database, Cpu, Network, ChevronRight, Zap, Target, Loader } from 'lucide-react';
import { useAllRecommendations } from '@/hooks/useTopicRecommendations';
import { useProgressionStatus, useProgressionReport } from '@/hooks/useProgressionStatus';
import { useQuestionSelection, useGeneratePersonalizedQuestions } from '@/hooks/useQuestionSelection';
import { QuestionCard } from '@/components/QuestionCard';
import { Button } from '@/components/ui/button';

// Static subject categories for display
const subjectCategories = [
  { id: 'dsa', name: 'Data Structures & Algorithms', icon: Code2, color: 'bg-primary/10 text-primary' },
  { id: 'os', name: 'Operating Systems', icon: Cpu, color: 'bg-success/10 text-success' },
  { id: 'dbms', name: 'Database Management', icon: Database, color: 'bg-warning/10 text-warning' },
  { id: 'networks', name: 'Computer Networks', icon: Network, color: 'bg-chart-4/10 text-chart-4' },
  { id: 'system-design', name: 'System Design', icon: Brain, color: 'bg-destructive/10 text-destructive' },
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
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [useLLMQuestions, setUseLLMQuestions] = useState(false);

  // Fetch all recommendations
  const { data: recommendations, loading: recommendationsLoading, error: recommendationsError } = useAllRecommendations();
  
  // Fetch progression for selected topic (hooks handle null topicId internally)
  const { progression: selectedProgression, recommendation: nextAction, loading: progressionLoading } = useProgressionStatus(selectedTopicId);

  // Fetch next problems for selected topic (hooks handle null topicId internally)
  const { questions: nextProblems, loading: questionsLoading } = useQuestionSelection(selectedTopicId, { limit: 15 });

  // Generate personalized LLM-based questions
  const { generateQuestions, questions: llmQuestions, loading: llmLoading, error: llmError } = useGeneratePersonalizedQuestions();

  // Auto-generate LLM questions when topic is selected
  useEffect(() => {
    if (selectedTopicId && view === 'topic-detail') {
      setUseLLMQuestions(true);
      generateQuestions(selectedTopicId, { limit: 5 }).catch(err => {
        console.error('Error generating LLM questions:', err);
        setUseLLMQuestions(false);
      });
    }
  }, [selectedTopicId, view]);

  const handleSelectTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    setView('topic-detail');
  };

  const handleBackToTopics = () => {
    setSelectedTopicId(null);
    setView('topics');
  };

  const handleBackToSubjects = () => {
    setSelectedTopicId(null);
    setView('subjects');
  };

  // Calculate statistics from recommendations data
  const stats = recommendations ? {
    totalTopics: recommendations.length,
    mastered: recommendations.filter(r => r.masteryScore >= 80).length,
    practicing: recommendations.filter(r => 40 <= r.masteryScore && r.masteryScore < 80).length,
    needHelp: recommendations.filter(r => r.masteryScore < 40).length,
  } : { totalTopics: 0, mastered: 0, practicing: 0, needHelp: 0 };

  if (recommendationsError && !recommendations) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="glass-card p-6 text-center">
          <p className="text-destructive">Failed to load recommendations: {recommendationsError}</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-primary hover:underline">
            Retry
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={handleBackToSubjects} className="hover:text-foreground transition-colors">Practice</button>
        {view !== 'subjects' && (
          <>
            <ChevronRight className="h-3 w-3" />
            <button onClick={handleBackToTopics} className="hover:text-foreground transition-colors">Topics</button>
          </>
        )}
        {view === 'topic-detail' && selectedProgression && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{selectedProgression.topic?.name || 'Topic'}</span>
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
            {subjectCategories.map((s) => {
              // Calculate stats for this subject based on recommendations
              const subjectRecommendations = recommendations?.filter(r => {
                // Assuming recommendations have a subject field or we group by category
                return true; // In real app, filter by subject
              }) || [];
              
              return (
                <motion.button
                  key={s.id}
                  whileHover={{ y: -2 }}
                  onClick={() => setView('topics')}
                  className="glass-card p-5 text-left group"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-foreground">{s.name}</h3>
                  {recommendationsLoading ? (
                    <div className="mt-2 text-xs text-muted-foreground">Loading...</div>
                  ) : (
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{subjectRecommendations.length} topics</span>
                      <span>{subjectRecommendations.filter(r => r.masteryScore >= 80).length} solved</span>
                    </div>
                  )}
                  <ArrowRight className="mt-3 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </motion.button>
              );
            })}
          </div>
        </>
      )}

      {view === 'topics' && (
        <>
          <h1 className="text-2xl font-bold text-foreground">Practice Topics</h1>
          
          {/* Statistics */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            {[
              { label: 'Total Topics', value: stats.totalTopics, color: 'text-primary' },
              { label: 'Mastered', value: stats.mastered, color: 'text-success' },
              { label: 'Practicing', value: stats.practicing, color: 'text-warning' },
              { label: 'Need Help', value: stats.needHelp, color: 'text-destructive' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-3 text-center">
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {recommendationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading recommendations...</span>
            </div>
          ) : recommendations && recommendations.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {recommendations?.map((rec) => (
                <motion.button
                  key={rec.topicId}
                  whileHover={{ y: -1 }}
                  onClick={() => handleSelectTopic(rec.topicId)}
                  className="glass-card p-4 text-left flex items-center justify-between group"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {rec.topic?.name || 'Unknown Topic'}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className={`font-medium ${getMasteryColor(rec.masteryScore * 100)}`}>
                        {Math.round(rec.masteryScore * 100)}% mastery
                      </span>
                      <span>{rec.topic?.questionCount || rec.attemptCount || '?'} questions</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      rec.progressionReadinessScore >= 0.7 ? 'bg-success/10 text-success' :
                      rec.progressionReadinessScore >= 0.4 ? 'bg-warning/10 text-warning' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {rec.progressionReadinessScore >= 0.7 ? 'Ready' : rec.progressionReadinessScore >= 0.4 ? 'Practicing' : 'Learning'}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <p className="text-muted-foreground">No topics available yet. Check back later!</p>
            </div>
          )}
        </>
      )}

      {view === 'topic-detail' && selectedProgression && (
        <div className="space-y-6">
          <button 
            onClick={handleBackToTopics}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Topics
          </button>
          
          <h1 className="text-2xl font-bold text-foreground">
            {selectedProgression?.topic?.name || 'Topic'}
          </h1>
          
          {selectedProgression?.topic?.description && (
            <p className="text-sm text-muted-foreground">{selectedProgression.topic.description}</p>
          )}

          {/* Intelligence Panel */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { 
                label: 'Mastery', 
                value: `${Math.round((selectedProgression.masteryScore || 0) * 100)}%`, 
                icon: Target, 
                color: getMasteryColor((selectedProgression.masteryScore || 0) * 100) 
              },
              { 
                label: 'Readiness', 
                value: selectedProgression.progressionReadinessScore >= 0.7 ? 'Ready' : 
                       selectedProgression.progressionReadinessScore >= 0.4 ? 'Practicing' : 'Learning',
                icon: Zap, 
                color: selectedProgression.progressionReadinessScore >= 0.7 ? 'text-success' : 
                       selectedProgression.progressionReadinessScore >= 0.4 ? 'text-warning' : 'text-destructive'
              },
              { 
                label: 'Difficulty', 
                value: selectedProgression.currentDifficultyLevel || 'Easy',
                icon: Brain, 
                color: 'text-warning'
              },
              { 
                label: 'Problems Attempted', 
                value: String(selectedProgression.attemptCount || selectedProgression.progressionStats?.totalAttempts || 0),
                icon: BookOpen, 
                color: 'text-muted-foreground'
              },
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">AI-Personalized Problems</h3>
              {useLLMQuestions && !llmError && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">AI Generated</span>
              )}
            </div>
            
            {llmError && (
              <div className="text-sm p-4 mb-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="font-medium text-destructive mb-2">⚠️ LLM Question Generation Unavailable</p>
                <p className="text-xs text-destructive/80">{llmError}</p>
                <p className="text-xs text-muted-foreground mt-2">Please ensure the AI service is running with GEMINI_API_KEY configured.</p>
              </div>
            )}
            
            {(llmLoading || questionsLoading) ? (
              <div className="flex items-center justify-center py-6">
                <Loader className="h-4 w-4 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">
                  {llmLoading ? 'Generating personalized questions...' : 'Loading problems...'}
                </span>
              </div>
            ) : (useLLMQuestions && llmQuestions.length > 0) ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {llmQuestions.map((question, idx) => (
                  <QuestionCard
                    key={idx}
                    problemTitle={question.problemTitle || question.title || 'Untitled Problem'}
                    difficulty={(question.difficulty || 'Medium').charAt(0).toUpperCase() + (question.difficulty || 'Medium').slice(1).toLowerCase() as 'Easy' | 'Medium' | 'Hard'}
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
                      // Handle AI Lab click - navigate to AI practice for this problem
                      console.log('Open AI Lab for:', question.problemTitle);
                    }}
                  />
                ))}
              </div>
            ) : llmError ? (
              <div className="p-6 text-center bg-destructive/5 rounded-lg border border-destructive/20">
                <p className="text-sm text-destructive font-medium mb-2">❌ LLM Generation Failed</p>
                <p className="text-xs text-muted-foreground">{llmError}</p>
                <p className="text-xs text-muted-foreground mt-3">Please check that the AI service is running with GEMINI_API_KEY configured.</p>
              </div>
            ) : (useLLMQuestions && !llmLoading) ? (
              <div className="p-6 text-center bg-accent/50 rounded-lg">
                <p className="text-sm text-muted-foreground">No AI-personalized questions generated yet</p>
              </div>
            ) : nextProblems.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {nextProblems.map((problem, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-md bg-accent/50 p-3">
                    <div className="flex items-center gap-3 flex-1">
                      <span className={`h-2 w-2 rounded-full ${
                        problem.difficulty?.toLowerCase() === 'easy' ? 'bg-success' : 
                        problem.difficulty?.toLowerCase() === 'medium' ? 'bg-warning' : 
                        'bg-destructive'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{problem.title || problem.titleSlug}</p>
                        <p className="text-xs text-muted-foreground">{problem.difficulty}</p>
                      </div>
                    </div>
                    <a 
                      href={problem.sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Solve →
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No problems loaded yet</p>
            )}
          </div>

          {nextAction && (
            <div className="glass-card p-5 bg-primary/5 border border-primary/20">
              <h3 className="text-sm font-semibold text-foreground mb-2">Recommendation</h3>
              <p className="text-sm text-muted-foreground mb-4">{nextAction.recommendation}</p>
              <div className="flex gap-3">
                {nextAction.recommendation === 'advance' && (
                  <button className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 transition-colors">
                    Advance to {nextAction.nextDifficulty}
                  </button>
                )}
                {nextAction.recommendation === 'review' && (
                  <button className="rounded-lg bg-warning px-4 py-2 text-sm font-medium text-warning-foreground hover:bg-warning/90 transition-colors">
                    Review Current Level
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
