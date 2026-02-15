const axios = require('axios');

const testIntegration = async () => {
  try {
    const timestamp = Date.now();
    const email = `testlc${timestamp}@example.com`;

    console.log('=== PrepMate LeetCode Integration Test ===\n');

    // Step 1: Create a test user
    console.log(`1. Creating test user (${email})...`);
    const signupResponse = await axios.post('http://localhost:8000/api/auth/signup', {
      email,
      password: 'Test@1234',
      name: 'LC Test User'
    });
    
    const token = signupResponse.data.token;
    console.log(`   ✅ User created`);

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

    // Step 3: Wait for bootstrap to complete
    console.log('\n3. Waiting for data sync (5 seconds)...');
    await new Promise(r => setTimeout(r, 5000));

    // Step 4: Check status
    console.log('\n4. Checking integration status...');
    const statusResponse = await axios.get(
      'http://localhost:8000/api/integrations/status',
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const data = statusResponse.data.data || [];
    if (data.length === 0) {
      console.log('   ❌ No integrations found');
      return;
    }

    const integration = data[0];
    console.log(`   ✅ Platform: ${integration.platform}`);
    console.log(`   ✅ Username: ${integration.username}`);
    console.log(`   ✅ Connection Status: ${integration.connectionStatus}`);
    console.log(`   ✅ Bootstrap Status: ${integration.bootstrapStatus}`);
    if (integration.externalProfile) {
      console.log(`   ✅ Total Solved: ${integration.externalProfile.totalSolved}`);
      console.log(`   ✅ Acceptance Rate: ${integration.externalProfile.acceptanceRate}%`);
    } else {
      console.log(`   ⚠️  No externalProfile data`);
    }

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
};

testIntegration();
