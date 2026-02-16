/**
 * Test if backend can reach AI service (from backend environment)
 */

import axios from 'axios';

async function testBackendCanReachAI() {
  console.log('Testing if backend Node process can reach AI service...\n');
  
  try {
    console.log('🔄 Attempting to reach AI service health endpoint...');
    const response = await axios.get('http://localhost:8001/ai/health', { timeout: 5000 });
    
    console.log('✅ SUCCESS! Backend CAN reach AI service');
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data)}`);
    
  } catch (error) {
    console.log('❌ FAILED! Backend CANNOT reach AI service');
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
    }
  }
  
  // Also test with direct fetch call
  try {
    console.log('\n🔄 Attempting direct fetch call...');
    const response = await fetch('http://localhost:8001/');
    console.log(`✅ Fetch test: ${response.status}`);
  } catch (error) {
    console.log(`❌ Fetch test failed: ${error.message}`);
  }
}

testBackendCanReachAI();
