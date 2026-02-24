const mongoose = require('mongoose');

async function test() {
  try {
    await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');
    const db = mongoose.connection.collection('topic_mastery');
    const recs = await db.find({ userId: '699d086dd290f7bdfd5855d3' }).toArray();
    console.log(`Topic mastery records for Amar: ${recs.length}`);
    if (recs.length) console.log(recs[0]);
  } catch(e) { console.error(e) }
  process.exit(0);
}
test();
