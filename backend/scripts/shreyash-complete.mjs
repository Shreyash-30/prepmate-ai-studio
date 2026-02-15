import { MongoClient } from 'mongodb';

async function getFullProfile() {
  const uri = 'mongodb://localhost:27017/prepmate-ai-studio';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('prepmate-ai-studio');

    // Get user
    const user = await db.collection('users').findOne({ 
      email: 'shreyash@gmail.com' 
    });

    const userId = user._id;
    const userIdStr = userId.toString();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   SHREYASH@GMAIL.COM - COMPLETE PROFILE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ ACCOUNT INFORMATION');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`  Email:              ${user.email}`);
    console.log(`  Name:               ${user.name}`);
    console.log(`  Account Created:    ${new Date(user.createdAt).toLocaleDateString()}`);
    console.log(`  Last Login:         ${new Date(user.lastLogin).toLocaleDateString()}`);

    console.log('\n✅ LEETCODE INTEGRATION');
    console.log('─────────────────────────────────────────────────────────────');
    const integration = await db.collection('integrationaccounts').findOne({
      userId: userId
    });

    if (integration) {
      console.log(`  Status:             ✅ Connected`);
      console.log(`  Username:           ${integration.username}`);
      console.log(`  Connected At:       ${new Date(integration.connectedAt).toLocaleString()}`);
      console.log(`  Last Synced:        ${integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : 'Never'}`);
    } else {
      console.log(`  Status:             ❌ Not Connected`);
    }

    // Check submissions with multiple query attempts
    console.log('\n✅ SUBMISSIONS DATA');
    console.log('─────────────────────────────────────────────────────────────');

    const subs1 = await db.collection('externalplatformsubmissions').find({
      userId: userId
    }).toArray();
    console.log(`  Query with ObjectId: ${subs1.length} submissions`);

    const subs2 = await db.collection('externalplatformsubmissions').find({
      userId: userIdStr
    }).toArray();
    console.log(`  Query with String:   ${subs2.length} submissions`);

    const allSubsCount = await db.collection('externalplatformsubmissions').countDocuments();
    console.log(`  Total in collection: ${allSubsCount} submissions`);

    if (subs2.length > 0) {
      const difficulties = {};
      subs2.forEach(s => {
        difficulties[s.difficulty] = (difficulties[s.difficulty] || 0) + 1;
      });
      console.log(`\n  Breakdown:`);
      Object.entries(difficulties).forEach(([diff, count]) => {
        console.log(`    - ${diff}: ${count}`);
      });
    }

    // Mastery profiles
    console.log('\n✅ MASTERY PROFILES');
    console.log('─────────────────────────────────────────────────────────────');

    const mastery1 = await db.collection('topic_mastery').find({
      userId: userId
    }).toArray();
    console.log(`  Query with ObjectId: ${mastery1.length} profiles`);

    const mastery2 = await db.collection('topic_mastery').find({
      userId: userIdStr
    }).toArray();
    console.log(`  Query with String:   ${mastery2.length} profiles`);

    if (mastery2.length > 0) {
      console.log('\n  ┌──────────────────────┬──────────┬────────────┐');
      console.log('  │ Topic                │ Mastery  │ Confidence │');
      console.log('  ├──────────────────────┼──────────┼────────────┤');

      let total = 0;
      mastery2.forEach(m => {
        const topic = m.topicId.padEnd(20);
        const masteryPct = (m.mastery_probability * 100).toFixed(1).padStart(7) + '%';
        const confidence = (m.confidence_score * 100).toFixed(1).padStart(8) + '%';
        console.log(`  │ ${topic} │ ${masteryPct} │ ${confidence} │`);
        total += m.mastery_probability;
      });

      console.log('  ├──────────────────────┼──────────┼────────────┤');
      const avgMastery = (total / mastery2.length * 100).toFixed(1);
      console.log(`  │ OVERALL AVERAGE      │ ${avgMastery.padStart(7)}% │            │`);
      console.log('  └──────────────────────┴──────────┴────────────┘');
    } else {
      console.log(`  ⚠️  No mastery profiles generate yet`);
      console.log(`  REASON: ${subs2.length === 0 ? 'No submissions synced' : 'Waiting for AI calculation'}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.log('Error:', error.message);
  } finally {
    await client.close();
  }
}

getFullProfile();
