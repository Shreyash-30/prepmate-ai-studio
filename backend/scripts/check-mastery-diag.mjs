import { MongoClient } from 'mongodb';

async function diagnostics() {
  const uri = 'mongodb://localhost:27017/prepmate-ai-studio';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('prepmate-ai-studio');

    console.log('🔍 DIAGNOSTIC CHECK FOR jay@gmail.com\n');

    // Find user
    const user = await db.collection('users').findOne({ 
      email: 'jay@gmail.com' 
    });

    if (!user) {
      console.log('❌ User jay@gmail.com not found');
      console.log('\nAll users in database:');
      const allUsers = await db.collection('users').find().toArray();
      allUsers.forEach(u => console.log(`  - ${u.email} (ID: ${u._id})`));
      return;
    }

    console.log(`✅ User Found: ${user.email}`);
    console.log(`   ID: ${user._id}\n`);

    // Check mastery collection
    console.log('📊 CHECKING MASTERY COLLECTION:\n');
    
    const masteryCount = await db.collection('topic_mastery').countDocuments();
    console.log(`Total mastery documents in DB: ${masteryCount}`);

    const userMastery = await db.collection('topic_mastery')
      .find({ userId: user._id })
      .toArray();

    console.log(`Mastery documents for this user: ${userMastery.length}`);

    if (userMastery.length > 0) {
      console.log('\n📈 MASTERY DATA:\n');
      console.log('┌──────────────────────┬──────────┬────────────┐');
      console.log('│ Topic                │ Mastery  │ Confidence │');
      console.log('├──────────────────────┼──────────┼────────────┤');

      let total = 0;
      userMastery.forEach(m => {
        const topic = m.topicId.padEnd(20);
        const masteryPct = (m.mastery_probability * 100).toFixed(1).padStart(7) + '%';
        const confidence = (m.confidence_score * 100).toFixed(1).padStart(8) + '%';
        console.log(`│ ${topic} │ ${masteryPct} │ ${confidence} │`);
        total += m.mastery_probability;
      });

      console.log('├──────────────────────┼──────────┼────────────┤');
      const avgMastery = (total / userMastery.length * 100).toFixed(1);
      console.log(`│ OVERALL AVERAGE      │ ${avgMastery.padStart(7)}% │            │`);
      console.log('└──────────────────────┴──────────┴────────────┘\n');
    } else {
      console.log('\n❌ No mastery profiles found for this user');
      console.log('\n🔎 Sample mastery documents in DB:');
      const samples = await db.collection('topic_mastery').find().limit(2).toArray();
      if (samples.length > 0) {
        samples.forEach(s => {
          console.log(`   - userId: ${s.userId}, topicId: ${s.topicId}`);
        });
      } else {
        console.log('   No mastery documents in collection');
      }
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

diagnostics();
