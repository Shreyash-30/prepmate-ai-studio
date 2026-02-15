import { MongoClient } from 'mongodb';

async function checkMastery() {
  const uri = 'mongodb://localhost:27017/prepmate-ai-studio';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('prepmate-ai-studio');

    // Find user
    const user = await db.collection('users').findOne({ 
      email: 'jay@gmail.com' 
    });

    if (!user) {
      console.log('❌ User jay@gmail.com not found');
      return;
    }

    console.log('✅ User Found: jay@gmail.com\n');

    // Get mastery profiles
    const mastery = await db.collection('topic_mastery')
      .find({ userId: user._id })
      .toArray();

    if (mastery.length === 0) {
      console.log('⚠️  No mastery profiles found');
      return;
    }

    console.log('📊 TOPIC-WISE MASTERY PROFILES:\n');
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

    console.log(`Total Topics: ${mastery.length}`);
    console.log(`Last Updated: ${mastery[0].updatedAt}`);

  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkMastery();
