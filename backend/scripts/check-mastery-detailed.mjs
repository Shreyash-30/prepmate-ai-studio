import { MongoClient, ObjectId } from 'mongodb';

async function diagnostics() {
  const uri = 'mongodb://localhost:27017/prepmate-ai-studio';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('prepmate-ai-studio');

    console.log('🔍 DETAILED TYPE CHECK\n');

    // Find user
    const user = await db.collection('users').findOne({ 
      email: 'jay@gmail.com' 
    });

    console.log(`User._id type: ${typeof user._id}, Value: ${user._id}`);

    // Get first mastery doc
    const firstMastery = await db.collection('topic_mastery').findOne();
    console.log(`Mastery.userId type: ${typeof firstMastery.userId}, Value: ${firstMastery.userId}`);
    
    // Try different query approaches
    console.log('\n📊 TRYING DIFFERENT QUERY APPROACHES:\n');

    // Method 1: Direct ObjectId
    const m1 = await db.collection('topic_mastery')
      .find({ userId: user._id })
      .toArray();
    console.log(`1. Query with user._id: ${m1.length} results`);

    // Method 2: String comparison
    const m2 = await db.collection('topic_mastery')
      .find({ userId: user._id.toString() })
      .toArray();
    console.log(`2. Query with user._id.toString(): ${m2.length} results`);

    // Method 3: No filter, just get all
    const m3 = await db.collection('topic_mastery')
      .find({})
      .toArray();
    console.log(`3. Query with no filter: ${m3.length} results`);

    if (m3.length > 0) {
      console.log('\n📈 ALL MASTERY DOCUMENTS:\n');
      console.log('┌──────────────────────┬──────────┬────────────┐');
      console.log('│ Topic                │ Mastery  │ Confidence │');
      console.log('├──────────────────────┼──────────┼────────────┤');

      let total = 0;
      m3.forEach(m => {
        const topic = m.topicId.padEnd(20);
        const masteryPct = (m.mastery_probability * 100).toFixed(1).padStart(7) + '%';
        const confidence = (m.confidence_score * 100).toFixed(1).padStart(8) + '%';
        console.log(`│ ${topic} │ ${masteryPct} │ ${confidence} │`);
        total += m.mastery_probability;
      });

      console.log('├──────────────────────┼──────────┼────────────┤');
      const avgMastery = (total / m3.length * 100).toFixed(1);
      console.log(`│ OVERALL AVERAGE      │ ${avgMastery.padStart(7)}% │            │`);
      console.log('└──────────────────────┴──────────┴────────────┘\n');
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

diagnostics();
