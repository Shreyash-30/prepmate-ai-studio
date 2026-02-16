/**
 * Question Fetch Service
 * 
 * Fetches problem metadata from LeetCode GraphQL API
 * Caches in question_bank model
 * Handles fallback and error scenarios
 */

import logger from '../utils/logger.js';
import QuestionBank from '../models/QuestionBank.js';
import ProblemMetadataCache from '../models/ProblemMetadataCache.js';
import topicMappingService from './topicMappingService.js';

// ============================================
// LEETCODE GRAPHQL QUERIES
// ============================================

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

const GET_QUESTION_QUERY = `
  query getQuestion($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionId
      questionFrontendId
      title
      titleSlug
      difficulty
      content
      hints
      topicTags {
        name
        slug
      }
      examples {
        input
        output
        explanation
      }
      codeSnippets {
        lang
        code
      }
    }
  }
`;

const GET_PROBLEM_SET_QUERY = `
  query getProblemSet($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    problemsetQuestionList(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
      filters: $filters
    ) {
      total
      questions {
        questionId
        questionFrontendId
        title
        titleSlug
        difficulty
        topicTags {
          name
          slug
        }
      }
    }
  }
`;

/**
 * Question Fetch Service
 */
class QuestionFetchService {
  /**
   * Fetch single question from LeetCode by slug
   * Stores in question_bank if not already present
   */
  static async fetchAndStoreQuestion(titleSlug) {
    try {
      // Check if already in question_bank
      const existing = await QuestionBank.findByTitleSlug(titleSlug);
      if (existing && existing.ensureContentLoaded()) {
        logger.info(`Question already cached: ${titleSlug}`);
        return existing;
      }

      // Fetch from LeetCode
      logger.info(`Fetching from LeetCode: ${titleSlug}`);
      const questionData = await this.fetchFromLeetCode(titleSlug);

      if (!questionData) {
        throw new Error(`Failed to fetch question from LeetCode: ${titleSlug}`);
      }

      // Normalize topics
      const normalizedTopics = (questionData.topicTags || [])
        .map((tag) => topicMappingService.mapTagToTopic(tag.slug || tag.name))
        .filter(Boolean);

      // Create or update in question_bank
      const questionRecord = await QuestionBank.findOneAndUpdate(
        { titleSlug: titleSlug.toLowerCase() },
        {
          problemId: titleSlug.toLowerCase(),
          title: questionData.title,
          titleSlug: titleSlug.toLowerCase(),
          difficulty: questionData.difficulty || 'Unknown',
          topicTags: (questionData.topicTags || []).map((t) => t.name),
          normalizedTopics: normalizedTopics,
          content: questionData.content || '',
          hints: questionData.hints || [],
          exampleCases: (questionData.examples || []).map((ex) => ({
            input: ex.input,
            output: ex.output,
            explanation: ex.explanation,
          })),
          source: 'leetcode',
          sourceUrl: `https://leetcode.com/problems/${titleSlug}`,
          sourceId: questionData.questionId,
          lastFetchedAt: new Date(),
          contentVersion: 1,
          isActive: true,
        },
        { upsert: true, new: true }
      );

      logger.info(`Stored question in database: ${titleSlug}`);
      return questionRecord;
    } catch (error) {
      logger.error(`Error fetching question ${titleSlug}:`, error);
      throw error;
    }
  }

  /**
   * Fetch multiple questions by difficulty and topics
   */
  static async fetchQuestionsByTopicAndDifficulty(topics, difficulty, limit = 10) {
    try {
      // Check database first for cached questions
      const cached = await QuestionBank.findByTopicAndDifficulty(topics, difficulty);

      if (cached.length >= limit) {
        logger.info(`Found ${cached.length} cached questions`);
        return cached.slice(0, limit);
      }

      // If need more, attempt to fetch additional
      const additionalNeeded = limit - cached.length;

      // For now, return what we have + try to fetch some new ones
      const results = [...cached];

      // Try to fetch a few more problems
      logger.info(`Need ${additionalNeeded} more questions from LeetCode`);
      // Note: This would require a more sophisticated LeetCode query
      // For MVP, we'll work with what's cached

      return results;
    } catch (error) {
      logger.error('Error fetching questions by topic and difficulty:', error);
      throw error;
    }
  }

