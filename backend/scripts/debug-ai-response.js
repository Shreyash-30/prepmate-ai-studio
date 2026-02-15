/**
 * Debug AI Service Response
 * Logs full response including headers and status
 */

import axios from 'axios';

const AI_SERVICE_URL = 'http://localhost:8001';

async function main() {
  try {
    const masteryPayload = {
      user_id: 'test-001',
      topic_id: 'arrays_easy',
      attempts: [
        { correct: true, difficulty: 1, hints_used: 0, time_ms: 8000 },
        { correct: true, difficulty: 1, hints_used: 0, time_ms: 7000 },
      ],
      learning_level: 'intermediate',
    };

    console.log('Sending mastery update to AI service...\n');
    console.log('URL:', `${AI_SERVICE_URL}/ai/ml/mastery/update`);
    console.log('Payload:', JSON.stringify(masteryPayload, null, 2));
    console.log('\n---Response---\n');

    const response = await axios.post(
      `${AI_SERVICE_URL}/ai/ml/mastery/update`,
      masteryPayload,
      { 
        validateStatus: () => true // Don't throw on any status code
      }
    );

    console.log('Status Code:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Data:', JSON.stringify(response.data, null, 2));
    console.log('Data Type:', typeof response.data);
    console.log('Is String:', typeof response.data === 'string');
    console.log('Is Object:', typeof response.data === 'object');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

main();
