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

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

class LLMQuestionGenerationService {
  /**
   * Generate personalized questions for a topic using Gemini LLM
   * With deduplication and database storage
   */
  static async generatePersonalizedQuestions(userId, topicId, options = {}) {
    try {
      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`🚀 GENERATING PERSONALIZED QUESTIONS`);
      logger.info(`${'='.repeat(80)}`);
      logger.info(`📍 User ID: ${userId}`);
      logger.info(`📍 Topic ID: ${topicId}`);
      logger.info(`📍 Limit: ${options.limit || 5}`);

      // 1. Fetch user profile
      const user = await User.findById(userId);
      if (!user) {
        logger.error(`❌ User not found: ${userId}`);
        throw new Error('User not found');
      }
      logger.info(`✅ User found: ${user.name || user.email}`);
      
      console.log(`\n📊 USER DATA FROM DATABASE:`);
      console.log(`   Name: ${user.fullName || user.name || 'MISSING'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Learning Level: ${user.learningLevel || 'MISSING'}`);
      console.log(`   Target Companies: ${user.targetCompaniesArray?.join(', ') || 'MISSING'}`);
      console.log(`   Preparation Phase: ${user.preparationPhase || 'MISSING'}`);

      // 2. Fetch topic intelligence data
      const progression = await UserTopicProgression.findOne({
        userId,
        topicId,
      });
      
      const topic = await Topic.findOne({ topicId });
      if (!topic) {
        logger.error(`❌ Topic not found: ${topicId}`);
        throw new Error('Topic not found');
      }
      logger.info(`✅ Topic found: ${topic.name}`);
      
      console.log(`\n📊 TOPIC DATA FROM DATABASE:`);
      console.log(`   Topic ID: ${topic.topicId}`);
      console.log(`   Topic Name: ${topic.name || 'MISSING'}`);
      console.log(`   Topic Description: ${topic.description ? 'Present' : 'MISSING'}`);
      console.log(`   Topic Active: ${topic.isActive}`);
      
      console.log(`\n📊 PROGRESSION DATA FROM DATABASE:`);
      if (progression) {
        console.log(`   Mastery Score: ${progression.masteryScore || 0}`);
        console.log(`   Readiness Score: ${progression.progressionReadinessScore || 0}`);
        console.log(`   Accuracy Rate: ${progression.accuracyRate || 0}%`);
        console.log(`   Retention Probability: ${progression.retentionProbability || 0}`);
        console.log(`   Current Difficulty: ${progression.currentDifficultyLevel || 'MISSING'}`);
        console.log(`   Total Attempts: ${progression.progressionStats?.totalAttempts || 0}`);
        console.log(`   Successful Attempts: ${progression.progressionStats?.successfulAttempts || 0}`);
      } else {
        console.log(`   ⚠️ NO PROGRESSION DATA FOUND FOR THIS TOPIC`);
      }
      
      if (progression) {
        logger.info(`   Mastery: ${progression.masteryScore}/100`);
        logger.info(`   Readiness: ${progression.progressionReadinessScore || 0}/100`);
        logger.info(`   Accuracy: ${progression.accuracyRate || 0}%`);
      } else {
        logger.info(`   No progression data found for this topic`);
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
        userName: user.fullName || user.name || 'Student',
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
      
      logger.info(`\n📊 LEARNER PROFILE PREPARED:`);
      logger.info(`   Name: ${learnerProfile.userName}`);
      logger.info(`   Level: ${learnerProfile.learningLevel}`);
      logger.info(`   Mastery: ${learnerProfile.masteryScore}/100`);
      logger.info(`   Readiness: ${learnerProfile.progressionReadinessScore}/100`);
      logger.info(`   Topic: ${learnerProfile.topicId}`);
      logger.info(`   Difficulty: ${learnerProfile.recommendedDifficulty}`);

      // 6. Call Gemini via Python AI service to generate questions
      const llmResponse = await this.callGeminiForQuestions(learnerProfile, options.limit || 5);

      logger.info(`\n📋 LLM RESPONSE RECEIVED (from callGeminiForQuestions):`);
      logger.info(`   Success: ${llmResponse.success}`);
      logger.info(`   Message: ${llmResponse.message}`);
      logger.info(`   Questions count: ${llmResponse.questions?.length || 0}`);
      logger.info(`   Full response:`, JSON.stringify(llmResponse, null, 2).substring(0, 500));

      // Validate response - success:false is error, success:true with empty questions is OK (fallback will be used)
      if (!llmResponse.success) {
        logger.error(`❌ LLM question generation failed`);
        logger.error(`   success: ${llmResponse.success}`);
        logger.error(`   questions exists: ${!!llmResponse.questions}`);
        logger.error(`   questions is array: ${Array.isArray(llmResponse.questions)}`);
        logger.error(`   questions length: ${llmResponse.questions?.length || 0}`);
        logger.error(`   Full llmResponse:`, JSON.stringify(llmResponse, null, 2));
        
        // Use fallback questions from database instead of returning error
        console.log(`\n⚠️  AI SERVICE FAILED, USING FALLBACK QUESTIONS FROM DATABASE`);
        logger.warn(`Using fallback questions from database`);
        const fallbackQuestions = await this.getFallbackQuestionsFromDatabase(topicId, options.limit || 5);
        
        if (fallbackQuestions && fallbackQuestions.length > 0) {
          console.log(`   Found ${fallbackQuestions.length} fallback questions from database`);
          return {
            success: true,
            topic: topic.name,
            recommendedDifficulty: learnerProfile.recommendedDifficulty,
            questions: fallbackQuestions,
            generatedAt: new Date(),
            source: 'fallback-database',
          };
        }
        
        // If no fallback available, return error
        return {
          success: false,
          topic: topic.name,
          recommendedDifficulty: learnerProfile.recommendedDifficulty,
          message: llmResponse.message || 'Failed to generate personalized questions. Please ensure Gemini API (GEMINI_API_KEY) is properly configured.',
          questions: [],
          source: 'error',
          generatedAt: new Date(),
        };
      }

      // Ensure questions is an array
      const questionsArray = llmResponse.questions || [];
      if (!Array.isArray(questionsArray)) {
        logger.error(`❌ Questions is not an array!`);
        logger.error(`   Type: ${typeof questionsArray}`);
        return {
          success: false,
          topic: topic.name,
          recommendedDifficulty: learnerProfile.recommendedDifficulty,
          message: 'Invalid response format from AI service',
          questions: [],
          source: 'error',
          generatedAt: new Date(),
        };
      }

      // 7. Process and deduplicate questions
      const processedQuestions = await this.processAndDeduplicateQuestions(
        userId,
        topicId,
        questionsArray
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
      logger.info(`\n🤖 CALLING AI SERVICE (Python/Gemini)`);
      logger.info(`   Endpoint: POST ${AI_SERVICE_URL}/ai/practice/generate-questions`);
      logger.info(`   Questions needed: ${limit}`);
      logger.info(`   Topic: ${learnerProfile.topicId}`);
      logger.info(`   User: ${learnerProfile.userName}`);
      
      console.log('\n' + '='.repeat(80));
      console.log('🤖 CALLING PYTHON AI SERVICE');
      console.log('='.repeat(80));
      console.log(`   URL: ${AI_SERVICE_URL}/ai/practice/generate-questions`);
      console.log(`   Learner Profile topicId: ${learnerProfile.topicId}`);
      console.log(`   Limit: ${limit}`);
      console.log(`\n📊 FULL LEARNER PROFILE BEING SENT:`);
      console.log(JSON.stringify(learnerProfile, null, 2));
      
      const response = await axios.post(
        `${AI_SERVICE_URL}/ai/practice/generate-questions`,
        {
          learnerProfile: learnerProfile,
          limit: limit,
        },
        { timeout: 30000 }
      );

      console.log(`\n✅ AXIOS POST CALL SUCCESSFUL (Status ${response.status})`);
      console.log(`   Response object type: ${typeof response}`);
      console.log(`   Response.data type: ${typeof response.data}`);
      console.log(`   Response.data is null: ${response.data === null}`);
      console.log(`   Response.data is undefined: ${response.data === undefined}`);
      
      // Stringify the entire response.data to see raw structure
      console.log(`\n📊 RAW RESPONSE DATA:`);
      const rawResponseStr = JSON.stringify(response.data);
      console.log(`   Length: ${rawResponseStr.length}`);
      console.log(rawResponseStr.substring(0, 1500));
      
      // Check each critical field
      console.log(`\n📋 FIELD-BY-FIELD ANALYSIS:`);
      console.log(`   response.data.success exists: ${response.data.success !== undefined}`);
      console.log(`   response.data.success value: ${response.data.success}`);
      console.log(`   response.data.success type: ${typeof response.data.success}`);
      console.log(`   response.data.success === true: ${response.data.success === true}`);
      console.log(`   response.data.success === false: ${response.data.success === false}`);
      console.log(`   Boolean(response.data.success): ${Boolean(response.data.success)}`);
      console.log(`   !response.data.success: ${!response.data.success}`);
      
      if (response.data.questions) {
        console.log(`   response.data.questions length: ${response.data.questions.length}`);
        console.log(`   response.data.questions is array: ${Array.isArray(response.data.questions)}`);
      } else {
        console.log(`   response.data.questions is falsy/missing`);
      }

      console.log(`\n✅ AI SERVICE RESPONSE RECEIVED`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Success: ${response.data.success}`);
      console.log(`   Questions: ${response.data.questions?.length || 0}`);
      console.log(`   Source: ${response.data.source}`);
      console.log(`   Full response keys:`, Object.keys(response.data));
      console.log(`   Message: ${response.data.message}`);
      console.log(`   Error Field: ${response.data.error}`);
      console.log(`\n   FULL RESPONSE DATA (parsed):`);
      console.log(JSON.stringify(response.data, null, 2));
      
      logger.info(`✅ AI Service responded`);
      logger.info(`   Status: ${response.status}`);
      logger.info(`   Success: ${response.data.success}`);
      logger.info(`   Response type: ${typeof response.data}`);
      logger.info(`   Response keys: ${Object.keys(response.data).join(', ')}`);
      logger.info(`   Questions type: ${typeof response.data.questions}`);
      logger.info(`   Questions is array: ${Array.isArray(response.data.questions)}`);
      logger.info(`   Full response dump:`, JSON.stringify(response.data, null, 2));
      logger.info(`   Full response:`, JSON.stringify(response.data, null, 2).substring(0, 1000));

      if (!response.data.success) {
        console.log(`\n❌ AI SERVICE RETURNED non-success`);
        console.log(`   Message: ${response.data.message}`);
        console.log(`   Error: ${response.data.error}`);
        
        logger.error(`❌ AI Service returned non-success`);
        logger.error(`   Error message: ${response.data.message || response.data.error}`);
        logger.error(`   Full error response:`, JSON.stringify(response.data, null, 2));
        return {
          success: false,
          questions: [],
          message: response.data.message || response.data.error || 'AI generation failed',
          error: response.data.error || 'AI generation failed',
        };
      }

      const questionsGenerated = response.data.questions?.length || 0;
      console.log(`✅ Successfully generated ${questionsGenerated} questions`);
      
      logger.info(`✅ Generated ${questionsGenerated} questions`);
      if (questionsGenerated > 0) {
        logger.info(`   Q1: ${response.data.questions[0].problemTitle}`);
      }
      
      return {
        success: true,
        questions: response.data.questions || [],
        source: response.data.source || 'gemini',
        message: response.data.message || 'Questions generated successfully',
      };
    } catch (error) {
      console.log(`\n❌ AXIOS ERROR CALLING AI SERVICE`);
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Status: ${error.response?.status}`);
      
      logger.error(`\n❌ AI SERVICE ERROR`);
      logger.error(`   Error: ${error.message}`);
      logger.error(`   Code: ${error.code}`);
      logger.error(`   URL: ${AI_SERVICE_URL}/ai/practice/generate-questions`);
      logger.error(`   Make sure AI service is running on port 8001`);
      if (error.response?.data) {
        logger.error(`   AI Service Response:`, JSON.stringify(error.response.data, null, 2));
      }
      
      return {
        success: false,
        questions: [],
        message: `AI service unavailable: ${error.message}`,
        error: `AI service unavailable: ${error.message}`,
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

  /**
   * Get fallback questions from QuestionBank when LLM fails
   */
  static async getFallbackQuestionsFromDatabase(topicId, limit = 5) {
    try {
      logger.info(`\n📚 FETCHING FALLBACK QUESTIONS FROM DATABASE`);
      logger.info(`   Topic ID: ${topicId}`);
      logger.info(`   Limit: ${limit}`);

      // Find questions related to this topic
      const questions = await QuestionBank.find({
        $or: [
          { topic: { $regex: topicId, $options: 'i' } },
          { tags: { $in: [topicId] } },
          { category: topicId },
        ],
      })
        .limit(limit)
        .lean();

      if (!questions || questions.length === 0) {
        logger.warn(`⚠️ No fallback questions found for topic: ${topicId}`);
        return [];
      }

      logger.info(`✅ Found ${questions.length} fallback questions`);

      // Transform to expected format
      const formatted = questions.map((q) => ({
        problemTitle: q.title || q.problemTitle || 'Unknown Problem',
        topic: q.topic || topicId,
        difficulty: q.difficulty || 'Medium',
        primaryConceptTested: q.category || 'General',
        whyRecommended: q.description || 'Practice problem from our database',
        hints: q.hints || [],
        approachGuide: q.solution || 'See solution in database',
        generatedFor: topicId,
        learnerLevel: 'intermediate',
        _id: q._id,
      }));

      return formatted;
    } catch (error) {
      logger.error(`Error fetching fallback questions: ${error.message}`);
      return [];
    }
  }
}

export default LLMQuestionGenerationService;
