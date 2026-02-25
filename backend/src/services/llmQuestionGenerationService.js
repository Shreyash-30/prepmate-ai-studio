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
      // Extract limit from options early
      const limit = options.limit || 5;
      
      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`🚀 GENERATING PERSONALIZED QUESTIONS`);
      logger.info(`${'='.repeat(80)}`);
      logger.info(`📍 User ID: ${userId}`);
      logger.info(`📍 Topic ID: ${topicId}`);
      logger.info(`📍 Limit: ${limit}`);

      // 1. Fetch user profile
      let user = await User.findById(userId);
      if (!user) {
        logger.warn(`⚠️ User not found: ${userId}, creating default profile for testing`);
        // Create a default profile for non-existent users (for testing/demo)
        user = {
          _id: userId,
          name: 'Test User',
          fullName: 'Test User',
          email: 'test@example.com',
          learningLevel: 'intermediate',
          targetCompaniesArray: ['Google', 'Meta', 'Amazon'],
          preparationPhase: 'practice',
        };
        logger.info(`✅ Using default user profile`);
      } else {  
        logger.info(`✅ User found: ${user.name || user.email}`);
      }
      
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
      // Calculate recommended difficulty based on mastery score
      const calculateRecommendedDifficulty = (masteryScore, readinessScore) => {
        // If user has high mastery, recommend harder problems for growth
        if (masteryScore >= 80 || readinessScore >= 80) {
          return 'Hard';
        }
        if (masteryScore >= 50 || readinessScore >= 50) {
          return 'Medium';
        }
        return 'Easy';
      };

      const masteryScore = progression?.masteryScore || 0;
      const readinessScore = progression?.progressionReadinessScore || 0;
      const recommendedDifficulty = calculateRecommendedDifficulty(masteryScore, readinessScore);
      
      console.log(`\n⚡ ADAPTIVE DIFFICULTY SELECTION:`);
      console.log(`   Mastery Score: ${masteryScore}`);
      console.log(`   Readiness Score: ${readinessScore}`);
      console.log(`   Stored Difficulty Level: ${progression?.currentDifficultyLevel || 'Easy'}`);
      console.log(`   RECOMMENDED DIFFICULTY: ${recommendedDifficulty} ✅`);

      const learnerProfile = {
        userId: user._id,
        userName: user.fullName || user.name || 'Student',
        learningLevel: user.learningLevel || 'intermediate',
        targetCompanies: user.targetCompaniesArray?.join(', ') || 'General tech roles',
        preparationGoal: user.preparationPhase || 'practice',
        topicId: topic.name,
        topicDescription: topic.description || '',
        masteryScore: masteryScore,
        progressionReadinessScore: readinessScore,
        retentionProbability: progression?.retentionProbability || 0,
        currentDifficultyLevel: progression?.currentDifficultyLevel || 'Easy',
        totalAttempts: progression?.progressionStats?.totalAttempts || 0,
        successfulAttempts: progression?.progressionStats?.successfulAttempts || 0,
        weakSubtopics: weakSubtopics.join(', ') || 'Various',
        recentMistakePatterns: mistakePatterns.join(', ') || 'General mistakes',
        recommendedDifficulty: recommendedDifficulty,
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

      // Validate response - only accept LLM-generated questions
      if (!llmResponse.success) {
        logger.error(`❌ LLM question generation failed`);
        logger.error(`   success: ${llmResponse.success}`);
        logger.error(`   Error: ${llmResponse.message || llmResponse.error}`);
        
        return {
          success: false,
          topic: topic.name,
          recommendedDifficulty: learnerProfile.recommendedDifficulty,
          message: llmResponse.message || 'Failed to generate questions. Please ensure Gemini API is properly configured.',
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

      // 9. 🔥 ENFORCE: Convert and save as wrapped questions (schemaVersion 2)
      const wrappedQuestions = await this.convertToWrappedQuestions(processedQuestions, topicId);
      logger.info(`\n📝 WRAPPED QUESTIONS TO SAVE: ${wrappedQuestions.length}`);
      
      const savedWrappedQuestions = await this.saveWrappedQuestionsToDatabase(wrappedQuestions);
      logger.info(`✅ SAVED WRAPPED QUESTIONS: ${savedWrappedQuestions.length}`);

      // 10. Return saved wrapped questions (with correct problemIds for frontend)
      let questionsToReturn = [];
      
      if (savedWrappedQuestions.length > 0) {
        // Map database documents to frontend response format
        questionsToReturn = savedWrappedQuestions.map(q => {
          // Convert Mongoose document to plain object
          const plainQ = q.toObject ? q.toObject() : q;
          return {
            problemId: plainQ.problemId,
            problemTitle: plainQ.title,
            titleSlug: plainQ.titleSlug,
            difficulty: plainQ.difficulty,
            description: plainQ.content,
            constraints: plainQ.constraints,
            hints: Array.isArray(plainQ.hints) ? plainQ.hints : [],
            functionName: plainQ.functionMetadata?.functionName || 'solution',
            testCases: Array.isArray(plainQ.testCasesStructured) ? plainQ.testCasesStructured : [],
            schemaVersion: 2,
            source: plainQ.isPaired ? (plainQ.sourceUrl?.includes('leetcode') ? 'leetcode' : 'platform') : 'leetcode',
            sourceUrl: plainQ.sourceUrl,
            platform: plainQ.isPaired ? (plainQ.sourceUrl?.includes('leetcode') ? 'LeetCode' : 'Library') : 'LeetCode',
            topicId: topicId,
          };
        });
        logger.info(`✅ MAPPED TO FRONTEND FORMAT: ${questionsToReturn.length} questions`);
      } else {
        logger.warn(`⚠️ NO WRAPPED QUESTIONS WERE SAVED!`);
        logger.warn(`   Processed: ${processedQuestions.length}, Wrapped: ${wrappedQuestions.length}, Saved: ${savedWrappedQuestions.length}`);
        // Fallback: try to use processed questions if wrapped save failed
        questionsToReturn = processedQuestions.slice(0, limit).map(q => ({
          problemId: q.problemId || this.generateProblemId(q.problemTitle),
          problemTitle: q.problemTitle,
          difficulty: q.difficulty || 'Medium',
          description: q.description || '',
          constraints: q.constraints || 'N/A',
          hints: Array.isArray(q.hints) ? q.hints : [],
          functionName: q.functionName || 'solve',
          testCases: q.testCases || [],
          schemaVersion: 2,
          source: 'leetcode',
          sourceUrl: q.sourceUrl || `https://leetcode.com/problems/${(q.problemTitle || '').toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')}/`,
          platform: 'LeetCode',
          topicId: topicId,
        }));
        logger.warn(`   Using fallback: ${questionsToReturn.length} questions in v2 format`);
      }

      return {
        success: questionsToReturn.length > 0,
        topic: topic.name,
        recommendedDifficulty: learnerProfile.recommendedDifficulty,
        generationPrompt: learnerProfile,
        questions: questionsToReturn,
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
        { timeout: 45000 }
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
   * Marks duplicates based on normalized title and ensures all required fields are present
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

      // Ensure all required fields are present - add defaults if missing
      const enrichedQuestion = {
        ...q,
        problemTitle: q.problemTitle || 'Unknown Problem',
        topic: q.topic || topicId,
        difficulty: q.difficulty || 'Medium',
        primaryConceptTested: q.primaryConceptTested || 'General',
        whyRecommended: q.whyRecommended || 'Practice problem',
        hints: Array.isArray(q.hints) ? q.hints : (q.hints ? [q.hints] : []),
        approachGuide: q.approachGuide || '',
        generatedFor: q.generatedFor || topicId,
        learnerLevel: q.learnerLevel || 'intermediate', // ✅ ENSURE LEARNER LEVEL IS SET
        generationSessionId: sessionId,
      };

      // Check if duplicate in current session
      if (titlesSeen.has(normalizedTitle)) {
        logger.debug(`Duplicate detected in session: ${q.problemTitle}`);
        processed.push({
          ...enrichedQuestion,
          isDuplicate: true,
        });
        continue;
      }

      // Check if generated recently for this user in this topic
      try {
        const existingQuestion = await GeneratedQuestionLog.checkDuplicate(
          userId,
          q.problemTitle,
          60 // Check last 60 minutes
        );

        if (existingQuestion) {
          logger.debug(`Question previously generated: ${q.problemTitle}`);
          processed.push({
            ...enrichedQuestion,
            problemId: existingQuestion.problemId,
            isDuplicate: true,
            duplicateOf: existingQuestion._id,
          });
        } else {
          titlesSeen.add(normalizedTitle);
          processed.push({
            ...enrichedQuestion,
            isDuplicate: false,
          });
        }
      } catch (error) {
        logger.warn(`Error checking for duplicate: ${error.message}, treating as new question`);
        titlesSeen.add(normalizedTitle);
        processed.push({
          ...enrichedQuestion,
          isDuplicate: false,
        });
      }
    }

    logger.info(`Processed ${processed.length} questions, learnerLevel ensured for all`);
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
   * Validates and normalizes all required fields before storage
   */
  static async storeGeneratedQuestions(userId, topicId, questions) {
    try {
      const logsToStore = [];
      const validLearnerLevels = ['beginner', 'intermediate', 'advanced'];

      for (const q of questions) {
        if (q.isDuplicate) {
          logger.debug(`Skipping duplicate question storage: ${q.problemTitle}`);
          continue;
        }

        // Normalize learnerLevel to lowercase and provide default
        let normalizedLearnerLevel = 'intermediate'; // Default fallback
        if (q.learnerLevel) {
          normalizedLearnerLevel = q.learnerLevel.toLowerCase().trim();
          if (!validLearnerLevels.includes(normalizedLearnerLevel)) {
            logger.warn(`Invalid learnerLevel "${q.learnerLevel}", using default "intermediate"`);
            normalizedLearnerLevel = 'intermediate';
          }
        } else {
          logger.warn(`Missing learnerLevel for question "${q.problemTitle}", using default "intermediate"`);
        }

        // Ensure difficulty is properly capitalized
        const difficulty = q.difficulty?.charAt(0).toUpperCase() + q.difficulty?.slice(1).toLowerCase() || 'Medium';
        if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
          logger.warn(`Invalid difficulty "${q.difficulty}", using default "Medium"`);
        }

        // Try to find matching question in QuestionBank
        const qbQuestion = await QuestionBank.findOne({
          title: { $regex: `^${q.problemTitle}$`, $options: 'i' },
          isActive: true,
        }).lean();

        // Generate wrapped execution fields for this question
        const wrapperTemplate = this.generateWrapperTemplates(q);
        const starterCode = this.generateStarterCode(q);
        const functionMetadata = this.extractFunctionMetadata(q);

        // Convert test cases to structured format
        const testCasesStructured = q.testCases && Array.isArray(q.testCases) ?
          q.testCases.map(tc => ({
            input: tc.input, // Already properly typed by LLM
            expectedOutput: tc.expectedOutput, // Already properly typed by LLM
            visibility: tc.visibility || 'public',
          })).filter(tc => tc.input !== undefined && tc.expectedOutput !== undefined) :
          [];

        const logEntry = {
          userId,
          topicId,
          problemId: q.problemId || this.generateProblemId(q.problemTitle), // UNIQUE IDENTIFIER
          problemTitle: q.problemTitle,
          problemTitleNormalized: q.problemTitle.toLowerCase().trim(),
          topic: q.topic || topicId,
          difficulty: difficulty,
          primaryConceptTested: q.primaryConceptTested || 'General',
          whyRecommended: q.whyRecommended || 'Generated question for practice',
          hints: Array.isArray(q.hints) ? q.hints : [q.hints || ''],
          approachGuide: q.approachGuide || '',
          generatedFor: q.generatedFor || topicId,
          learnerLevel: normalizedLearnerLevel,
          generationSessionId: q.generationSessionId || `session_${Date.now()}`,
          geminiModelVersion: 'gemini-2.5-flash',
          sourceQuestionBankId: qbQuestion?._id || null,
          sourceUrl: qbQuestion?.sourceUrl || `https://leetcode.com/problems/${q.problemTitle.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')}/`,
          isPaired: !!qbQuestion,
          // ✅ WRAPPED EXECUTION FIELDS (CONSISTENT WITH QuestionBank)
          functionMetadata: functionMetadata,
          wrapperTemplate: wrapperTemplate,
          starterCode: starterCode,
          testCasesStructured: testCasesStructured,  // ✅ RENAMED: testCases → testCasesStructured
          schemaVersion: 2,
          isActive: true,  // ✅ CRITICAL: Mark as active so validation passes
          description: q.description || q.problemTitle,
          constraints: q.constraints || 'N/A',
        };

        logger.debug(`Prepared log entry:`, {
          problemTitle: logEntry.problemTitle,
          learnerLevel: logEntry.learnerLevel,
          difficulty: logEntry.difficulty,
        });

        logsToStore.push(logEntry);
      }

      if (logsToStore.length > 0) {
        try {
          // Log what we're about to save
          logger.info(`\n📝 ABOUT TO SAVE ${logsToStore.length} QUESTIONS TO GeneratedQuestionLog`);
          logsToStore.forEach((q, idx) => {
            logger.info(`   [${idx+1}] Problem ID: ${q.problemId} | Title: ${q.problemTitle} | Schema: v${q.schemaVersion} | Active: ${q.isActive}`);
          });

          // Try to insert with duplicate handling
          let result;
          try {
            result = await GeneratedQuestionLog.insertMany(logsToStore, { 
              ordered: false,  // Try to insert all even if some fail
            });
            
            logger.info(`\n✅ SUCCESSFULLY SAVED ${result.length} questions to GeneratedQuestionLog`);
            result.forEach((saved, idx) => {
              logger.info(`   [${idx+1}] Saved: _id=${saved._id}, problemId=${saved.problemId}`);
            });
            return result;
          } catch (insertError) {
            // Handle duplicate key errors gracefully
            if (insertError.code === 11000 || insertError.writeErrors) {
              logger.warn(`⚠️ Partial insert due to duplicates (BulkWrite error)`);
              logger.warn(`   Error Code: ${insertError.code}`);
              
              if (insertError.insertedDocs && insertError.insertedDocs.length > 0) {
                logger.info(`   ✅ SAVED ${insertError.insertedDocs.length} new questions (duplicates skipped)`);
                return insertError.insertedDocs;
              } else if (insertError.result?.ok === 1) {
                // Partial success - MongoDB still inserted some documents
                logger.info(`   ✅ Partial insert completed with duplicates`);
                return logsToStore.map(q => ({ ...q, _id: new (require('mongodb')).ObjectId() }));
              } else {
                // All duplicates - try to fetch existing questions
                logger.warn(`   All documents are duplicates, fetching existing from database`);
                const existingQuestions = await GeneratedQuestionLog.find({
                  problemId: { $in: logsToStore.map(q => q.problemId) }
                });
                logger.info(`   ✅ Found ${existingQuestions.length} existing questions in database`);
                return existingQuestions;
              }
            }
            // Re-throw if it's a different error
            throw insertError;
          }
        } catch (dbError) {
          logger.error(`\n❌ MongoDB insertMany ERROR`);
          logger.error(`   Error Code: ${dbError.code}`);
          logger.error(`   Error Message: ${dbError.message}`);
          
          if (dbError.writeErrors) {
            logger.error(`   Write Errors: ${dbError.writeErrors.length}`);
            dbError.writeErrors.forEach((err, idx) => {
              logger.error(`     [${idx}] ${err.code}: ${err.errmsg}`);
            });
          }
          
          // Log the problematic entries for debugging
          logger.error(`\n   ENTRIES ATTEMPTED TO STORE:`);
          logsToStore.forEach((q, idx) => {
            logger.error(`     [${idx+1}] problemId="${q.problemId}" | title="${q.problemTitle}"` +
              ` | learnerLevel="${q.learnerLevel}" | schemaVersion=${q.schemaVersion}`);
          });
          
          // Don't throw - continue anyway, problems may have been created in GeneratedQuestionLog
          logger.warn(`   ⚠️ Continuing despite insertion error...`);
          return [];
        }
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

      // Find questions related to this topic - get MORE than limit to ensure we have enough
      const questions = await QuestionBank.find({
        $or: [
          { topic: { $regex: topicId, $options: 'i' } },
          { tags: { $in: [topicId] } },
          { category: topicId },
          { topicId: topicId },
        ],
        isActive: true,
      })
        .limit(Math.max(limit * 2, 10)) // Get at least 10 questions or 2x limit
        .lean();

      if (!questions || questions.length === 0) {
        logger.warn(`⚠️ No fallback questions found for topic: ${topicId}`);
        logger.warn(`   Creating hardcoded fallback questions for topic`);
        
        // Provide hardcoded fallback if no database questions found
        return this.getHardcodedFallbackQuestions(topicId, limit);
      }

      logger.info(`✅ Found ${questions.length} fallback questions from database`);

      // Transform to expected format
      const formatted = questions.slice(0, limit).map((q) => ({
        problemTitle: q.title || q.problemTitle || 'Unknown Problem',
        topic: q.topic || topicId,
        difficulty: q.difficulty || 'Medium',
        primaryConceptTested: q.category || 'General',
        whyRecommended: q.description || 'Practice problem from our database',
        hints: Array.isArray(q.hints) ? q.hints : (q.hints ? [q.hints] : []),
        approachGuide: q.solution || 'See solution in database',
        generatedFor: topicId,
        learnerLevel: 'intermediate',
        _id: q._id,
      }));

      logger.info(`✅ Formatted ${formatted.length} database questions`);
      return formatted;
    } catch (error) {
      logger.error(`Error fetching fallback questions: ${error.message}`);
      logger.warn(`   Providing hardcoded fallback instead`);
      return this.getHardcodedFallbackQuestions(topicId, limit);
    }
  }

  /**
   * Hardcoded fallback questions by topic (when database fails)
   */
  static getHardcodedFallbackQuestions(topicId, limit = 5) {
    const fallbacks = {
      'arrays': [
        { problemTitle: 'Two Sum', topic: 'Hash Table', difficulty: 'Easy' },
        { problemTitle: 'Best Time to Buy and Sell Stock', topic: 'Dynamic Programming', difficulty: 'Easy' },
        { problemTitle: 'Contains Duplicate', topic: 'Hash Set', difficulty: 'Easy' },
        { problemTitle: 'Product of Array Except Self', topic: 'Dynamic Programming', difficulty: 'Medium' },
        { problemTitle: 'Maximum Subarray', topic: 'Dynamic Programming', difficulty: 'Medium' },
      ],
      'strings': [
        { problemTitle: 'Longest Substring Without Repeating Characters', topic: 'Sliding Window', difficulty: 'Medium' },
        { problemTitle: 'Valid Anagram', topic: 'Hash Table', difficulty: 'Easy' },
        { problemTitle: 'Palindrome String', topic: 'Two Pointers', difficulty: 'Easy' },
        { problemTitle: 'Group Anagrams', topic: 'Hash Table', difficulty: 'Medium' },
        { problemTitle: 'Regular Expression Matching', topic: 'Dynamic Programming', difficulty: 'Hard' },
      ],
      'trees': [
        { problemTitle: 'Binary Tree Level Order Traversal', topic: 'Tree Traversal', difficulty: 'Medium' },
        { problemTitle: 'Maximum Depth of Binary Tree', topic: 'Tree Traversal', difficulty: 'Easy' },
        { problemTitle: 'Invert Binary Tree', topic: 'Tree Traversal', difficulty: 'Easy' },
        { problemTitle: 'Path Sum', topic: 'DFS', difficulty: 'Medium' },
        { problemTitle: 'Lowest Common Ancestor', topic: 'Tree Traversal', difficulty: 'Medium' },
      ],
      'graphs': [
        { problemTitle: 'Number of Islands', topic: 'Graph Traversal', difficulty: 'Medium' },
        { problemTitle: 'Clone Graph', topic: 'Graph Traversal', difficulty: 'Medium' },
        { problemTitle: 'Course Schedule', topic: 'Topological Sort', difficulty: 'Medium' },
        { problemTitle: 'Word Ladder', topic: 'BFS', difficulty: 'Hard' },
        { problemTitle: 'Alien Dictionary', topic: 'Topological Sort', difficulty: 'Hard' },
      ],
      'dynamic_programming': [
        { problemTitle: 'Coin Change', topic: 'DP', difficulty: 'Medium' },
        { problemTitle: 'Longest Increasing Subsequence', topic: 'DP', difficulty: 'Medium' },
        { problemTitle: 'House Robber', topic: 'DP', difficulty: 'Medium' },
        { problemTitle: 'Word Break', topic: 'DP', difficulty: 'Medium' },
        { problemTitle: 'Edit Distance', topic: 'DP', difficulty: 'Hard' },
      ],
      'linked_lists': [
        { problemTitle: 'Reverse Linked List', topic: 'Linked List', difficulty: 'Easy' },
        { problemTitle: 'Merge Two Sorted Lists', topic: 'Linked List', difficulty: 'Easy' },
        { problemTitle: 'Linked List Cycle', topic: 'Linked List', difficulty: 'Medium' },
        { problemTitle: 'Remove Nth Node From End', topic: 'Linked List', difficulty: 'Medium' },
        { problemTitle: 'Reorder List', topic: 'Linked List', difficulty: 'Medium' },
      ],
      'heap': [
        { problemTitle: 'Kth Largest Element', topic: 'Heap', difficulty: 'Medium' },
        { problemTitle: 'Top K Frequent Elements', topic: 'Heap', difficulty: 'Medium' },
        { problemTitle: 'Merge K Sorted Lists', topic: 'Heap', difficulty: 'Hard' },
        { problemTitle: 'Reorganize String', topic: 'Heap', difficulty: 'Medium' },
        { problemTitle: 'Sliding Window Maximum', topic: 'Heap', difficulty: 'Hard' },
      ],
      'math': [
        { problemTitle: 'Reverse Integer', topic: 'Math', difficulty: 'Easy' },
        { problemTitle: 'Palindrome Number', topic: 'Math', difficulty: 'Easy' },
        { problemTitle: 'Plus One', topic: 'Math', difficulty: 'Easy' },
        { problemTitle: 'Power of Three', topic: 'Math', difficulty: 'Easy' },
        { problemTitle: 'Integer Break', topic: 'Math', difficulty: 'Medium' },
      ],
    };

    const topicQuestions = fallbacks[topicId.toLowerCase()] || fallbacks['arrays'];
    const selected = topicQuestions.slice(0, limit);

    return selected.map(q => ({
      ...q,
      primaryConceptTested: q.topic,
      whyRecommended: `Practice problem in ${q.topic}`,
      hints: ['Think about edge cases', 'Consider time/space tradeoff'],
      approachGuide: 'Solve step by step',
      generatedFor: topicId,
      learnerLevel: 'intermediate',
    }));
  }

  /**
   * PHASE 6: Convert LLM-generated questions to schemaVersion 2 wrapped format
   */
  static async convertToWrappedQuestions(questions, topicId) {
    const wrapped = [];
    let skipped = 0;

    for (const q of questions) {
      try {
        if (!q.problemTitle || q.problemTitle.toLowerCase() === 'general' || q.problemTitle.toLowerCase() === 'problem') {
          logger.warn(`❌ Question missing valid problemTitle, using primaryConceptTested`);
          q.problemTitle = q.primaryConceptTested || `Generated ${topicId} Problem`;
        }

        // Get test cases (may be testCases or testCasesStructured)
        let testCases = q.testCases || q.testCasesStructured || [];
        
        // Relaxed validation: at least 1 test case
        if (!Array.isArray(testCases) || testCases.length === 0) {
          logger.warn(`❌ Question "${q.problemTitle}" missing or empty testCases, skipping`);
          skipped++;
          continue;
        }

        // Filter valid test cases
        const validTestCases = testCases.filter(tc => {
          // Must have either input or expectedOutput (or both)
          const hasInput = tc.input !== undefined && tc.input !== null;
          const hasOutput = (tc.expectedOutput !== undefined && tc.expectedOutput !== null) || 
                           (tc.output !== undefined && tc.output !== null);
          return hasInput || hasOutput;
        });

        if (validTestCases.length === 0) {
          logger.warn(`❌ Question "${q.problemTitle}" has no valid test cases, skipping`);
          skipped++;
          continue;
        }

        // Get wrapper and starter (may not exist, will provide defaults)
        const wrapperTemplate = q.wrapperTemplate || this.generateWrapperTemplates(q);
        const starterCode = q.starterCode || this.generateStarterCode(q);
        const functionMetadata = q.functionMetadata || this.extractFunctionMetadata(q);

        // Convert test cases to structured format (NO JSON.PARSE - already properly typed by LLM)
        const testCasesStructured = validTestCases.map(tc => ({
          input: tc.input || {},
          expectedOutput: tc.expectedOutput !== undefined ? tc.expectedOutput : (tc.output || {}),
          visibility: tc.visibility || 'public',
        }));

        // Ensure we have valid test cases after conversion
        if (testCasesStructured.length === 0) {
          logger.warn(`❌ Question "${q.problemTitle}" has no valid test cases after conversion, skipping`);
          skipped++;
          continue;
        }

        const wrappedQuestion = {
          problemId: q.problemId || this.generateProblemId(q.problemTitle),
          title: q.problemTitle,
          titleSlug: q.problemTitle.toLowerCase().replace(/\s+/g, '-'),
          content: q.description || q.problemTitle,
          difficulty: q.difficulty || 'Medium',
          topicTags: [topicId, q.primaryConceptTested || 'general'],
          normalizedTopics: [topicId.toLowerCase().replace(/\s+/g, '_')],
          hints: Array.isArray(q.hints) ? q.hints : [q.hints || ''],
          constraints: q.constraints || 'N/A',
          schemaVersion: 2,
          wrapperTemplate: wrapperTemplate,
          starterCode: starterCode,
          functionMetadata: functionMetadata,
          testCasesStructured: testCasesStructured,
          source: q.platform === 'Library' ? 'platform' : 'leetcode',
          sourceUrl: q.sourceUrl || `https://leetcode.com/problems/${q.problemTitle.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')}/`,
          sourceId: `generated-${Date.now()}-${q.problemId || this.generateProblemId(q.problemTitle)}`,
          acceptanceRate: 50,
          submissionCount: 0,
          isPremium: false,
          isActive: true,
          isRecommended: true,
        };

        logger.info(`✅ Converted to wrapped: ${wrappedQuestion.title}`);
        wrapped.push(wrappedQuestion);
      } catch (error) {
        logger.error(`Error converting "${q.problemTitle}":`, error.message);
        skipped++;
      }
    }

    logger.info(`\n✅ WRAPPED CONVERSION SUMMARY:`);
    logger.info(`   Total processed: ${questions.length}`);
    logger.info(`   Successfully wrapped: ${wrapped.length}`);
    logger.info(`   Skipped/failed: ${skipped}`);

    return wrapped;
  }

  static generateWrapperTemplates(question) {
    const func = question.functionName || 'solve';
    return {
      python: `def ${func}(**kwargs):\n    __USER_CODE__`,
      javascript: `function ${func}(input) {\n    __USER_CODE__\n}`,
      java: `public class Solution {\n    public static Object ${func}(Object input) {\n        __USER_CODE__\n    }\n}`,
      cpp: `Object ${func}(Object input) {\n    __USER_CODE__\n}`,
      go: `func ${func}(input interface{}) interface{} {\n    __USER_CODE__\n}`,
    };
  }

  static generateStarterCode(question) {
    const func = question.functionName || 'solve';
    return {
      python: `def ${func}(**kwargs):\n    \"\"\"${question.description || 'Solve the problem'}\"\"\"\n    pass`,
      javascript: `function ${func}(input) {\n    // ${question.description || 'Solve the problem'}\n}`,
      java: `public class Solution {\n    public static Object ${func}(Object input) {\n        // ${question.description || 'Solve the problem'}\n        return null;\n    }\n}`,
      cpp: `Object ${func}(Object input) {\n    // ${question.description || 'Solve the problem'}\n    return nullptr;\n}`,
      go: `func ${func}(input interface{}) interface{} {\n    // ${question.description || 'Solve the problem'}\n    return nil\n}`,
    };
  }

  static extractFunctionMetadata(question) {
    return {
      functionName: question.functionName || 'solve',
      parameters: [{ name: 'input', type: 'object' }],
      returnType: 'object',
    };
  }

  static generateProblemId(title) {
    const slug = title.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug;
  }

  static async saveWrappedQuestionsToDatabase(wrappedQuestions) {
    try {
      if (wrappedQuestions.length === 0) {
        logger.warn(`⚠️ No wrapped questions to save`);
        return [];
      }

      const saved = [];
      for (const q of wrappedQuestions) {
        try {
          // PHASE 9: Ensure v2 enforcement
          const questionData = {
            ...q,
            schemaVersion: 2,  // FORCE schemaVersion 2
            isActive: true,     // FORCE active status
          };

          logger.info(`\n   Saving to QuestionBank: "${q.title}"`);
          
          // Try upsert first: update if exists, create if doesn't
          let savedQuestion = await QuestionBank.findOneAndUpdate(
            { problemId: q.problemId },
            {
              $set: questionData,
            },
            {
              upsert: true,  // Create if doesn't exist
              new: true,      // Return updated document
              runValidators: true,
            }
          );

          if (savedQuestion) {
            logger.info(`     ✅ Saved to QuestionBank`);
            logger.info(`        _id: ${savedQuestion._id}`);
            logger.info(`        Schema: v${savedQuestion.schemaVersion}, Active: ${savedQuestion.isActive}`);
            logger.info(`        Has wrapperTemplate: ${!!savedQuestion.wrapperTemplate}`);
            logger.info(`        TestCases: ${(savedQuestion.testCasesStructured || []).length}`);
            saved.push(savedQuestion);
          }
        } catch (error) {
          logger.error(`❌ Cannot save "${q.title}" to QuestionBank:`, {
            message: error.message,
            code: error.code,
            validationErrors: error.errors ? JSON.stringify(error.errors) : 'none',
          });
          // Don't throw - continue with other questions
        }
      }

      logger.info(`\n✅ Saved ${saved.length}/${wrappedQuestions.length} wrapped questions to QuestionBank`);
      return saved;
    } catch (error) {
      logger.error(`Error saving wrapped questions:`, error);
      throw error;
    }
  }
}

export default LLMQuestionGenerationService;
