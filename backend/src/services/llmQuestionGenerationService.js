/**
 * LLM Question Generation Service
 * Generates personalized coding questions using Gemini via Python AI service
 * Integrates with question bank and implements deduplication
 */

import axios from 'axios';
import logger from '../utils/logger.js';
import User from '../models/User.js';
import UserTopicProgression from '../models/UserTopicProgression.js';
import Topic from '../models/Topic.js';
import PracticeAttemptEvent from '../models/PracticeAttemptEvent.js';
import QuestionBank from '../models/QuestionBank.js';
import GeneratedQuestionLog from '../models/GeneratedQuestionLog.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

class LLMQuestionGenerationService {
  /**
   * Generate personalized questions for a topic using Gemini LLM
   * With deduplication and database storage
   */
  static async generatePersonalizedQuestions(userId, topicId, options = {}) {
    try {
      logger.info(`Generating personalized questions for user ${userId}, topic ${topicId}`);

      // 1. Fetch user profile
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // 2. Fetch topic intelligence data
      const progression = await UserTopicProgression.findOne({
        userId,
        topicId,
      });
      
      const topic = await Topic.findOne({ topicId });
      if (!topic) {
        throw new Error('Topic not found');
      }

      // 3. Get recent attempt patterns for mistake analysis
      const recentAttempts = await PracticeAttemptEvent.find({
        userId,
        topicId,
      }).sort({ createdAt: -1 }).limit(10).lean();

      // 4. Analyze patterns and weak areas
      const mistakePatterns = this.analyzeMistakePatterns(recentAttempts);
      const weakSubtopics = this.identifyWeakSubtopics(recentAttempts);

      // 5. Build comprehensive learner profile for Gemini
      const learnerProfile = {
        userId: user._id,
        userName: user.fullName || 'Student',
        learningLevel: user.learningLevel || 'intermediate',
        targetCompanies: user.targetCompaniesArray?.join(', ') || 'General tech roles',
        preparationGoal: user.preparationPhase || 'practice',
        topicId: topic.name,
        topicDescription: topic.description || '',
        masteryScore: progression?.masteryScore || 0,
        progressionReadinessScore: progression?.progressionReadinessScore || 0,
        retentionProbability: progression?.retentionProbability || 0,
        currentDifficultyLevel: progression?.currentDifficultyLevel || 'Easy',
        totalAttempts: progression?.progressionStats?.totalAttempts || 0,
        successfulAttempts: progression?.progressionStats?.successfulAttempts || 0,
        weakSubtopics: weakSubtopics.join(', ') || 'Various',
        recentMistakePatterns: mistakePatterns.join(', ') || 'General mistakes',
        recommendedDifficulty: progression?.currentDifficultyLevel || 'Easy',
        desiredQuestionCount: options.limit || 5,
      };

      // 6. Call Gemini via Python AI service to generate questions
      const llmResponse = await this.callGeminiForQuestions(learnerProfile, options.limit || 5);

      if (!llmResponse.success || !llmResponse.questions || llmResponse.questions.length === 0) {
        logger.error(`❌ LLM question generation failed - Gemini API not configured or returned empty response`);
        return {
          success: false,
          topic: topic.name,
          recommendedDifficulty: learnerProfile.recommendedDifficulty,
          message: 'Failed to generate personalized questions. Please ensure Gemini API (GEMINI_API_KEY) is properly configured.',
          questions: [],
          source: 'error',
          generatedAt: new Date(),
        };
      }

      // 7. Process and deduplicate questions
      const processedQuestions = await this.processAndDeduplicateQuestions(
        userId,
        topicId,
        llmResponse.questions || []
      );

      // 8. Store generated questions to database
      await this.storeGeneratedQuestions(userId, topicId, processedQuestions);

      // 9. Enrich with QuestionBank links if available
      const enrichedQuestions = await this.enrichWithQuestionBankLinks(processedQuestions);

      return {
        success: true,
        topic: topic.name,
        recommendedDifficulty: learnerProfile.recommendedDifficulty,
        generationPrompt: learnerProfile,
        questions: enrichedQuestions,
        generatedAt: new Date(),
        source: 'gemini',
      };
    } catch (error) {
      logger.error(`Error generating questions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Call Gemini via Python AI service to generate questions
   */
  static async callGeminiForQuestions(learnerProfile, limit) {
    try {
      logger.info(`Calling Gemini for ${limit} questions on topic: ${learnerProfile.topicId}`);

      const response = await axios.post(
        `${AI_SERVICE_URL}/ai/practice/generate-questions`,
        {
          learnerProfile: learnerProfile,
          limit: limit,
        },
        { timeout: 30000 }
      );

      if (!response.data.success) {
        logger.warn(`Gemini returned non-success: ${response.data.error}`);
        return {
          success: false,
          questions: [],
          error: response.data.error || 'Gemini generation failed',
        };
      }

      logger.info(`✅ Gemini generated ${response.data.questions?.length || 0} questions`);
      return {
        success: true,
        questions: response.data.questions || [],
        source: response.data.source || 'gemini',
      };
    } catch (error) {
      logger.error(`Gemini service error: ${error.message}`);
      return {
        success: false,
        questions: [],
        error: `Gemini service unavailable: ${error.message}`,
      };
    }
  }

  /**
   * Process questions and perform deduplication
   * Marks duplicates based on normalized title
   */
  static async processAndDeduplicateQuestions(userId, topicId, questions) {
    const processed = [];
    const titlesSeen = new Set();
    const sessionId = `session-${Date.now()}`;

    for (const q of questions) {
      if (!q.problemTitle) {
        logger.warn('Question missing problemTitle, skipping');
        continue;
      }

      // Normalize title for deduplication
      const normalizedTitle = q.problemTitle.toLowerCase().trim();

      // Check if duplicate in current session
      if (titlesSeen.has(normalizedTitle)) {
        logger.debug(`Duplicate detected in session: ${q.problemTitle}`);
        processed.push({
          ...q,
          isDuplicate: true,
          generationSessionId: sessionId,
        });
        continue;
      }

      // Check if generated recently for this user in this topic
      const existingQuestion = await GeneratedQuestionLog.checkDuplicate(
        userId,
        q.problemTitle,
        60 // Check last 60 minutes
      );

      if (existingQuestion) {
        logger.debug(`Question previously generated: ${q.problemTitle}`);
        processed.push({
          ...q,
          isDuplicate: true,
          duplicateOf: existingQuestion._id,
          generationSessionId: sessionId,
        });
      } else {
        titlesSeen.add(normalizedTitle);
        processed.push({
          ...q,
          isDuplicate: false,
          generationSessionId: sessionId,
        });
      }
    }

    return processed;
  }

  /**
   * Build the prompt for LLM
   */
  static buildGenerationPrompt(learnerProfile) {
    return `You are an adaptive, personalized coding question recommender for PrepMate AI Studio.

TASK: Generate ${learnerProfile.desiredQuestionCount} HIGHLY PERSONALIZED coding practice questions tailored to this specific learner.

====== LEARNER INTELLIGENCE PROFILE ======
Name: ${learnerProfile.userName}
Learning Level: ${learnerProfile.learningLevel}
Target Companies: ${learnerProfile.targetCompanies}
Preparation Phase: ${learnerProfile.preparationGoal}

====== LEARNING ANALYTICS ======
Topic: ${learnerProfile.topicId}
Description: ${learnerProfile.topicDescription}

Mastery: ${(learnerProfile.masteryScore * 100).toFixed(1)}%
Progression Readiness: ${(learnerProfile.progressionReadinessScore * 100).toFixed(1)}%
Retention Probability: ${(learnerProfile.retentionProbability * 100).toFixed(1)}%
Total Attempts: ${learnerProfile.totalAttempts}
Successful: ${learnerProfile.successfulAttempts}

Weak Areas: ${learnerProfile.weakSubtopics}
Mistake Patterns: ${learnerProfile.recentMistakePatterns}

====== RECOMMENDATIONS ======
Current Level: ${learnerProfile.currentDifficultyLevel}
Recommended Difficulty: ${learnerProfile.recommendedDifficulty}

====== INSTRUCTIONS ======
1. Address learner's weak areas with targeted problems
2. Each question is SPECIFIC to this learner's profile
3. Vary problem types to ensure comprehensive learning
4. Difficulty should match: ${learnerProfile.recommendedDifficulty}
5. Include personalized explanations in 'whyRecommended'
6. Hints should guide but NOT solve
7. Provide implementation/approach strategy

====== RESPONSE FORMAT ======
Return ONLY valid JSON (NO markdown, NO extra text):

[
  {
    "problemTitle": "Problem Name",
    "difficulty": "Easy|Medium|Hard",
    "topic": "topic-name",
    "primaryConceptTested": "concept-being-tested",
    "whyRecommended": "Personalized reason why this specific learner should solve this",
    "hints": ["hint 1", "hint 2", "hint 3"],
    "approachGuide": "Step by step approach to solve this problem"
  }
]

Generate ${learnerProfile.desiredQuestionCount} questions now.`;
  }

  /**
   * Enrich questions with QuestionBank links
   * Provides sourceUrl from database or constructs LeetCode URL
   */
  static async enrichWithQuestionBankLinks(questions) {
    const enriched = [];

    for (const q of questions) {
      try {
        // Check if it's a duplicate
        if (q.isDuplicate) {
          enriched.push({
            ...q,
            sourceUrl: '#',
            platform: 'unknown',
            status: 'duplicate',
          });
          continue;
        }

        // Try to find in QuestionBank
        const dbQuestion = await QuestionBank.findOne({
          title: { $regex: `^${q.problemTitle}$`, $options: 'i' },
          isActive: true,
        }).lean();

        if (dbQuestion) {
          enriched.push({
            ...q,
            sourceUrl: dbQuestion.sourceUrl,
            platform: dbQuestion.source,
            problemId: dbQuestion.problemId,
            acceptanceRate: dbQuestion.acceptanceRate,
          });
        } else {
          // Generate URL slug
          const slug = q.problemTitle
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

          enriched.push({
            ...q,
            sourceUrl: `https://leetcode.com/problems/${slug}/`,
            platform: 'leetcode',
          });
        }
      } catch (error) {
        logger.warn(`Error enriching question "${q.problemTitle}": ${error.message}`);
        enriched.push({
          ...q,
          sourceUrl: '#',
          platform: 'unknown',
          enrichmentError: error.message,
        });
      }
    }

    return enriched;
  }

  /**
   * Find LeetCode problem URL
   */
  static async findLeetcodeProblemUrl(problemTitle) {
    try {
      // Try to fetch from local question bank first
      const dbQuestion = await QuestionBank.findOne({
        title: { $regex: problemTitle, $options: 'i' },
      }).lean();

      if (dbQuestion && dbQuestion.sourceUrl) {
        return dbQuestion.sourceUrl;
      }

      // Fallback: Construct URL from problem title
      // Convert "Two Sum" -> "two-sum"
      const slug = problemTitle
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

      return `https://leetcode.com/problems/${slug}/`;
    } catch (error) {
      logger.warn(`Error finding LeetCode URL for "${problemTitle}": ${error.message}`);
      return null;
    }
  }

  /**
   * Analyze mistake patterns from recent attempts
   */
  static analyzeMistakePatterns(attempts) {
    const patterns = {};

    attempts.forEach(attempt => {
      if (!attempt.correctness) {
        const category = attempt.mistakeCategory || 'general';
        patterns[category] = (patterns[category] || 0) + 1;
      }
    });

    return Object.entries(patterns)
      .sort((a, b) => b[1] - a[1])
      .map(([pattern, count]) => `${pattern} (${count} times)`)
      .slice(0, 3);
  }

  /**
   * Identify weak subtopics
   */
  static identifyWeakSubtopics(attempts) {
    const subtopicScores = {};

    attempts.forEach(attempt => {
      if (attempt.subtopic && !attempt.correctness) {
        subtopicScores[attempt.subtopic] = (subtopicScores[attempt.subtopic] || 0) + 1;
      }
    });

    return Object.entries(subtopicScores)
      .sort((a, b) => b[1] - a[1])
      .map(([subtopic]) => subtopic)
      .slice(0, 3);
  }

  /**
   * Generate fallback recommendations if LLM is unavailable
   * Returns empty array to enforce LLM-only generation
   */
  static async generateFallbackRecommendations(learnerProfile) {
    try {
      logger.warn(`⚠️ LLM unavailable - Gemini API not configured. Returning empty array.`);
      logger.warn(`Please set GEMINI_API_KEY environment variable to enable AI-powered question generation.`);
      
      // Return empty array - no fallback to dummy questions
      // This encourages users to configure Gemini API properly
      return [];
    } catch (error) {
      logger.error(`Error in generateFallbackRecommendations: ${error.message}`);
      return [];
    }
  }

  /**
   * Store generated questions to database with deduplication
   */
  static async storeGeneratedQuestions(userId, topicId, questions) {
    try {
      const logsToStore = [];

      for (const q of questions) {
        if (q.isDuplicate) {
          logger.debug(`Skipping duplicate question storage: ${q.problemTitle}`);
          continue;
        }

        // Try to find matching question in QuestionBank
        const qbQuestion = await QuestionBank.findOne({
          title: { $regex: `^${q.problemTitle}$`, $options: 'i' },
          isActive: true,
        }).lean();

        const logEntry = {
          userId,
          topicId,
          problemTitle: q.problemTitle,
          problemTitleNormalized: q.problemTitle.toLowerCase().trim(),
          topic: q.topic,
          difficulty: q.difficulty,
          primaryConceptTested: q.primaryConceptTested,
          whyRecommended: q.whyRecommended,
          hints: q.hints || [],
          approachGuide: q.approachGuide || '',
          generatedFor: q.generatedFor,
          learnerLevel: q.learnerLevel,
          generationSessionId: q.generationSessionId,
          geminiModelVersion: 'gemini-2.5-flash',
          sourceQuestionBankId: qbQuestion?._id || null,
          sourceUrl: qbQuestion?.sourceUrl || null,
          isPaired: !!qbQuestion,
        };

        logsToStore.push(logEntry);
      }

      if (logsToStore.length > 0) {
        const result = await GeneratedQuestionLog.insertMany(logsToStore);
        logger.info(`✅ Stored ${result.length} generated questions in database`);
        return result;
      }

      return [];
    } catch (error) {
      logger.error(`Error storing generated questions: ${error.message}`);
      throw error;
    }
  }
}

export default LLMQuestionGenerationService;
