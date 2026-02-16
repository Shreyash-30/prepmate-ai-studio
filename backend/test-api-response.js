import axios from 'axios';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'your_jwt_secret_key_here';
const userId = '69920618261497b26786c42c';
const token = jwt.sign({userId}, JWT_SECRET, {expiresIn: '24h'});

const res = await axios.get('http://localhost:8000/api/practice/recommendations', {
  headers: { Authorization: 'Bearer ' + token }
});

const topics = res.data.data;
console.log('✅ API Response - First 3 Topics:\n');
topics.slice(0, 3).forEach((t, i) => {
  const masteryPercent = Math.round(t.masteryScore * 100);
  const readinessPercent = Math.round(t.progressionReadinessScore * 100);
  console.log(`[${i+1}] ${t.topic?.name}`);
  console.log(`    masteryScore: ${t.masteryScore} (raw) = ${masteryPercent}%`);
  console.log(`    readinessScore: ${t.progressionReadinessScore} (raw) = ${readinessPercent}%`);
  console.log();
});

process.exit(0);
