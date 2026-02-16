import mongoose from 'mongoose';

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prepmate-ai-studio');
    
    // Check all relevant collections
    const collections = {
      users: (await mongoose.connection.db.collection('users').countDocuments()),
      user_topic_progressions: (await mongoose.connection.db.collection('user_topic_progressions').countDocuments()),
      question_banks: (await mongoose.connection.db.collection('question_banks').countDocuments()),
      practice_attempt_events: (await mongoose.connection.db.collection('practice_attempt_events').countDocuments()),
      mastery_profiles: (await mongoose.connection.db.collection('mastery_profiles').countDocuments()),
    };
    
    console.log('📊 Database collections:');
    Object.entries(collections).forEach(([name, count]) => {
      console.log(`  ${name}: ${count} documents`);
    });
  } catch(err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
