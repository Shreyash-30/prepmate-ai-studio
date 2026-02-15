import { MongoClient } from 'mongodb';

async function checkLeetCodeStatus() {
  const uri = 'mongodb://localhost:27017/prepmate-ai-studio';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('prepmate-ai-studio');

    // Get user
    const user = await db.collection('users').findOne({ 
      email: 'shreyash@gmail.com' 
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('🔍 CHECKING LEETCODE CONNECTION FOR SHREYASH\n');
    console.log(`User ID: ${user._id}`);
    console.log(`User ID (String): ${user._id.toString()}\n`);

    // Check integration with string userId
    const int1 = await db.collection('integrationaccounts').findOne({
      userId: user._id.toString()
    });
    console.log(`1. Query with userId.toString(): ${int1 ? 'FOUND' : 'NOT FOUND'}`);
    if (int1) console.log(`   Platform: ${int1.platform}, Username: ${int1.username}`);

    // Check integration with object userId
    const int2 = await db.collection('integrationaccounts').findOne({
      userId: user._id
    });
    console.log(`2. Query with userId (object): ${int2 ? 'FOUND' : 'NOT FOUND'}`);
    if (int2) console.log(`   Platform: ${int2.platform}, Username: ${int2.username}`);

    // Check all integrations for this user
    const allInt = await db.collection('integrationaccounts').find({
      userId: { $in: [user._id, user._id.toString()] }
    }).toArray();
    console.log(`\n3. All integrations for this user: ${allInt.length}\n`);
    allInt.forEach((i, idx) => {
      console.log(`   [${idx + 1}] Platform: ${i.platform}`);
      console.log(`       Username: ${i.username}`);
      console.log(`       Status: ${i.connectionStatus}`);
      console.log(`       Connected At: ${i.connectedAt}`);
    });

    // Check submissions
    const subs = await db.collection('externalplatformsubmissions').find({
      userId: user._id.toString()
    }).toArray();
    console.log(`\nSubmissions for user: ${subs.length}`);

    if (subs.length > 0) {
      console.log('\nSubmission Details:');
      subs.slice(0, 3).forEach(s => {
        console.log(`  - ${s.problemTitle} (${s.difficulty})`);
      });
    }

  } catch (error) {
    console.log('Error:', error.message);
  } finally {
    await client.close();
  }
}

checkLeetCodeStatus();
