/**
 * Debug Login Response
 */

import axios from 'axios';

const API_BASE = 'http://localhost:8000';

async function main() {
  try {
    console.log('Login attempt for jay@gmail.com...\n');
    
    const response = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'jay@gmail.com',
      password: '123456',
    });

    console.log('Full Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\nResponse keys:');
    Object.keys(response.data).forEach(key => {
      console.log(`  - ${key}: ${typeof response.data[key]}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response?.data) {
      console.log('Error Response:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

main();
