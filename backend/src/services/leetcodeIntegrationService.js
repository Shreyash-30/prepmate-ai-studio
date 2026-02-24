import axios from 'axios';
import mongoose from 'mongoose';
import ProblemMetadataCache from '../models/ProblemMetadataCache.js';

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

// ============================================================================
// QUESTION DETAIL QUERY
// ============================================================================

/**
 * GraphQL query to fetch problem metadata (difficulty and topic tags)
 * Using individual queries instead of batch to avoid 400 errors
 */
const questionDetailQuery = `
  query getQuestionDetail($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionId
      difficulty
      topicTags {
        name
        slug
      }
    }
  }
`;

// ============================================================================
// METADATA ENRICHMENT FUNCTIONS
// ============================================================================

/**
 * Fetch metadata for a single problem from LeetCode API
 * Queries the working getQuestionDetail endpoint
 * @param {string} titleSlug - Problem title slug (e.g., "two-sum")
 * @returns {Promise<Object>} Problem metadata {difficulty, tags} or empty on error
 */
async function fetchQuestionMetadata(titleSlug) {
  try {
    console.log(`[LeetCode] Fetching metadata for problem: ${titleSlug}`);
    
    const response = await axios.post(
      LEETCODE_GRAPHQL_URL,
      {
        query: questionDetailQuery,
        variables: { titleSlug },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (PrepMate-AI-Studio)',
          'Referer': 'https://leetcode.com/',
        },
        timeout: 10000,
      }
    );

    if (response.data?.errors) {
      console.warn(`[LeetCode] GraphQL error fetching metadata for ${titleSlug}:`, response.data.errors[0].message);
      return {};
    }

    const question = response.data?.data?.question;
    if (!question) {
      console.warn(`[LeetCode] No question data returned for ${titleSlug}`);
      return {};
    }

    const metadata = {
      difficulty: question.difficulty || 'Unknown',
      tags: question.topicTags?.map(tag => tag.name) || [],
    };

    console.log(`[LeetCode] Metadata fetched for ${titleSlug}:`, JSON.stringify(metadata));
    return metadata;
  } catch (error) {
    console.error(`[LeetCode] Error fetching metadata for ${titleSlug}:`, error.message);
    return {};
  }
}

/**
 * Get metadata from cache or fetch from API if not cached
 * Implements read-through caching for performance
 * @param {string} problemId - Problem slug
 * @returns {Promise<Object>} Cached or fetched metadata
 */
async function getOrFetchMetadata(problemId) {
  try {
    // Check cache first
    const cached = await ProblemMetadataCache.findOne({ problemId });
    if (cached) {
      console.log(`[LeetCode] Using cached metadata for ${problemId}`);
      return {
        difficulty: cached.difficulty,
        tags: cached.tags,
      };
    }

    // Not in cache - fetch from API
    const metadata = await fetchQuestionMetadata(problemId);
    
    // Save to cache for future use
    if (metadata.difficulty || metadata.tags?.length > 0) {
      try {
        await ProblemMetadataCache.updateOne(
          { problemId },
          {
            problemId,
            difficulty: metadata.difficulty,
            tags: metadata.tags,
            lastFetchedAt: new Date(),
          },
          { upsert: true }
        );
        console.log(`[LeetCode] Cached metadata for ${problemId}`);
      } catch (cacheError) {
        console.warn(`[LeetCode] Failed to cache metadata for ${problemId}:`, cacheError.message);
        // Continue - caching failure shouldn't block the flow
      }
    }

    return metadata;
  } catch (error) {
    console.error(`[LeetCode] Error in getOrFetchMetadata for ${problemId}:`, error.message);
    return {};
  }
}

/**
 * Batch fetch metadata for multiple problems with caching
 * Only queries API for uncached problems - optimized for performance
 * @param {Array<string>} problemIds - Array of problem slugs
 * @returns {Promise<Object>} Map of problemId -> {difficulty, tags}
 */