  /**
   * Get or fetch question by problem ID
   */
  static async getOrFetchQuestion(problemId) {
    try {
      // Normalize problem ID to title slug format
      const titleSlug = problemId.toLowerCase().replace(/[^a-z0-9-]/g, '-');

      // Check database
      let question = await QuestionBank.findByTitleSlug(titleSlug);

      if (question && question.ensureContentLoaded()) {
        return question;
      }

      // Fetch and store
      question = await this.fetchAndStoreQuestion(titleSlug);
      return question;
    } catch (error) {
      logger.error(`Error getting or fetching question ${problemId}:`, error);

      // Return cached metadata if available
      const metadata = await ProblemMetadataCache.findOne({
        problemId: problemId.toLowerCase(),
      });

      if (metadata) {
        return {
          problemId: metadata.problemId,
          difficulty: metadata.difficulty,
          topicTags: metadata.tags,
          isPartial: true,
        };
      }

      throw error;
    }
  }

  /**
   * Batch fetch multiple questions
   */
  static async getOrFetchQuestions(problemIds) {
    const results = await Promise.all(
      problemIds.map((id) => this.getOrFetchQuestion(id).catch(() => null))
    );

    return results.filter(Boolean);
  }

  /**
   * Direct LeetCode API call
   */
  static async fetchFromLeetCode(titleSlug) {
    try {
      const response = await fetch(LEETCODE_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify({
          query: GET_QUESTION_QUERY,
          variables: { titleSlug: titleSlug },
        }),
      });

      if (!response.ok) {
        throw new Error(`LeetCode API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.errors) {
        logger.error('LeetCode GraphQL errors:', data.errors);
        return null;
      }

      return data.data?.question || null;
    } catch (error) {
      logger.error(`LeetCode fetch error for ${titleSlug}:`, error);
      return null;
    }
  }

  /**
   * Cache problem metadata only (lighter weight)
   */
  static async cacheProblemMetadata(problemId, difficulty, tags) {
    try {
      await ProblemMetadataCache.findOneAndUpdate(
        { problemId: problemId.toLowerCase() },
        {
          problemId: problemId.toLowerCase(),
          difficulty: difficulty,
          tags: tags || [],
          lastFetchedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      logger.error(`Error caching metadata for ${problemId}:`, error);
    }
  }

  /**
   * Refresh question content from LeetCode (periodic sync)
   */
  static async refreshQuestion(titleSlug, forceRefresh = false) {
    try {
      const question = await QuestionBank.findByTitleSlug(titleSlug);

      if (!forceRefresh && question && question.lastFetchedAt) {
        const hoursSinceLastFetch =
          (Date.now() - new Date(question.lastFetchedAt).getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastFetch < 24) {
          logger.info(`Question refreshed recently: ${titleSlug}`);
          return question;
        }
      }

      // Fetch fresh data
      return await this.fetchAndStoreQuestion(titleSlug);
    } catch (error) {
      logger.error(`Error refreshing question ${titleSlug}:`, error);
      throw error;
    }
  }

  /**
   * Search questions by keyword
   */
  static async searchQuestions(keyword, limit = 20) {
    try {
      const results = await QuestionBank.find({
        $or: [
          { title: { $regex: keyword, $options: 'i' } },
          { topicTags: { $regex: keyword, $options: 'i' } },
        ],
        isActive: true,
      })
        .limit(limit)
        .select('problemId title difficulty topicTags normalizedTopics');

      return results;
    } catch (error) {
      logger.error('Error searching questions:', error);
      throw error;
    }
  }
}

export default QuestionFetchService;
