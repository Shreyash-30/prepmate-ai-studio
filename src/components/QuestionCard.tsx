import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Zap, ChevronDown, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

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

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty?.toLowerCase()) {
    case 'easy':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'medium':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'hard':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const getDifficultyBadgeColor = (difficulty: string) => {
  switch (difficulty?.toLowerCase()) {
    case 'easy':
      return 'bg-green-100 text-green-800 hover:bg-green-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
    case 'hard':
      return 'bg-red-100 text-red-800 hover:bg-red-200';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`p-5 rounded-lg border-2 transition-all hover:shadow-lg ${getDifficultyColor(difficulty)}`}
    >
      {/* Header with Title and Difficulty */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm md:text-base truncate pr-2">
            {problemTitle}
          </h4>
          {primaryConceptTested && (
            <p className="text-xs mt-1 opacity-75">{primaryConceptTested}</p>
          )}
        </div>
        <Badge className={`${getDifficultyBadgeColor(difficulty)} flex-shrink-0`}>
          {difficulty}
        </Badge>
      </div>

      {/* Recommendation Reason */}
      {whyRecommended && (
        <div className="mb-4 p-3 bg-white bg-opacity-50 rounded border-l-2 border-current">
          <p className="text-xs md:text-sm leading-relaxed">
            <span className="font-medium">💡 Why recommended: </span>
            {whyRecommended}
          </p>
        </div>
      )}

      {/* Topic Tag */}
      {topic && (
        <div className="mb-4">
          <Badge variant="outline" className="text-xs">
            {topic}
          </Badge>
        </div>
      )}

      {/* Duplicate Indicator */}
      {isDuplicate && (
        <div className="mb-4 p-3 bg-yellow-50 border-l-2 border-yellow-400 rounded flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700">This problem was recently recommended</p>
        </div>
      )}

      {/* Hints Section */}
      {hints && hints.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowHints(!showHints)}
            className="w-full flex items-center justify-between p-3 bg-white bg-opacity-50 rounded border-l-2 border-current hover:bg-opacity-70 transition"
          >
            <span className="text-xs md:text-sm font-medium">💡 Hints ({hints.length})</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showHints ? 'rotate-180' : ''}`} />
          </button>
          {showHints && (
            <div className="mt-2 ml-3 space-y-2 pl-3 border-l-2 border-current">
              {hints.map((hint, idx) => (
                <p key={idx} className="text-xs md:text-sm text-muted-foreground">
                  {idx + 1}. {hint}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Approach Guide Section */}
      {approachGuide && (
        <div className="mb-4">
          <button
            onClick={() => setShowApproach(!showApproach)}
            className="w-full flex items-center justify-between p-3 bg-white bg-opacity-50 rounded border-l-2 border-current hover:bg-opacity-70 transition"
          >
            <span className="text-xs md:text-sm font-medium">🎯 Approach Guide</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showApproach ? 'rotate-180' : ''}`} />
          </button>
          {showApproach && (
            <div className="mt-2 ml-3 pl-3 border-l-2 border-current">
              <p className="text-xs md:text-sm text-muted-foreground whitespace-pre-line">
                {approachGuide}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Learner Level */}
      {learnerLevel && (
        <div className="mb-4 text-xs text-muted-foreground bg-white bg-opacity-30 px-3 py-2 rounded">
          <span className="font-medium">Your Level: </span>
          <Badge variant="outline" className="ml-1 text-xs capitalize">{learnerLevel}</Badge>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        {onAILabClick && (
          <Button
            size="sm"
            variant="default"
            onClick={onAILabClick}
            className="gap-2"
          >
            <Zap className="w-4 h-4" />
            <span>AI Lab</span>
          </Button>
        )}
        
        {sourceUrl && (
          <Button
            size="sm"
            variant="outline"
            asChild
          >
            <a 
              href={sourceUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="gap-2 flex items-center"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{platform}</span>
            </a>
          </Button>
        )}
      </div>
    </motion.div>
  );
};