async function fetchMetadataBatch(problemIds) {
  if (!problemIds || problemIds.length === 0) {
    return {};
  }

  const result = {};

  // Remove duplicates
  const uniqueIds = [...new Set(problemIds)];
  console.log(`[LeetCode] Fetching metadata for ${uniqueIds.length} unique problems (batch enrichment)`);

  // Check which ones are already cached
  const cachedProblems = await ProblemMetadataCache.find({ problemId: { $in: uniqueIds } });
  const cachedMap = {};
  cachedProblems.forEach(p => {
    cachedMap[p.problemId] = {
      difficulty: p.difficulty,
      tags: p.tags,
    };
    result[p.problemId] = cachedMap[p.problemId];
  });

  // Find which ones need to be fetched
  const uncachedIds = uniqueIds.filter(id => !cachedMap[id]);
  
  if (uncachedIds.length > 0) {
    console.log(`[LeetCode] Found ${uncachedIds.length} uncached problems, fetching from API...`);
    
    // Fetch uncached problems with rate limiting
    for (const problemId of uncachedIds) {
      const metadata = await getOrFetchMetadata(problemId);
      result[problemId] = metadata;
      
      // Rate limiting: wait 200ms between requests to avoid hitting LeetCode API limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  } else {
    console.log(`[LeetCode] All ${uniqueIds.length} problems already cached!`);
  }

  return result;
}

/**
 * Fetch LeetCode user profile using GraphQL
 * Note: Individual submissions are not publicly accessible via LeetCode API,
 * so we only fetch aggregate statistics (total problems solved, by difficulty)
 * @param {string} username - LeetCode username
 * @returns {Promise<Object>} Profile data with stats
 */
async function fetchProfile(username) {
  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          ranking
          reputation
        }
        submitStatsGlobal {
          acSubmissionNum {
            count
            difficulty
          }
          totalSubmissionNum {
            count
            difficulty
          }
        }
      }
    }
  `;

  try {
    console.log(`[LeetCode] Fetching profile for user: ${username}`);
    
    const response = await axios.post(
      LEETCODE_GRAPHQL_URL,
      {
        query,
        variables: { username },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (PrepMate-AI-Studio)',
          'Referer': 'https://leetcode.com/',
        },
        timeout: 10000,
      }
    );

    console.log(`[LeetCode] Response status: ${response.status}`);
    
    if (response.data?.errors) {
      const errorMsg = response.data.errors[0].message;
      console.error(`[LeetCode] GraphQL Error: ${errorMsg}`);
      throw new Error(`LeetCode API Error: ${errorMsg}`);
    }

    const user = response.data?.data?.matchedUser;
    if (!user) {
      console.error(`[LeetCode] User not found: ${username}`);
      throw new Error('User not found on LeetCode');
    }

    console.log(`[LeetCode] User found: ${user.username}`);

    // Extract stats from response
    const acStats = user.submitStatsGlobal?.acSubmissionNum || [];
    const totalStats = user.submitStatsGlobal?.totalSubmissionNum || [];
    
    const totalSolved = acStats.find((s) => s.difficulty === 'All')?.count || 0;
    const totalAttempts = totalStats.find((s) => s.difficulty === 'All')?.count || 0;
    
    // Calculate acceptance rate
    const acceptanceRate = totalAttempts > 0 
      ? Math.round((totalSolved / totalAttempts) * 100) 
      : 0;

    const profile = {
      username: user.username,
      totalSolved,
      acceptanceRate,
      ranking: user.profile?.ranking || 0,
      badges: [],
    };
    
    console.log(`[LeetCode] Profile fetched: totalSolved=${totalSolved}, acceptanceRate=${acceptanceRate}%`);
    return profile;
  } catch (error) {
    console.error(`[LeetCode] Error fetching profile for ${username}:`, error.message);
    // Return a default profile on error instead of throwing
    return {
      username,
      totalSolved: 0,
      acceptanceRate: 0,
      ranking: 0,
      badges: [],
      error: error.message,
    };
  }
}

/**
 * Fetch LeetCode user skill stats (tag problem counts)
 * @param {string} username - LeetCode username
 * @returns {Promise<Object>} Object containing advanced, intermediate, and fundamental tag counts
 */
async function fetchSkillStats(username) {
  const query = `
    query skillStats($username: String!) {
      matchedUser(username: $username) {
        tagProblemCounts {
          advanced { tagName tagSlug problemsSolved }
          intermediate { tagName tagSlug problemsSolved }
          fundamental { tagName tagSlug problemsSolved }
        }
      }
    }
  `;

  try {
    console.log(`[LeetCode] Fetching skill stats for user: ${username}`);
    const response = await axios.post(
      LEETCODE_GRAPHQL_URL,
      { query, variables: { username } },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (PrepMate-AI-Studio)',
          'Referer': 'https://leetcode.com/',
        },
        timeout: 10000,
      }
    );

    if (response.data?.errors) {
      console.warn(`[LeetCode] GraphQL Warning fetching skill stats:`, response.data.errors[0].message);
      return { advanced: [], intermediate: [], fundamental: [] };
    }

    const tagCounts = response.data?.data?.matchedUser?.tagProblemCounts;
    return tagCounts || { advanced: [], intermediate: [], fundamental: [] };
  } catch (error) {
    console.error(`[LeetCode] Error fetching skill stats for ${username}:`, error.message);
    return { advanced: [], intermediate: [], fundamental: [] };
  }
}

/**
 * Fetch LeetCode user submissions with enriched metadata
 * Uses new individual problem detail queries with caching
 * @param {string} username - LeetCode username
 * @returns {Promise<Array>} Array of submission objects with difficulty and tags
 */
async function fetchSubmissions(username) {
  // Query: Get recent accepted submissions
  const submissionsQuery = `
    query recentAcSubmissions($username: String!) {
      recentAcSubmissionList(username: $username) {
        id
        title
        titleSlug
        timestamp
      }
    }
  `;

  try {
    console.log(`[LeetCode] Fetching recent accepted submissions for ${username}...`);
    
    const response = await axios.post(
      LEETCODE_GRAPHQL_URL,
      {
        query: submissionsQuery,
        variables: { username },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (PrepMate-AI-Studio)',
          'Referer': 'https://leetcode.com/',
        },
        timeout: 10000,
      }
    );

    if (response.data?.errors) {
      const errorMsg = response.data.errors[0].message;
      console.warn(`[LeetCode] GraphQL Warning: ${errorMsg}`);
      return [];
    }

    const submissions = response.data?.data?.recentAcSubmissionList || [];
    console.log(`[LeetCode] Found ${submissions.length} recent accepted submissions`);

    // NEW: Use batch metadata enrichment with caching
    // This replaces the old broken batch query approach
    const problemIds = submissions.map(s => s.titleSlug);
    
    // IMPORTANT: Fetch and wait for metadata enrichment
    console.log(`[LeetCode] Starting metadata enrichment for ${problemIds.length} problems...`);
    const metadataMap = await fetchMetadataBatch(problemIds);
    console.log(`[LeetCode] Metadata enrichment complete. Got data for ${Object.keys(metadataMap).length} problems`);

    // Normalize submissions with enriched metadata
    const enrichedSubmissions = submissions.map((sub) => {
      const metadata = metadataMap[sub.titleSlug] || {};
      const enriched = {
        platformSubmissionId: sub.id,
        problemId: sub.titleSlug,
        problemTitle: sub.title,
        difficulty: metadata.difficulty || 'Unknown',
        tags: metadata.tags || [],
        submissionTime: new Date(parseInt(sub.timestamp) * 1000),
        status: 'accepted',
      };
      
      // Log first few enriched submissions
      if (submissions.indexOf(sub) < 3) {
        console.log(`[LeetCode] Enriched submission: ${enriched.problemTitle} -> difficulty=${enriched.difficulty}, tags=${JSON.stringify(enriched.tags)}`);
      }
      
      return enriched;
    });
    
    console.log(`[LeetCode] Returned ${enrichedSubmissions.length} enriched submissions`);
    return enrichedSubmissions;
  } catch (error) {
    console.error(`[LeetCode] Error fetching submissions for ${username}:`, error.message);
    return [];
  }
}

/**
 * DEPRECATED: Old batch problem details query that returns 400 errors
 * 
 * This function is kept for reference but SHOULD NOT BE USED.
 * It attempted to fetch all problem details in a single query by building
 * a large GraphQL query with multiple problem(titleSlug) aliases.
 * 
 * LeetCode GraphQL API rejects these large batch queries with status 400.
 * 
 * INSTEAD: Use fetchMetadataBatch() which:
 * - Uses individual getQuestionDetail queries (which work reliably)
 * - Implements caching to avoid redundant API calls
 * - Applies rate limiting (200ms between requests)
 * - Only queries uncached problems
 * 
 * This improves both reliability and performance.
 * 
 * @deprecated Use fetchMetadataBatch() instead
 */
async function fetchProblemDetails(problemSlugs) {
  console.warn(`[LeetCode] DEPRECATED: fetchProblemDetails called - use fetchMetadataBatch() instead`);
  return {};
}

/**
 * Fetch LeetCode acceptance rate (now included in fetchProfile)
 * @deprecated Use fetchProfile() instead - acceptance rate is now included there
 * @param {string} username - LeetCode username
 * @returns {Promise<number>} Acceptance rate percentage
 */
async function fetchAcceptanceRate(username) {
  console.log(`[LeetCode] fetchAcceptanceRate is deprecated. Acceptance rate is now calculated in fetchProfile().`);
  const profile = await fetchProfile(username);
  return profile.acceptanceRate;
}

export { 
  fetchProfile, 
  fetchSubmissions, 
  fetchProblemDetails,
  fetchAcceptanceRate,
  // NEW EXPORTS: Individual metadata functions
  fetchQuestionMetadata,
  getOrFetchMetadata,
  fetchMetadataBatch,
  fetchSkillStats,
  ProblemMetadataCache,
};
