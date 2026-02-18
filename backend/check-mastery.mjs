import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepmate';

async function checkMasteryData() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    
    // Find users with high mastery
    const progressions = await db.collection('usertopicprogressions')
      .find({masteryScore: {$gte: 50}})
      .limit(5)
      .toArray();
    
    console.log('\n📊 High Mastery Topics Found:', progressions.length);
    if (progressions.length > 0) {
      progressions.forEach(p => {
        console.log(`  User: ${p.userId} | Topic: ${p.topicId} | Mastery: ${p.masteryScore}`);
      });
    } else {
      console.log('  None - all users have mastery < 50');
      
      // Check what progressions exist
      const allProgressions = await db.collection('usertopicprogressions')
        .find({})
        .limit(5)
        .toArray();
      
      console.log('\n📊 Sample Progressions:');
      allProgressions.forEach(p => {
        console.log(`  Topic: ${p.topicId} | Mastery: ${p.masteryScore}`);
      });
    }
    
    // Check users
    console.log('\n👥 Users in DB:');
    const users = await db.collection('users').find({}).limit(5).toArray();
    users.forEach(u => console.log(`  - ${u.email} (ID: ${u._id})`));
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkMasteryData();
