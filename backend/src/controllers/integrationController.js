import IntegrationAccount from '../models/IntegrationAccount.js';
import ExternalPlatformProfile from '../models/ExternalPlatformProfile.js';
import ExternalPlatformSubmission from '../models/ExternalPlatformSubmission.js';
import User from '../models/User.js';
import { bootstrapAsync } from '../services/integrationBootstrapService.js';

/**
 * POST /api/integrations/connect
 * Connect a new platform account
 */
async function connect(req, res) {
  try {
    const { platform, username } = req.body;
    const userId = req.user.id; // Assuming auth middleware sets req.user

    // Validation
    if (!platform || !username) {
      return res.status(400).json({
        success: false,
        message: 'Platform and username are required',
      });
    }

    if (!['leetcode', 'codeforces'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform. Supported platforms: leetcode, codeforces',
      });
    }

    if (username.length < 1 || username.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Username must be between 1 and 100 characters',
      });
    }

    // Create or update integration account with pending status
    const account = await IntegrationAccount.findOneAndUpdate(
      { userId, platform },
      {
        userId,
        platform,
        username,
        connectionStatus: 'pending',
        bootstrapStatus: 'pending',
        errorMessage: null,
      },
      { upsert: true, new: true }
    );

    // Trigger async bootstrap (non-blocking)
    bootstrapAsync(userId, platform, username);

    return res.status(200).json({
      success: true,
      message: 'Integration started. Syncing in background...',
      data: {
        platform,
        username,
        connectionStatus: account.connectionStatus,
        bootstrapStatus: account.bootstrapStatus,
      },
    });
  } catch (error) {
    console.error('Error in connect:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate connection',
      error: error.message,
    });
  }
}

/**
 * GET /api/integrations/status
 * Get all integrations and their status for the user
 */
async function getStatus(req, res) {
  try {
    const userId = req.user.id;

    const accounts = await IntegrationAccount.find({ userId }).select(
      'platform username connectionStatus bootstrapStatus lastSyncAt errorMessage connectedAt'
    );

    // Enrich with profile data
    const statusData = await Promise.all(
      accounts.map(async (account) => {
        const profile = await ExternalPlatformProfile.findOne({
          userId,
          platform: account.platform,
        }).select('totalSolved acceptanceRate lastFetchedAt');

        return {
          platform: account.platform,
          username: account.username,
          connectionStatus: account.connectionStatus,
          bootstrapStatus: account.bootstrapStatus,
          lastSyncAt: account.lastSyncAt,
          errorMessage: account.errorMessage,
          connectedAt: account.connectedAt,
          profile: profile
            ? {
                totalSolved: profile.totalSolved,
                acceptanceRate: profile.acceptanceRate,
                lastFetchedAt: profile.lastFetchedAt,
              }
            : null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: statusData,
    });
  } catch (error) {
    console.error('Error in getStatus:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch integration status',
      error: error.message,
    });
  }
}

/**
 * POST /api/integrations/resync/:platform
 * Manually trigger a resync for a specific platform
 */
async function resync(req, res) {
  try {
    const { platform } = req.params;
    const userId = req.user.id;

    if (!['leetcode', 'codeforces'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform. Supported platforms: leetcode, codeforces',
      });
    }

    const account = await IntegrationAccount.findOne({ userId, platform });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: `No ${platform} account connected`,
      });
    }

    // Trigger async resync
    integrationBootstrapService.bootstrapAsync(userId, platform, account.username);

    return res.status(200).json({
      success: true,
      message: `Resync initiated for ${platform}`,
      data: {
        platform,
        username: account.username,
      },
    });
  } catch (error) {
    console.error('Error in resync:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate resync',
      error: error.message,
    });
  }
}

/**
 * DELETE /api/integrations/:platform
 * Disconnect a platform account
 */
async function disconnect(req, res) {
  try {
    const { platform } = req.params;
    const userId = req.user.id;

    if (!['leetcode', 'codeforces'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform',
      });
    }

    // Delete integration account
    const result = await IntegrationAccount.deleteOne({ userId, platform });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: `No ${platform} account found`,
      });
    }

    // Update User model to disconnect platform
    const platformKey = platform === 'leetcode' ? 'leetcode' : 'codeforces';
    const updateObj = {
      [`platformProfiles.${platformKey}.connected`]: false,
      [`platformProfiles.${platformKey}.username`]: null,
      [`platformProfiles.${platformKey}.totalSolved`]: 0,
      [`platformProfiles.${platformKey}.lastSyncedAt`]: null,
    };

    // Recalculate total problems count
    const leetcodeCount = await ExternalPlatformSubmission.countDocuments({
      userId,
      platform: 'leetcode',
      status: 'accepted',
    });

    const codeforcesCount = await ExternalPlatformSubmission.countDocuments({
      userId,
      platform: 'codeforces',
      status: 'accepted',
    });

    const totalCount = platform === 'leetcode' ? codeforcesCount : leetcodeCount;
    updateObj['totalProblemsCount'] = totalCount;

    await User.findByIdAndUpdate(userId, updateObj);

    // Optionally delete profile and submissions data (keeping for history)
    // await ExternalPlatformProfile.deleteOne({ userId, platform });
    // await ExternalPlatformSubmission.deleteMany({ userId, platform });

    return res.status(200).json({
      success: true,
      message: `Successfully disconnected from ${platform}`,
    });
  } catch (error) {
    console.error('Error in disconnect:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to disconnect',
      error: error.message,
    });
  }
}

/**
 * GET /api/integrations/check-connection
 * Check if user has connected integrations and get status details
 */
async function checkConnection(req, res) {
  try {
    const userId = req.user.id;

    // Check LeetCode connection
    const leetcodeAccount = await IntegrationAccount.findOne({
      userId,
      platform: 'leetcode'
    });

    let connectionData = {
      leetcode: {
        isConnected: false,
        username: null,
        submissionCount: 0,
        connectionStatus: null,
        bootstrapStatus: null,
        lastSyncAt: null,
        connectedAt: null
      }
    };

    if (leetcodeAccount) {
      const submissionCount = await ExternalPlatformSubmission.countDocuments({
        userId,
        platform: 'leetcode'
      });

      connectionData.leetcode = {
        isConnected: leetcodeAccount.connectionStatus === 'connected',
        username: leetcodeAccount.username,
        submissionCount: submissionCount,
        connectionStatus: leetcodeAccount.connectionStatus,
        bootstrapStatus: leetcodeAccount.bootstrapStatus,
        lastSyncAt: leetcodeAccount.lastSyncAt,
        connectedAt: leetcodeAccount.connectedAt
      };
    }

    return res.status(200).json({
      success: true,
      data: connectionData
    });
  } catch (error) {
    console.error('Error in checkConnection:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check connection',
      error: error.message,
    });
  }
}

export { connect, getStatus, resync, disconnect, checkConnection };
