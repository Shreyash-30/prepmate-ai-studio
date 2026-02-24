import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Zap, ChevronDown, AlertCircle, Lightbulb, Target, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { CardTitle, BodyText, MutedText } from './ui/Typography';

interface QuestionCardProps {
  problemTitle: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
  whyRecommended: string;
  sourceUrl?: string;
  platform?: string;
  primaryConceptTested?: string;
  hints?: string[];
  approachGuide?: string;
  isDuplicate?: boolean;
  learnerLevel?: string;
  onAILabClick?: () => void;
}

const getDifficultyStyles = (difficulty: string) => {
  switch (difficulty?.toLowerCase()) {
    case 'easy':
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-600',
        border: 'border-emerald-500/20',
        badge: 'bg-emerald-500 text-white hover:bg-emerald-600',
      };
    case 'medium':
      return {
        bg: 'bg-amber-500/10',
        text: 'text-amber-600',
        border: 'border-amber-500/20',
        badge: 'bg-amber-500 text-white hover:bg-amber-600',
      };
    case 'hard':
      return {
        bg: 'bg-rose-500/10',
        text: 'text-rose-600',
        border: 'border-rose-500/20',
        badge: 'bg-rose-500 text-white hover:bg-rose-600',
      };
    default:
      return {
        bg: 'bg-gray-500/10',
        text: 'text-gray-600',
        border: 'border-gray-500/20',
        badge: 'bg-gray-500 text-white hover:bg-gray-600',
      };
  }
};

export const QuestionCard: React.FC<QuestionCardProps> = ({
  problemTitle,
  difficulty,
  topic,
  whyRecommended,
  sourceUrl,
  platform = 'LeetCode',
  primaryConceptTested,
  hints = [],
  approachGuide = '',
  isDuplicate = false,
  learnerLevel,
  onAILabClick,
}) => {
  const [showHints, setShowHints] = useState(false);
  const [showApproach, setShowApproach] = useState(false);
  const styles = getDifficultyStyles(difficulty);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group relative rounded-2xl border-2 bg-card p-6 transition-all duration-300 hover:shadow-premium hover:-translate-y-1",
        styles.border
      )}
    >
      {/* Dynamic Background Glow */}
      <div className={cn("absolute inset-0 opacity-[0.03] transition-opacity group-hover:opacity-[0.07] pointer-events-none rounded-2xl", styles.bg)} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold py-0 h-5 border-border/50 bg-muted/30">
                {topic}
              </Badge>
              {isDuplicate && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <AlertCircle className="w-3 h-3" />
                  RECENT
                </div>
              )}
            </div>
            <CardTitle className="text-base md:text-lg leading-tight group-hover:text-primary transition-colors">
              {problemTitle}
            </CardTitle>
            {primaryConceptTested && (
              <MutedText className="text-[11px] mt-1 font-semibold uppercase tracking-tight opacity-70">
                Main Concept: {primaryConceptTested}
              </MutedText>
            )}
          </div>
          <Badge className={cn("shrink-0 shadow-sm px-3 py-1 text-xs font-bold rounded-lg", styles.badge)}>
            {difficulty}
          </Badge>
        </div>

        {/* Why Recommended */}
        {whyRecommended && (
          <div className="mb-6 rounded-xl bg-muted/40 border border-border/50 p-4 transition-all hover:bg-muted/60">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="text-xs md:text-sm leading-relaxed text-foreground/80">
                <span className="font-bold text-primary">AI Insight: </span>
                {whyRecommended}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-6">
          {/* Hints Section */}
          {hints && hints.length > 0 && (
            <div>
              <button
                onClick={() => setShowHints(!showHints)}
                className="flex w-full items-center justify-between rounded-xl bg-background border border-border/60 p-3 text-sm font-semibold text-foreground/90 transition-all hover:bg-muted/50"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1 rounded bg-amber-500/10 text-amber-600">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <span>Strategic Hints</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{hints.length}</span>
                </div>
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", showHints && "rotate-180")} />
              </button>
              <AnimatePresence>
                {showHints && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-2 p-3 pl-10">
                      {hints.map((hint, idx) => (
                        <div key={idx} className="relative text-xs md:text-sm text-foreground/70 leading-relaxed group/hint">
                          <span className="absolute left-[-24px] top-1 text-[10px] font-bold text-muted-foreground group-hover/hint:text-primary transition-colors">{idx + 1}</span>
                          {hint}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Approach Guide Section */}
          {approachGuide && (
            <div>
              <button
                onClick={() => setShowApproach(!showApproach)}
                className="flex w-full items-center justify-between rounded-xl bg-background border border-border/60 p-3 text-sm font-semibold text-foreground/90 transition-all hover:bg-muted/50"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1 rounded bg-indigo-500/10 text-indigo-600">
                    <Target className="w-4 h-4" />
                  </div>
                  <span>Mastery Approach</span>
                </div>
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", showApproach && "rotate-180")} />
              </button>
              <AnimatePresence>
                {showApproach && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-4 rounded-xl bg-indigo-500/[0.03] border border-indigo-500/10">
                      <p className="text-xs md:text-sm text-foreground/70 whitespace-pre-line leading-relaxed italic">
                        {approachGuide}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/40">
          <div className="flex items-center gap-2">
            {learnerLevel && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/80 border border-border/50">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{learnerLevel} Level</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2.5">
            {sourceUrl && (
              <Button
                size="sm"
                variant="outline"
                asChild
                className="rounded-xl h-9 px-4 border-border/60 hover:bg-muted transition-all active:scale-95"
              >
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="gap-2 flex items-center">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold tracking-tight">{platform}</span>
                </a>
              </Button>
            )}
            
            {onAILabClick && (
              <Button
                size="sm"
                variant="default"
                onClick={onAILabClick}
                className="rounded-xl h-9 px-4 gap-2 shadow-glow hover:shadow-primary/40 transition-all active:scale-95 group/btn"
              >
                <Zap className="w-3.5 h-3.5 fill-current transition-transform group-hover:scale-110 group-hover:rotate-12" />
                <span className="text-xs font-bold tracking-tight">Enter AI Lab</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

