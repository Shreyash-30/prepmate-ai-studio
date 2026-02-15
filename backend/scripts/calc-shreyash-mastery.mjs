import { MongoClient } from 'mongodb';
import http from 'http';

async function calculateMastery() {
  const mongoUri = 'mongodb://localhost:27017/prepmate-ai-studio';
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db('prepmate-ai-studio');

    // Get shreyash
    const user = await db.collection('users').findOne({
      email: 'shreyash@gmail.com'
    });

    console.log('🚀 TRIGGERING MASTERY CALCULATION FOR SHREYASH\n');
    console.log(`Email: ${user.email}`);
    console.log(`User ID: ${user._id}\n`);

    // Get submissions
    const submissions = await db.collection('externalplatformsubmissions')
      .find({ userId: user._id })
      .toArray();

    console.log(`Found: ${submissions.length} submissions\n`);

    if (submissions.length === 0) {
      console.log('❌ No submissions found');
      return;
    }

    // Group submissions by topics
    const topicMap = {};
    submissions.forEach(sub => {
      const tags = sub.tags || [];
      tags.forEach(tag => {
        const topicId = tag.toLowerCase().replace(/\s+/g, '_');
        if (!topicMap[topicId]) {
          topicMap[topicId] = [];
        }
        topicMap[topicId].push({
          correct: sub.status === 'accepted',
          difficulty: sub.difficultyLevel || 1,
          hints_used: 0,
          time_ms: sub.runtime_ms || 0
        });
      });
    });

    console.log(`Topics identified: ${Object.keys(topicMap).length}\n`);

    // Call AI service for each topic
    let masteryCount = 0;
    for (const [topicId, attempts] of Object.entries(topicMap)) {
      if (attempts.length === 0) continue;

      console.log(`📡 Calculating mastery for: ${topicId} (${attempts.length} attempts)...`);

      const payload = {
        user_id: user._id.toString(),
        topic_id: topicId,
        attempts: attempts,
        learning_level: "intermediate"
      };

      const result = await callAIService('http://localhost:8001/ai/ml/mastery/update', payload);
      
      if (result.success) {
        console.log(`   ✅ Mastery: ${(result.data.mastery_probability * 100).toFixed(1)}%\n`);
        masteryCount++;
      } else {
        console.log(`   ❌ Error: ${result.error}\n`);
      }
    }

    console.log(`\n✅ COMPLETE: ${masteryCount} mastery profiles calculated\n`);

    // Now check the profiles in database
    const mastery = await db.collection('topic_mastery')
      .find({ userId: user._id })
      .toArray();

    if (mastery.length > 0) {
      console.log('📊 MASTERY PROFILES IN DATABASE:\n');
      console.log('┌──────────────────────┬──────────┬────────────┐');
      console.log('│ Topic                │ Mastery  │ Confidence │');
      console.log('├──────────────────────┼──────────┼────────────┤');

      let total = 0;
      mastery.forEach(m => {
        const topic = m.topicId.padEnd(20);
        const masteryPct = (m.mastery_probability * 100).toFixed(1).padStart(7) + '%';
        const confidence = (m.confidence_score * 100).toFixed(1).padStart(8) + '%';
        console.log(`│ ${topic} │ ${masteryPct} │ ${confidence} │`);
        total += m.mastery_probability;
      });

      console.log('├──────────────────────┼──────────┼────────────┤');
      const avgMastery = (total / mastery.length * 100).toFixed(1);
      console.log(`│ OVERALL AVERAGE      │ ${avgMastery.padStart(7)}% │            │`);
      console.log('└──────────────────────┴──────────┴────────────┘\n');
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

function callAIService(url, payload) {
  return new Promise((resolve) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 200 && json.success) {
            resolve({ success: true, data: json.data });
          } else {
            resolve({ success: false, error: json.detail || 'Unknown error' });
          }
        } catch (e) {
          resolve({ success: false, error: e.message });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ success: false, error: e.message });
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

calculateMastery();
