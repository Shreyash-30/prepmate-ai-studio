import { MongoClient } from 'mongodb';
import fetch from 'node-fetch';

async function triggerMasteryCalculation() {
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
    console.log(`User ID: ${user._id}`);
    console.log(`Email: ${user.email}\n`);

    // Get submissions
    const submissions = await db.collection('externalplatformsubmissions')
      .find({ userId: user._id })
      .toArray();

    console.log(`Found: ${submissions.length} submissions\n`);

    if (submissions.length === 0) {
      console.log('❌ No submissions found for this user');
      return;
    }

    // Call AI service to trigger mastery calculation
    console.log('📡 Calling AI Service (http://localhost:8001)...\n');

    const response = await fetch('http://localhost:8001/ai/ml/mastery/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: user._id.toString(),
        email: user.email
      })
    });

    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ Mastery calculation triggered!');
      console.log('Waiting for calculation...\n');

      // Wait a bit and check database
      await new Promise(resolve => setTimeout(resolve, 3000));

      const mastery = await db.collection('topic_mastery')
        .find({ userId: user._id })
        .toArray();

      console.log(`\n📊 MASTERY PROFILES GENERATED: ${mastery.length}\n`);
      
      if (mastery.length > 0) {
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
    } else {
      console.log('❌ Error calling AI service');
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

triggerMasteryCalculation();
