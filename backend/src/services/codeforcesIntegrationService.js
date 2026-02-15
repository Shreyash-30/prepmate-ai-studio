import axios from 'axios';

const CODEFORCES_API_URL = 'https://codeforces.com/api';

/**
 * Fetch Codeforces user info
 * @param {string} username - Codeforces username
 * @returns {Promise<Object>} Profile data
 */
async function fetchProfile(username) {
  try {
    console.log(`[Codeforces] Fetching profile for user: ${username}`);
    
    const response = await axios.get(`${CODEFORCES_API_URL}/user.info`, {
      params: {
        handles: username,
      },
      timeout: 10000,
    });

    if (response.data?.status !== 'OK') {
      throw new Error('Codeforces API error');
    }

    const user = response.data?.result?.[0];
    if (!user) {
      console.error(`[Codeforces] User not found: ${username}`);
      throw new Error('User not found on Codeforces');
    }

    console.log(`[Codeforces] User found: ${user.handle}`);

    // Normalize profile data
    const profile = {
      username: user.handle,
      totalSolved: user.solvedCount || 0,
      acceptanceRate: 0,
      contestRating: user.rating || 0,
      ranking: user.rank ? convertCFRankToNumber(user.rank) : 0,
      badges: user.titlePhoto ? [user.title] : [],
    };
    
    console.log(`[Codeforces] Profile fetched:`, profile);
    return profile;
  } catch (error) {
    console.error(`[Codeforces] Error fetching profile for ${username}:`, error.message);
    // Return a default profile on error
    return {
      username,
      totalSolved: 0,
      acceptanceRate: 0,
      contestRating: 0,
      ranking: 0,
      badges: [],
      error: error.message,
    };
  }
}

/**
 * Fetch Codeforces user submissions
 * @param {string} username - Codeforces username
 * @param {number} limit - Number of submissions to fetch (default: 100)
 * @returns {Promise<Array>} Array of submission objects
 */
async function fetchSubmissions(username, limit = 100) {
  try {
    console.log(`[Codeforces] Fetching submissions for user: ${username} (limit: ${limit})`);
    
    const response = await axios.get(`${CODEFORCES_API_URL}/user.status`, {
      params: {
        handle: username,
        from: 1,
        count: limit,
      },
      timeout: 10000,
    });

    if (response.data?.status !== 'OK') {
      console.warn(`[Codeforces] API status not OK: ${response.data?.status}`);
      return [];
    }

    const submissions = response.data?.result || [];
    console.log(`[Codeforces] Found ${submissions.length} submissions`);

    // Filter to only accepted submissions and normalize
    return submissions
      .filter((sub) => sub.verdict === 'OK')
      .map((sub) => ({
        platformSubmissionId: `${sub.id}`,
        problemId: `${sub.problem.contestId}${sub.problem.index}`,
        problemTitle: sub.problem.name,
        difficulty: mapCFDifficulty(sub.problem.rating),
        tags: sub.problem.tags || [],
        status: sub.verdict === 'OK' ? 'accepted' : sub.verdict.toLowerCase(),
        language: sub.programmingLanguage,
        runtime: sub.timeConsumedMillis ? `${sub.timeConsumedMillis}ms` : '',
        memory: sub.memoryConsumedBytes ? `${Math.round(sub.memoryConsumedBytes / 1024)}KB` : '',
        submissionTime: new Date(sub.creationTimeSeconds * 1000),
      }));
  } catch (error) {
    console.error(`[Codeforces] Error fetching submissions for ${username}:`, error.message);
    // Return empty array instead of throwing
    return [];
  }
}

/**
 * Convert Codeforces rank to a numeric value (simplified)
 */
function convertCFRankToNumber(rank) {
  const rankMap = {
    newbie: 1200,
    'pupil': 1400,
    'specialist': 1600,
    'expert': 1900,
    'candidate master': 2100,
    'master': 2300,
    'international master': 2400,
    'grandmaster': 2500,
    'international grandmaster': 3000,
    'legendary grandmaster': 3500,
  };
  return rankMap[rank?.toLowerCase()] || 0;
}

/**
 * Map Codeforces problem rating to difficulty
 */
function mapCFDifficulty(rating) {
  if (!rating) return 'Unknown';
  if (rating <= 1200) return 'Easy';
  if (rating <= 1600) return 'Medium';
  return 'Hard';
}

export { fetchProfile, fetchSubmissions };
