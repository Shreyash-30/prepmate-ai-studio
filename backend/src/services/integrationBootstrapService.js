import IntegrationAccount from '../models/IntegrationAccount.js';
import ExternalPlatformProfile from '../models/ExternalPlatformProfile.js';
import ExternalPlatformSubmission from '../models/ExternalPlatformSubmission.js';
import IntegrationSyncLog from '../models/IntegrationSyncLog.js';
import User from '../models/User.js';
import { fetchProfile as lcFetchProfile, fetchSubmissions as lcFetchSubmissions, fetchAcceptanceRate } from './leetcodeIntegrationService.js';
import { fetchProfile as cfFetchProfile, fetchSubmissions as cfFetchSubmissions } from './codeforcesIntegrationService.js';

/**
 * Bootstrap integration: fetch profile and submissions from external platform
 * @param {string} userId - User ID
 * @param {string} platform - Platform type ('leetcode' or 'codeforces')
 * @param {string} username - Platform username
 */
async function bootstrap(userId, platform, username) {
  const startTime = new Date();
  let syncLog = null;

  try {
    // Update status to running
    await IntegrationAccount.updateOne(
      { userId, platform },
      {
        bootstrapStatus: 'running',
        $set: { errorMessage: null },
      }
    );

    // Fetch profile and submissions based on platform
    let profile, submissions = [];
    
    console.log(`[${platform}] Fetching profile for ${username}...`);
    
    try {
      if (platform === 'leetcode') {
        profile = await lcFetchProfile(username);
        console.log(`[${platform}] LeetCode fetchProfile returned:`, JSON.stringify(profile, null, 2));
        console.log(`[${platform}] Profile has totalSolved=${profile.totalSolved}, acceptanceRate=${profile.acceptanceRate}`);
      } else {
        profile = await cfFetchProfile(username);
      }
      console.log(`[${platform}] Profile fetched successfully:`, JSON.stringify(profile, null, 2));
    } catch (profileError) {
      console.error(`[${platform}] Failed to fetch profile:`, profileError.message);
      // Create a minimal profile on error - account exists even if we can't fetch data
      profile = {
        username,
        totalSolved: 0,
        acceptanceRate: 0,
        ranking: 0,
        badges: [],
        error: profileError.message,
      };
    }

    console.log(`[${platform}] Fetching submissions for ${username}...`);
    try {
      if (platform === 'leetcode') {
        submissions = await lcFetchSubmissions(username);
      } else {
        submissions = await cfFetchSubmissions(username);
      }
      console.log(`[${platform}] Fetched ${submissions.length} submissions`);
    } catch (submissionError) {
      console.error(`[${platform}] Failed to fetch submissions:`, submissionError.message);
      // Continue with empty submissions array
      submissions = [];
    }

    // Save or update profile
    const profileData = {
      userId,
      platform,
      username,
      totalSolved: profile.totalSolved,
      acceptanceRate: profile.acceptanceRate,
      contestRating: profile.contestRating,
      ranking: profile.ranking,
      badges: profile.badges,
      lastFetchedAt: new Date(),
    };

    console.log(`[${platform}] Profile data to save:`, JSON.stringify(profileData, null, 2));

    const savedProfile = await ExternalPlatformProfile.findOneAndUpdate(
      { userId, platform },
      profileData,
      { upsert: true, new: true }
    );
    
    console.log(`[${platform}] Profile saved to DB. ID: ${savedProfile._id}`);

    // Update User model with platform profile data
    const platformKey = platform === 'leetcode' ? 'leetcode' : 'codeforces';
    const updateObj = {
      [`platformProfiles.${platformKey}.connected`]: true,
      [`platformProfiles.${platformKey}.username`]: username,
      [`platformProfiles.${platformKey}.totalSolved`]: profile.totalSolved,
      [`platformProfiles.${platformKey}.lastSyncedAt`]: new Date(),
    };

    if (platform === 'leetcode') {
      updateObj['platformProfiles.leetcode.acceptanceRate'] = profile.acceptanceRate;
      updateObj['platformProfiles.leetcode.ranking'] = profile.ranking;
      updateObj['platformProfiles.leetcode.badges'] = profile.badges;
    } else if (platform === 'codeforces') {
      updateObj['platformProfiles.codeforces.contestRating'] = profile.contestRating;
      updateObj['platformProfiles.codeforces.ranking'] = profile.ranking;
      updateObj['platformProfiles.codeforces.badges'] = profile.badges;
    }

    // Bulk insert submissions (handle duplicates gracefully)
    let recordsInserted = 0;
    let recordsDuplicated = 0;

    console.log(`[${platform}] Inserting ${submissions.length} submissions into database...`);
    
    for (const submission of submissions) {
      try {
        const result = await ExternalPlatformSubmission.updateOne(
          {
            userId,
            platform,
            platformSubmissionId: submission.platformSubmissionId,
          },
          {
            userId,
            platform,
            ...submission,
          },
          { upsert: true }
        );

        // Check if it was inserted (upserted) or already existed
        if (result.upsertedId) {
          recordsInserted++;
        } else if (result.matchedCount > 0) {
          recordsDuplicated++;
        }
      } catch (error) {
        // Handle duplicate key errors and other database errors gracefully
        if (error.code === 11000) {
          recordsDuplicated++;
          console.log(`[${platform}] Skipped duplicate submission: ${submission.platformSubmissionId}`);
        } else if (error.message.includes('E11000')) {
          recordsDuplicated++;
          console.log(`[${platform}] Skipped duplicate submission (E11000): ${submission.platformSubmissionId}`);
        } else {
          console.error(`[${platform}] Error inserting submission:`, error.message);
          // Don't throw - continue processing other submissions
        }
      }
    }

    console.log(`[${platform}] Submissions insertion complete: inserted=${recordsInserted}, duplicated=${recordsDuplicated}`);

    // NOTE: For LeetCode, individual submissions are not available via public API.
    // We use profile.totalSolved (from aggregate stats) as the source of truth.
    // For Codeforces, we count distinct problems from submissions if available.
    if (platform === 'codeforces' && submissions.length > 0) {
      const uniqueProblems = await ExternalPlatformSubmission.find({
        userId,
        platform,
        status: 'accepted',
      }).distinct('problemTitle');
      console.log(`[${platform}] Found ${uniqueProblems.length} unique accepted problems from submissions`);
      // Update totalSolved from actual submission records for Codeforces
      updateObj['platformProfiles.codeforces.totalSolved'] = uniqueProblems.length;
    } else if (platform === 'leetcode') {
      // For LeetCode, use the API-provided aggregate count directly
      console.log(`[${platform}] Using aggregated totalSolved from LeetCode API: ${profile.totalSolved}`);
    }

    // Apply the platform profile updates to the User model
    console.log(`[${platform}] Updating user ${userId} with:`, JSON.stringify(updateObj));
    const updatedUser = await User.findByIdAndUpdate(userId, updateObj, { new: true });
    console.log(`[${platform}] User update result:`, updatedUser ? 'success' : 'FAILED - null result');
    if (updatedUser) {
      console.log(`[${platform}] Updated user platformProfiles.leetcode:`, JSON.stringify(updatedUser.platformProfiles?.leetcode));
    }

    // Update integration account
    await IntegrationAccount.updateOne(
      { userId, platform },
      {
        connectionStatus: 'connected',
        bootstrapStatus: 'completed',
        connectedAt: new Date(),
        lastSyncAt: new Date(),
        errorMessage: null,
      }
    );

    // Calculate total problems across platforms
    // For LeetCode: use profile.totalSolved (API aggregate - most accurate)
    // For Codeforces: count distinct problems from submissions
    let leetcodeCount = 0;
    let codeforcesCount = 0;

    // Get current user to check both platforms
    const user = await User.findById(userId);
    if (user?.platformProfiles?.leetcode?.connected) {
      leetcodeCount = user.platformProfiles.leetcode.totalSolved || 0;
    }
    if (user?.platformProfiles?.codeforces?.connected) {
      const codeforcesProblems = await ExternalPlatformSubmission.find({
        userId,
        platform: 'codeforces',
        status: 'accepted',
      }).distinct('problemTitle');
      codeforcesCount = codeforcesProblems.length;
    }

    const totalUniqueProblems = leetcodeCount + codeforcesCount;

    console.log(`[${platform}] Total unique problems solved: LeetCode=${leetcodeCount}, Codeforces=${codeforcesCount}, Total=${totalUniqueProblems}`);
    
    await User.findByIdAndUpdate(userId, {
      totalProblemsCount: totalUniqueProblems,
    });

    // Log successful sync
    const endTime = new Date();
    syncLog = await IntegrationSyncLog.create({
      userId,
      platform,
      status: 'success',
      recordsFetched: submissions.length,
      recordsInserted,
      recordsDuplicated,
      startTime,
      endTime,
      durationMs: endTime - startTime,
    });

    console.log(`[${platform}] Bootstrap completed for ${username}`);
    console.log(`  - Records fetched: ${submissions.length}`);
    console.log(`  - Records inserted: ${recordsInserted}`);
    console.log(`  - Records duplicated: ${recordsDuplicated}`);

    return {
      success: true,
      status: 'completed',
      recordsFetched: submissions.length,
      recordsInserted,
    };
  } catch (error) {
    console.error(`[${platform}] Bootstrap failed for ${username}:`, error.message);

    // Update integration account with error
    const endTime = new Date();
    await IntegrationAccount.updateOne(
      { userId, platform },
      {
        bootstrapStatus: 'failed',
        connectionStatus: 'failed',
        errorMessage: error.message,
      }
    );

    // Log failed sync
    syncLog = await IntegrationSyncLog.create({
      userId,
      platform,
      status: 'failed',
      recordsFetched: 0,
      recordsInserted: 0,
      startTime,
      endTime,
      durationMs: endTime - startTime,
      errorMessage: error.message,
    });

    return {
      success: false,
      status: 'failed',
      error: error.message,
    };
  }
}

/**
 * Trigger background sync without blocking the request
 * Uses setImmediate for non-blocking execution
 */
function bootstrapAsync(userId, platform, username) {
  setImmediate(async () => {
    try {
      await bootstrap(userId, platform, username);
    } catch (error) {
      console.error('Unhandled error in async bootstrap:', error);
    }
  });
}

export { bootstrap, bootstrapAsync };
