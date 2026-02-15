#!/usr/bin/env node

/**
 * Integration Test Script
 * Tests the complete flow: Login → Connect LeetCode → Check Status → Verify Data
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';
const api = axios.create({ baseURL: API_BASE_URL });

// Test credentials
const TEST_EMAIL = 'inttest@example.com';
const TEST_PASSWORD = 'testpass123';
const TEST_LEETCODE_USERNAME = 'ramdayal'; // Public LeetCode user for testing
const TEST_CODEFORCES_USERNAME = 'tourist'; // Public Codeforces user for testing

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function test() {
  try {
    console.log('🚀 Starting Integration Test\n');

    // Step 1: Signup
    console.log('Step 1: Creating test user...');
    let signupResponse;
    try {
      signupResponse = await api.post('/auth/signup', {
        name: 'Integration Tester',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('  ℹ User already exists, logging in instead...');
        signupResponse = await api.post('/auth/login', {
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        });
      } else {
        throw error;
      }
    }

    const token = signupResponse.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    const userId = signupResponse.data.user.id;
    console.log('  ✓ User ready:', TEST_EMAIL, '\n');

    // Step 2: Connect LeetCode
    console.log(`Step 2: Connecting LeetCode account (${TEST_LEETCODE_USERNAME})...`);
    const connectResponse = await api.post('/integrations/connect', {
      platform: 'leetcode',
      username: TEST_LEETCODE_USERNAME,
    });
    console.log('  ✓ Connection initiated');
    console.log('    - Status:', connectResponse.data.data.connectionStatus);
    console.log('    - Bootstrap Status:', connectResponse.data.data.bootstrapStatus, '\n');

    // Step 3: Poll status until sync completes
    console.log('Step 3: Waiting for sync to complete...');
    let statusResponse;
    let attempts = 0;
    const maxAttempts = 30; // 45 seconds with 1.5s interval

    while (attempts < maxAttempts) {
      await sleep(1500);
      statusResponse = await api.get('/integrations/status');
      const leetcodeIntegration = statusResponse.data.data.find((i) => i.platform === 'leetcode');

      if (leetcodeIntegration) {
        process.stdout.write(
          `\r    Attempt ${attempts + 1}/${maxAttempts} - Status: ${leetcodeIntegration.bootstrapStatus}`
        );

        if (leetcodeIntegration.bootstrapStatus === 'completed') {
          console.log('\n  ✓ Sync completed successfully\n');
          break;
        } else if (leetcodeIntegration.bootstrapStatus === 'failed') {
          throw new Error(`Sync failed: ${leetcodeIntegration.errorMessage}`);
        }
      }

      attempts++;
    }

    if (attempts === maxAttempts) {
      throw new Error('Sync timeout - exceeded 45 seconds');
    }

    // Step 4: Verify data was stored
    console.log('Step 4: Verifying stored data...');
    const profileResponse = await api.get('/auth/profile');
    const userData = profileResponse.data.user;

    console.log('  ✓ User profile retrieved');
    console.log('    - Total Problems Solved:', userData.totalProblemsCount);
    console.log('    - LeetCode Connected:', userData.platformProfiles.leetcode.connected);
    console.log('    - LeetCode Problems:', userData.platformProfiles.leetcode.totalSolved);
    console.log('    - LeetCode Acceptance Rate:', userData.platformProfiles.leetcode.acceptanceRate + '%');
    console.log(
      '    - Last Synced:',
      new Date(userData.platformProfiles.leetcode.lastSyncedAt).toLocaleString()
    );

    // Verify data
    if (
      !userData.platformProfiles.leetcode.connected ||
      userData.platformProfiles.leetcode.totalSolved === 0
    ) {
      throw new Error('LeetCode data not properly synced');
    }

    console.log('\n  ✓ All data verified successfully\n');

    // Step 5: Test Codeforces (optional)
    console.log(`Step 5: Connecting Codeforces account (${TEST_CODEFORCES_USERNAME})...`);
    const cfConnectResponse = await api.post('/integrations/connect', {
      platform: 'codeforces',
      username: TEST_CODEFORCES_USERNAME,
    });
    console.log('  ✓ Connection initiated\n');

    // Wait for Codeforces sync
    console.log('Step 6: Waiting for Codeforces sync...');
    attempts = 0;
    while (attempts < maxAttempts) {
      await sleep(1500);
      statusResponse = await api.get('/integrations/status');
      const cfIntegration = statusResponse.data.data.find((i) => i.platform === 'codeforces');

      if (cfIntegration) {
        process.stdout.write(
          `\r    Attempt ${attempts + 1}/${maxAttempts} - Status: ${cfIntegration.bootstrapStatus}`
        );

        if (cfIntegration.bootstrapStatus === 'completed') {
          console.log('\n  ✓ Codeforces sync completed\n');
          break;
        }
      }

      attempts++;
    }

    // Step 7: Check final stats
    console.log('Step 7: Final verification...');
    const finalProfile = await api.get('/auth/profile');
    const finalData = finalProfile.data.user;

    console.log('  ✓ Final stats:');
    console.log('    - Total Problems Solved (Both Platforms):', finalData.totalProblemsCount);
    console.log('    - LeetCode Problems:', finalData.platformProfiles.leetcode.totalSolved);
    console.log('    - Codeforces Problems:', finalData.platformProfiles.codeforces.totalSolved);

    console.log('\n✅ All tests passed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response?.data) {
      console.error('  Response:', error.response.data);
    } else {
      console.error('  Error:', error.message);
    }
    process.exit(1);
  }
}

// Run tests
test();
