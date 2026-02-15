const axios = require('axios');

const testLeetCodeREST = async () => {
  try {
    console.log('Testing LeetCode REST API endpoints...\n');
    
    const endpoints = [
      {
        name: 'User profile REST',
        url: 'https://leetcode.com/api/users/shreyashshinde3011/',
        method: 'GET'
      },
      {
        name: 'User submissions',
        url: 'https://leetcode.com/api/users/shreyashshinde3011/submissions/',
        method: 'GET'
      },
      {
        name: 'Recent submissions',
        url: 'https://leetcode-api.p.rapidapi.com/user/shreyashshinde3011',
        method: 'GET',
        headers: {
          // Note: public endpoint, may not need auth
        }
      }
    ];

    for (const endpoint of endpoints) {
      console.log(`\nTrying: ${endpoint.name}`);
      console.log(`URL: ${endpoint.url}`);
      
      try {
        const config = {
          method: endpoint.method,
          url: endpoint.url,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            ...endpoint.headers
          },
          timeout: 10000
        };

        const response = await axios(config);
        console.log('✅ Success! Status:', response.status);
        
        // Show first 500 chars of data
        const dataStr = JSON.stringify(response.data, null, 2);
        const preview = dataStr.substring(0, 800);
        console.log('Data preview:');
        console.log(response.status === 200 ? preview : 'Response received');
        
      } catch (error) {
        const statusCode = error.response?.status || 'N/A';
        const errorMsg = error.response?.data?.message || error.message;
        console.log(`❌ Failed: ${statusCode} - ${errorMsg}`);
      }
    }

  } catch (error) {
    console.error('Fatal error:', error.message);
  }
};

testLeetCodeREST();
