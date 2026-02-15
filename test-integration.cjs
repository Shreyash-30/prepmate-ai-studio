const axios = require('axios');

const testIntegration = async () => {
  try {
    console.log('=== PrepMate LeetCode Integration Test ===\n');

    // Step 1: Create a test user
    console.log('1. Creating test user...');
    const signupResponse = await axios.post('http://localhost:8000/api/auth/signup', {
      email: 'testlc@example.com',
      password: 'Test@1234',
      name: 'LC Test User'
    });
    
    const user = signupResponse.data.user;
    const token = signupResponse.data.token;
    console.log(`   ✅ User created: ${user._id}`);
    console.log(`   ✅ Token: ${token.substring(0, 30)}...`);

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
    
    console.log(`   ✅ Connection initiated`);
    console.log(`   Response:`, JSON.stringify(connectResponse.data, null, 2));

    // Step 3: Wait for bootstrap to complete
    console.log('\n3. Waiting for data sync (3 seconds)...');
    await new Promise(r => setTimeout(r, 3000));

    // Step 4: Check status
    console.log('\n4. Checking integration status...');
    const statusResponse = await axios.get(
      'http://localhost:8000/api/integrations/status',
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const integration = statusResponse.data[0];
    console.log(`   ✅ Platform: ${integration.platform}`);
    console.log(`   ✅ Username: ${integration.username}`);
    console.log(`   ✅ Connection Status: ${integration.connectionStatus}`);
    console.log(`   ✅ Bootstrap Status: ${integration.bootstrapStatus}`);
    console.log(`   ✅ Total Solved: ${integration.externalProfile?.totalSolved}`);
    console.log(`   ✅ Acceptance Rate: ${integration.externalProfile?.acceptanceRate}%`);
    console.log(`   ✅ Ranking: ${integration.externalProfile?.ranking}`);

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
    console.log(`   ✅ LeetCode Connected: ${profile.platformProfiles?.leetcode?.connected}`);
    console.log(`   ✅ LeetCode Total Solved: ${profile.platformProfiles?.leetcode?.totalSolved}`);
    console.log(`   ✅ LeetCode Acceptance Rate: ${profile.platformProfiles?.leetcode?.acceptanceRate}%`);

    console.log('\n✅ Integration test completed successfully!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
};

testIntegration();
