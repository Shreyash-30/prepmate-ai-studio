const mongoose = require('mongoose');

async function test() {
  try {
    await mongoose.connect('mongodb://localhost:27017/prepmate-ai-studio');
    const db = mongoose.connection.collection('user_topic_progression');
    const recs = await db.find({ userId: mongoose.Types.ObjectId.createFromHexString('699d086dd290f7bdfd5855d3') }).toArray();
    console.log(`Topic progressions for Amar: ${recs.length}`);
    if (recs.length) console.log(recs[0]);
  } catch(e) { console.error(e) }
  process.exit(0);
}
test();
