const mongoose = require('mongoose');

async function test() {
  try {
    await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');
    console.log('Connected to DB prepmate-ai-studio');

    const TopicMastery = mongoose.connection.collection('topic_mastery');
    const records = await TopicMastery.find({}).toArray();
    console.log(`topic_mastery has ${records.length} records`);
    console.log('Sample:', records.length ? records[0] : null);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test();
