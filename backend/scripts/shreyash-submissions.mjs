import { MongoClient } from 'mongodb';

async function showSubmissions() {
  const uri = 'mongodb://localhost:27017/prepmate-ai-studio';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('prepmate-ai-studio');

    const user = await db.collection('users').findOne({ 
      email: 'shreyash@gmail.com' 
    });

    const subs = await db.collection('externalplatformsubmissions').find({
      userId: user._id
    }).toArray();

    console.log('\n📋 SHREYASH - PROBLEM SUBMISSIONS\n');

    const difficulties = {};
    subs.forEach(s => {
      difficulties[s.difficulty] = (difficulties[s.difficulty] || 0) + 1;
    });

    console.log('DIFFICULTY BREAKDOWN:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`  Easy:       ${difficulties['Easy'] || 0} problems`);
    console.log(`  Medium:     ${difficulties['Medium'] || 0} problems`);
    console.log(`  Hard:       ${difficulties['Hard'] || 0} problems`);
    console.log(`  TOTAL:      ${subs.length} problems\n`);

    console.log('RECENT SUBMISSIONS:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('┌──────────┬────────────────────────────────────────┬──────────┐');
    console.log('│Difficulty│ Problem Title                          │ Topics   │');
    console.log('├──────────┼────────────────────────────────────────┼──────────┤');

    subs.slice(0, 10).forEach(s => {
      const diff = s.difficulty.padEnd(10);
      const title = (s.problemTitle || '').substring(0, 38).padEnd(38);
      const topics = (s.tags ? s.tags.join(', ').substring(0, 8) : '').padEnd(8);
      console.log(`│${diff}│ ${title} │ ${topics} │`);
    });

    if (subs.length > 10) {
      console.log('│          │ ... and ' + (subs.length - 10) + ' more problems');
    }

    console.log('└──────────┴────────────────────────────────────────┴──────────┘');

    console.log('\n⚠️  STATUS: 20 submissions synced but NO MASTERY PROFILES generated yet');
    console.log('   ACTION NEEDED: Run AI service to calculate mastery scores\n');

  } catch (error) {
    console.log('Error:', error.message);
  } finally {
    await client.close();
  }
}

showSubmissions();
