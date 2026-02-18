import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

try {
  const res = await axios.get(`${API_BASE}/practice/topics`);
  console.log('Available Topics:');
  res.data.data.forEach(t => {
    console.log(`  - topicId: "${t.topicId}", name: "${t.name}"`);
  });
} catch (err) {
  console.error('Error:', err.message);
}
