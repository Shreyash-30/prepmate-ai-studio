const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const parsed = JSON.parse(data);
    const token = parsed.data.token;
    
    // Now get recommendations
    const req2 = http.request({
      hostname: 'localhost',
      port: 8000,
      path: '/api/practice/recommendations',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
      },
    }, (res2) => {
      let data2 = '';
      res2.on('data', (c) => data2 += c);
      res2.on('end', () => {
        const parsed2 = JSON.parse(data2);
        console.log('Total topics returned:', parsed2.data?.length);
        console.log('First topic:', parsed2.data?.[0]);
      });
    });
    req2.end();
  });
});

req.write(JSON.stringify({ email: 'amar@gmail.com', password: 'password123' }));
req.end();
