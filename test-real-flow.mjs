/**
 * Test the COMPLETE flow of question generation like a browser would
 * Including authentication, request, and response parsing
 */

import axios from 'axios';

const BACKEND_URL = 'http://localhost:8000';

async function testRealFlow() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING COMPLETE QUESTION GENERATION FLOW');
  console.log('='.repeat(80));

  try {
    // Step 1: Get the firstuser from database (simulate a real user)
    console.log('\n📊 Step 1: Finding user in database...');
    const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email: 'shreyash@gmail.com',
      password: '123456'
    });
    
    if (!loginResponse.data.token) {
      throw new Error('No token in login response');
    }
    
    const token = loginResponse.data.token;
    const userId = loginResponse.data.user._id;
    console.log(`✅ Logged in successfully`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Token length: ${token.length} chars`);

    // Step 2: Get topics to find a valid topicId
    console.log('\n📊 Step 2: Getting available topics...');
    const topicsResponse = await axios.get(`${BACKEND_URL}/api/practice/topics`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const topics = topicsResponse.data.data;
    console.log(`✅ Found ${topics.length} topics`);
    
    if (topics.length === 0) {
      throw new Error('No topics found in database');
    }

    // Use first topic
    const topic = topics[0];
    const topicId = topic.topicId;
    console.log(`   Using topic: ${topic.name} (${topicId})`);

    // Step 3: Call the generate-questions endpoint
    console.log('\n📊 Step 3: Calling question generation endpoint...');
    console.log(`   Endpoint: POST /api/practice/topics/${topicId}/generate-questions?limit=5`);
    console.log(`   Token: Bearer ${token.substring(0, 20)}...`);
    
    const generateResponse = await axios.post(
      `${BACKEND_URL}/api/practice/topics/${topicId}/generate-questions?limit=5`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 40000
      }
    );

    console.log('\n✅ RESPONSE RECEIVED FROM BACKEND');
    console.log(`   Status: ${generateResponse.status}`);
    console.log(`   Response keys: ${Object.keys(generateResponse.data).join(', ')}`);
    console.log(`   Response.data keys: ${Object.keys(generateResponse.data.data || {}).join(', ')}`);
    
    const data = generateResponse.data;
    console.log('\n📋 FULL RESPONSE STRUCTURE:');
    console.log(JSON.stringify(data, null, 2));

    // Step 4: Analyze the response like the frontend would
    console.log('\n📊 Step 4: Frontend response parsing...');
    const questionsData = data.data?.questions || data.questions || [];
    console.log(`   Questions extracted: ${questionsData.length}`);
    console.log(`   Questions is array: ${Array.isArray(questionsData)}`);
    
    if (questionsData.length > 0) {
      console.log(`   ✅ First question: ${questionsData[0].problemTitle || 'Unknown'}`);
    } else {
      console.log(`   ❌ No questions found in response`);
      console.log(`   Response.data.data: ${JSON.stringify(data.data, null, 2)}`);
    }

    // Step 5: Summary
    console.log('\n' + '='.repeat(80));
    if (data.success && questionsData.length > 0) {
      console.log('✅ SUCCESS! Complete flow is working correctly');
      console.log(`   Generated: ${questionsData.length} questions`);
      console.log(`   Source: ${data.data?.source}`);
    } else {
      console.log('❌ ISSUE DETECTED');
      console.log(`   Success: ${data.success}`);
      console.log(`   Questions: ${questionsData.length}`);
      console.log(`   Error message: ${data.data?.message}`);
      console.log(`   Response source: ${data.data?.source}`);
    }
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR DURING TEST');
    console.error(`   Message: ${error.message}`);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Response data:`, error.response?.data);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
  }
}

testRealFlow();
