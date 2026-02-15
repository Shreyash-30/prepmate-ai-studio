import { MongoClient } from 'mongodb';

async function getUserProfile() {
  const uri = 'mongodb://localhost:27017/prepmate-ai-studio';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('prepmate-ai-studio');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('         USER PROFILE & MASTERY ANALYSIS');
    console.log('         shreyash@gmail.com');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Find user
    const user = await db.collection('users').findOne({ 
      email: 'shreyash@gmail.com' 
    });

    if (!user) {
      console.log('❌ User shreyash@gmail.com not found in database');
      console.log('\nAvailable users:');
      const allUsers = await db.collection('users').find().toArray();
      allUsers.forEach(u => console.log(`  • ${u.email}`));
      return;
    }

    console.log('✅ USER INFORMATION');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`  Email:              ${user.email}`);
    console.log(`  Name:               ${user.name || 'N/A'}`);
    console.log(`  Account Created:    ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}`);
    console.log(`  Last Login:         ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}`);
    console.log(`  Target Companies:   ${user.targetCompanies || 'N/A'}`);
    console.log(`  Preparation Time:   ${user.preparationTimeline ? user.preparationTimeline + ' months' : 'N/A'}`);

    // Check LeetCode integration
    console.log('\n✅ INTEGRATIONS');
    console.log('─────────────────────────────────────────────────────────────');
    const integration = await db.collection('integrationaccounts').findOne({
      userId: user._id.toString()
    });

    if (integration) {
      console.log(`  LeetCode:           Connected ✓`);
      console.log(`  Username:           ${integration.username || 'N/A'}`);
      console.log(`  Status:             ${integration.connectionStatus || 'N/A'}`);
      console.log(`  Connected At:       ${integration.connectedAt ? new Date(integration.connectedAt).toLocaleDateString() : 'N/A'}`);
    } else {
      console.log(`  LeetCode:           Not connected`);
    }

    // Get submissions
    console.log('\n✅ SUBMISSIONS');
    console.log('─────────────────────────────────────────────────────────────');
    const submissions = await db.collection('externalplatformsubmissions')
      .find({ userId: user._id.toString() })
      .toArray();

    if (submissions.length > 0) {
      const easyCount = submissions.filter(s => s.difficulty === 'Easy').length;
      const mediumCount = submissions.filter(s => s.difficulty === 'Medium').length;
      const hardCount = submissions.filter(s => s.difficulty === 'Hard').length;
      
      console.log(`  Total Solved:       ${submissions.length} problems`);
      console.log(`  Easy:               ${easyCount}`);
      console.log(`  Medium:             ${mediumCount}`);
      console.log(`  Hard:               ${hardCount}`);
    } else {
      console.log(`  Total Submissions:  0`);
    }

    // Get mastery profiles
    console.log('\n✅ TOPIC-WISE MASTERY PROFILES');
    console.log('─────────────────────────────────────────────────────────────');
    
    const mastery = await db.collection('topic_mastery')
      .find({ userId: user._id.toString() })
      .toArray();

    if (mastery.length === 0) {
      console.log('  No mastery profiles generated yet');
    } else {
      console.log('  ┌──────────────────────┬──────────┬────────────┬──────────────┐');
      console.log('  │ Topic                │ Mastery  │ Confidence │ Improvement  │');
      console.log('  ├──────────────────────┼──────────┼────────────┼──────────────┤');

      let total = 0;
      mastery.forEach(m => {
        const topic = m.topicId.padEnd(20);
        const masteryPct = (m.mastery_probability * 100).toFixed(1).padStart(7) + '%';
        const confidence = (m.confidence_score * 100).toFixed(1).padStart(8) + '%';
        const trend = (m.improvement_trend || 'stable').padEnd(12);
        console.log(`  │ ${topic} │ ${masteryPct} │ ${confidence} │ ${trend} │`);
        total += m.mastery_probability;
      });

      console.log('  ├──────────────────────┼──────────┼────────────┼──────────────┤');
      const avgMastery = (total / mastery.length * 100).toFixed(1);
      const overallStr = 'OVERALL AVERAGE'.padEnd(20);
      console.log(`  │ ${overallStr} │ ${avgMastery.padStart(7)}% │            │              │`);
      console.log('  └──────────────────────┴──────────┴────────────┴──────────────┘');
    }

    // Get revision schedule
    console.log('\n✅ REVISION SCHEDULE');
    console.log('─────────────────────────────────────────────────────────────');
    const revisions = await db.collection('revision_schedule')
      .find({ userId: user._id.toString() })
      .toArray();
    
    console.log(`  Scheduled Reviews:  ${revisions.length}`);
    if (revisions.length > 0) {
      const urgent = revisions.filter(r => r.urgency_level === 'high').length;
      console.log(`  Urgent Reviews:     ${urgent}`);
    }

    // Get weakness signals
    console.log('\n✅ WEAKNESS ANALYSIS');
    console.log('─────────────────────────────────────────────────────────────');
    const weaknesses = await db.collection('weak_topic_signals')
      .find({ userId: user._id.toString() })
      .toArray();
    
    console.log(`  Weak Topics:        ${weaknesses.length}`);
    if (weaknesses.length > 0) {
      const critical = weaknesses.filter(w => w.priority === 'critical').length;
      const high = weaknesses.filter(w => w.priority === 'high').length;
      console.log(`  Critical:           ${critical}`);
      console.log(`  High Priority:      ${high}`);
    }

    // Overall proficiency
    console.log('\n✅ OVERALL METRICS');
    console.log('─────────────────────────────────────────────────────────────');
    if (mastery.length > 0) {
      const avgMastery = (mastery.reduce((sum, m) => sum + m.mastery_probability, 0) / mastery.length * 100).toFixed(1);
      console.log(`  Overall Proficiency: ${avgMastery}%`);
      const strong = mastery.filter(m => m.mastery_probability >= 0.7).length;
      const weak = mastery.filter(m => m.mastery_probability < 0.4).length;
      console.log(`  Strong Topics:      ${strong}/${mastery.length}`);
      console.log(`  Weak Topics:        ${weak}/${mastery.length}`);
    } else {
      console.log(`  Overall Proficiency: 0% (No profiles generated)`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

getUserProfile();
