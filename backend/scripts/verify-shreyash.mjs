import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

async function verifyUser() {
  const uri = 'mongodb://localhost:27017/prepmate-ai-studio';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('prepmate-ai-studio');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   USER AUTHENTICATION & PROFILE VERIFICATION');
    console.log('   shreyash@gmail.com | Password: 123456');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Find user
    const user = await db.collection('users').findOne({ 
      email: 'shreyash@gmail.com' 
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ USER FOUND');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name || 'N/A'}`);
    
    // Verify password
    const passwordMatch = await bcrypt.compare('123456', user.password);
    console.log(`   Password: ${passwordMatch ? '✅ CORRECT' : '❌ INCORRECT'}\n`);

    if (!passwordMatch) {
      console.log('❌ Authentication failed - incorrect password');
      return;
    }

    console.log('✅ AUTHENTICATION SUCCESSFUL\n');

    // Get all data
    console.log('📊 ACCOUNT STATUS');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`  Account Created:    ${new Date(user.createdAt).toLocaleDateString()}`);
    console.log(`  Last Login:         ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}`);
    console.log(`  Target Companies:   ${user.targetCompanies || 'Not specified'}`);
    console.log(`  Preparation Time:   ${user.preparationTimeline || 'Not specified'}`);

    const integration = await db.collection('integrationaccounts').findOne({
      userId: user._id.toString()
    });
    console.log(`  LeetCode Connected: ${integration ? '✅ Yes' : '❌ No'}`);

    const submissions = await db.collection('externalplatformsubmissions')
      .find({ userId: user._id.toString() })
      .toArray();
    console.log(`  Problems Solved:    ${submissions.length}`);

    const mastery = await db.collection('topic_mastery')
      .find({ userId: user._id.toString() })
      .toArray();

    console.log(`\n✅ MASTERY STATUS`);
    console.log('─────────────────────────────────────────────────────────────');
    
    if (mastery.length === 0) {
      console.log('  ❌ No mastery profiles generated');
      console.log('\n  REASON: LeetCode not connected OR no submissions tracked');
      console.log('  TO GENERATE: Connect LeetCode account and sync submissions');
    } else {
      console.log('  ┌──────────────────────┬──────────┬────────────┐');
      console.log('  │ Topic                │ Mastery  │ Confidence │');
      console.log('  ├──────────────────────┼──────────┼────────────┤');

      let total = 0;
      mastery.forEach(m => {
        const topic = m.topicId.padEnd(20);
        const masteryPct = (m.mastery_probability * 100).toFixed(1).padStart(7) + '%';
        const confidence = (m.confidence_score * 100).toFixed(1).padStart(8) + '%';
        console.log(`  │ ${topic} │ ${masteryPct} │ ${confidence} │`);
        total += m.mastery_probability;
      });

      console.log('  ├──────────────────────┼──────────┼────────────┤');
      const avgMastery = (total / mastery.length * 100).toFixed(1);
      console.log(`  │ OVERALL AVERAGE      │ ${avgMastery.padStart(7)}% │            │`);
      console.log('  └──────────────────────┴──────────┴────────────┘');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

verifyUser();
