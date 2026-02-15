const axios = require('axios');
const fs = require('fs');

const testIntegration = async () => {
  try {
    console.log('=== PrepMate LeetCode Integration Test v2 ===\n');

    // Step 1: Create a test user
    console.log('1. Creating test user...');
    const signupResponse = await axios.post('http://localhost:8000/api/auth/signup', {
      email: 'testlc2@example.com',
      password: 'Test@1234',
      name: 'LC Test User 2'
    });
    
    const user = signupResponse.data.user;
    const token = signupResponse.data.token;
    console.log(`   ✅ User created: ${user._id}`);

    // Step 2: Connect to LeetCode with valid profile
    console.log('\n2. Connecting to LeetCode (shreyashshinde3011)...');
    const connectResponse = await axios.post(
      'http://localhost:8000/api/integrations/connect',
      {
        platform: 'leetcode',
        username: 'shreyashshinde3011'
      },
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    console.log(`   ✅ Response:`, JSON.stringify(connectResponse.data, null, 2));

    // Step 3: Wait for bootstrap to complete
    console.log('\n3. Waiting for data sync (4 seconds)...');
    await new Promise(r => setTimeout(r, 4000));

    // Step 4: Check status - with better error handling
    console.log('\n4. Checking integration status...');
    const statusResponse = await axios.get(
      'http://localhost:8000/api/integrations/status',
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    console.log('   Status Response:', JSON.stringify(statusResponse.data, null, 2));

    if (statusResponse.data && statusResponse.data.length > 0) {
      const integration = statusResponse.data[0];
      console.log(`\n   ✅ Platform: ${integration.platform}`);
      console.log(`   ✅ Username: ${integration.username}`);
      console.log(`   ✅ Connection Status: ${integration.connectionStatus}`);
      console.log(`   ✅ Bootstrap Status: ${integration.bootstrapStatus}`);
      if (integration.externalProfile) {
        console.log(`   ✅ Total Solved: ${integration.externalProfile.totalSolved}`);
        console.log(`   ✅ Acceptance Rate: ${integration.externalProfile.acceptanceRate}%`);
      }
    }

    // Step 5: Check user profile
    console.log('\n5. Checking user profile...');
    const profileResponse = await axios.get(
      'http://localhost:8000/api/auth/profile',
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const profile = profileResponse.data;
    console.log(`   ✅ Total Problems Count: ${profile.totalProblemsCount}`);
    if (profile.platformProfiles?.leetcode) {
      console.log(`   ✅ LeetCode Connected: ${profile.platformProfiles.leetcode.connected}`);
      console.log(`   ✅ LeetCode Total Solved: ${profile.platformProfiles.leetcode.totalSolved}`);
      console.log(`   ✅ LeetCode Acceptance Rate: ${profile.platformProfiles.leetcode.acceptanceRate}%`);
    }

    console.log('\n✅ Integration test completed!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
};

testIntegration();
