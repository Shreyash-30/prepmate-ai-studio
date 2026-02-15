/**
 * Check MongoDB Storage
 */

import mongoose from 'mongoose';

const MONGO_URI = 'mongodb://localhost:27017/prepmate-ai-studio';
const USER_ID = '6991d3bd7258d93d85baea5c';

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   Checking MongoDB Storage for Jay User Profile         ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // Check mastery collection
    const masteryCollection = db.collection('topic_mastery');
    const masteryRecords = await masteryCollection
      .find({ userId: USER_ID })
      .toArray();

    console.log(`::: MASTERY RECORDS IN MONGODB :::
Found: ${masteryRecords.length} records\n`);

    if (masteryRecords.length > 0) {
      masteryRecords.forEach(record => {
        console.log(`✅ ${record.topicId}`);
        console.log(`   Mastery: ${(record.mastery_probability * 100).toFixed(1)}%`);
        console.log(`   Confidence: ${(record.confidence_score * 100).toFixed(1)}%`);
        console.log(`   Updated: ${record.updatedAt || record.lastUpdated}\n`);
      });
      
      console.log(`\n✅ MASTERY PROFILES SUCCESSFULLY STORED IN MONGODB\n`);
    } else {
      console.log(`❌ NO PROFILES STORED - Data not persisted\n`);
    }

    // Check retention collection
    const retentionCollection = db.collection('revision_schedule');
    const retentionRecords = await retentionCollection
      .find({ userId: USER_ID })
      .toArray();

    console.log(`\n::: RETENTION RECORDS IN MONGODB :::
Found: ${retentionRecords.length} records\n`);

    if (retentionRecords.length > 0) {
      retentionRecords.slice(0, 3).forEach(record => {
        console.log(`✅ ${record.topicId}`);
        console.log(`   Retention: ${(record.retention_probability * 100).toFixed(1)}%\n`);
      });
    }

    // Check weakness collection
    const weaknessCollection = db.collection('weak_topic_signals');
    const weaknessRecords = await weaknessCollection
      .find({ userId: USER_ID })
      .toArray();

    console.log(`\n::: WEAKNESS RECORDS IN MONGODB :::
Found: ${weaknessRecords.length} records\n`);

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   INTELLIGENT PROFILE BUILD STATUS                      ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    if (masteryRecords.length > 0) {
      const overall = masteryRecords.reduce((s, r) => s + r.mastery_probability, 0) / masteryRecords.length;
      console.log(`✅ PROFILE SUCCESSFULLY BUILT FOR USER\n`);
      console.log(`📊 Overall Proficiency: ${(overall * 100).toFixed(1)}%`);
      console.log(`📚 Topics Analyzed: ${masteryRecords.length}`);
      console.log(`📈 Data Flow Status: AI Service → MongoDB ✅`);
    } else {
      console.log(`❌ PROFILE NOT BUILT - No data in MongoDB`);
      console.log(`⚠️  AI Service is calculating but NOT storing results`);
      console.log(`🔧 Issue: MongoDB persistence not working`);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
