#!/usr/bin/env node
/**
 * VERIFICATION: Check if questionId is actually being generated and saved
 * 
 * This script:
 * 1. Checks if MongoDB is running
 * 2. Dumps a few problems from QuestionBank for debugging
 * 3. Checks what index exists on problemId
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepmate';

async function verify() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`VERIFICATION: Database State`);
  console.log(`${'='.repeat(70)}\n`);

  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ Connected to MongoDB\n`);

    // Get the QuestionBank model
    const db = mongoose.connection.db;
    const questionsCollection = db.collection('questions');  // or 'questionbanks' depending on naming

    // Check collection exists
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log(`[1] Collections in database:`);
    collectionNames.forEach(name => {
      console.log(`   - ${name}`);
    });
    console.log('');

    // Find the questions collection (could be 'questions' or 'questionbanks')
    const questionCollName = collectionNames.find(c => 
      c === 'questions' || c === 'questionbanks' || c.includes('question')
    );

    if (!questionCollName) {
      console.log(`⚠️ No questions collection found!\n`);
      return;
    }

    const qCollection = db.collection(questionCollName);

    // Check indexes
    console.log(`[2] Indexes on "${questionCollName}" collection:`);
    const indexes = await qCollection.getIndexes();
    Object.keys(indexes).forEach(name => {
      const idx = indexes[name];
      console.log(`   - ${name}: ${JSON.stringify(idx.key)}`);
    });
    console.log('');

    // Count different types of questions
    console.log(`[3] Question counts:`);
    const totalCount = await qCollection.countDocuments({});
    const v2Count = await qCollection.countDocuments({ schemaVersion: 2 });
    const llmCount = await qCollection.countDocuments({ source: 'llm' });
    const llmV2Count = await qCollection.countDocuments({ source: 'llm', schemaVersion: 2 });
    const activeCount = await qCollection.countDocuments({ isActive: true });
    const inactiveCount = await qCollection.countDocuments({ isActive: false });

    console.log(`   Total: ${totalCount}`);
    console.log(`   schemaVersion 2: ${v2Count}`);
    console.log(`   source 'llm': ${llmCount}`);
    console.log(`   source 'llm' AND v2: ${llmV2Count}`);
    console.log(`   isActive true: ${activeCount}`);
    console.log(`   isActive false: ${inactiveCount}`);
    console.log('');

    // Sample LLM questions
    console.log(`[4] Sample LLM v2 questions:`);
    const samples = await qCollection.find({
      source: 'llm',
      schemaVersion: 2,
      isActive: true,
    })
      .limit(3)
      .toArray();

    if (samples.length === 0) {
      console.log(`   ⚠️ No LLM v2 active questions found!`);
    } else {
      samples.forEach((q, i) => {
        console.log(`   [${i + 1}] ${q.title || q.problemTitle || 'NO TITLE'}`);
        console.log(`       problemId: ${q.problemId}`);
        console.log(`       schemaVersion: ${q.schemaVersion}`);
        console.log(`       isActive: ${q.isActive}`);
        console.log(`       testCasesStructured: ${Array.isArray(q.testCasesStructured) ? q.testCasesStructured.length + ' items' : 'MISSING'}`);
        console.log('');
      });
    }

    // Check for the specific coin-change-problem
    console.log(`[5] Searching for "coin-change" related questions:`);
    const coinChange = await qCollection.find({
      $or: [
        { problemId: /coin-change/i },
        { title: /coin-change/i },
      ],
    })
      .limit(5)
      .toArray();

    if (coinChange.length === 0) {
      console.log(`   No questions found with "coin-change" in problemId or title`);
    } else {
      coinChange.forEach((q, i) => {
        console.log(`   [${i + 1}] ${q.title} (problemId: ${q.problemId})`);
        console.log(`       schemaVersion: ${q.schemaVersion}, isActive: ${q.isActive}`);
      });
    }

    console.log('\n✅ Verification complete\n');
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

verify();
