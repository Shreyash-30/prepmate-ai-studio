/**
 * Direct Test of Question Generation Endpoint
 * Shows exactly what's happening
 */

import axios from 'axios';

const API_URL = 'http://localhost:8000';
const email = 'shreyash@gmail.com';
const password = '123456';

async function test() {
  try {
    // Step 1: Login
    console.log('1. Logging in...');
    const loginResp = await axios.post(`${API_URL}/api/auth/login`, { email, password });
    const token = loginResp.data.token;
    const userId = loginResp.data.user._id;
    
    console.log(`✅ Login successful. Token: ${token.substring(0, 30)}...`);
    console.log(`   User ID: ${userId}\n`);

    // Step 2: Get topics
    console.log('2. Fetching topics...');
    const topicsResp = await axios.get(`${API_URL}/api/practice/topics`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    const topics = topicsResp.data.data || topicsResp.data.topics || topicsResp.data;
    console.log(`✅ Found ${topics.length} topics\n`);

    const topicId = topics[0]?.topicId || 'arrays';
    console.log(`3. Generating questions for topic: ${topicId}`);
    console.log(`   Endpoint: POST /api/practice/topics/${topicId}/generate-questions`);
    console.log(`   Payload: { limit: 3 }`);
    console.log(`   Auth: Bearer ${token.substring(0, 30)}...\n`);

    // Step 3: Generate questions
    const generateResp = await axios.post(
      `${API_URL}/api/practice/topics/${topicId}/generate-questions`,
      { limit: 3 },
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );

    console.log('\n✅ RESPONSE RECEIVED:\n');
    console.log(JSON.stringify(generateResp.data, null, 2));

    // Detailed analysis
    const data = generateResp.data.data || generateResp.data;
    
    console.log('\n📊 ANALYSIS:\n');
    console.log(`Success: ${data.success ? '✅ YES' : '❌ NO'}`);
    console.log(`Source: ${data.source || 'unknown'}`);
    console.log(`Topic: ${data.topic}`);
    console.log(`Difficulty: ${data.recommendedDifficulty}`);
    console.log(`Questions Generated: ${data.questions?.length || 0}`);
    
    if (!data.success && data.message) {
      console.log(`\n⚠️ ERROR MESSAGE:\n${data.message}`);
    }

  } catch (error) {
    console.error('\n❌ ERROR:\n');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

test();
