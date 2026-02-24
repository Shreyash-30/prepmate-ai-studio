import mongoose from 'mongoose';

async function migrate() {
  try {
    const uri = 'mongodb://localhost:27017/prepmate-ai-studio';
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    // Get all collection names
    const collections = ['topic_mastery', 'readiness_score', 'weak_topic_signals', 'revision_schedule', 'adaptive_study_plan'];
    
    for (let colName of collections) {
      const col = db.collection(colName);
      console.log(`\n--- Processing: ${colName} ---`);
      
      const allDocs = await col.find({}).toArray();
      console.log(`Total documents: ${allDocs.length}`);
      
      let updateCount = 0;
      for (let doc of allDocs) {
        // Log the type of userId for the first document
        if (updateCount === 0 && doc.userId) {
          console.log(`Sample userId type: ${typeof doc.userId}`);
          console.log(`Sample userId constructor: ${doc.userId.constructor.name}`);
        }
        
        if (doc.userId && typeof doc.userId !== 'string') {
          const stringId = doc.userId.toString();
          await col.updateOne({ _id: doc._id }, { $set: { userId: stringId } });
          updateCount++;
        }
      }
      console.log(`Successfully updated ${updateCount} documents to String userId.`);
    }
    
    console.log('\nMigration complete');
    process.exit(0);
  } catch (e) {
    console.error('Migration error:', e);
    process.exit(1);
  }
}

migrate();
