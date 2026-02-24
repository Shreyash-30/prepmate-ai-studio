/**
 * Check available wrapped execution problems
 * Find problems with schemaVersion 2
 */

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import QuestionBank from './src/models/QuestionBank.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function checkProblems() {
  try {
    // Connect to MongoDB
    console.log('📊 Checking available problems...\n');
    
    const problems = await QuestionBank.find(
      { schemaVersion: 2 },
      { _id: 1, problemTitle: 1, schemaVersion: 1, testCasesStructured: 1 }
    ).limit(10);

    if (problems.length === 0) {
      console.log('❌ No problems with schemaVersion 2 found!');
      
      // Check v1 problems
      const v1Problems = await QuestionBank.find({}, { _id: 1, problemTitle: 1, schemaVersion: 1 }).limit(5);
      console.log('\nAvailable v1 problems:');
      v1Problems.forEach(p => console.log(`  - ${p._id}: ${p.problemTitle}`));
    } else {
      console.log(`✅ Found ${problems.length} problems with schemaVersion 2:\n`);
      problems.forEach(p => {
        console.log(`📌 ID: ${p._id}`);
        console.log(`   Title: ${p.problemTitle}`);
        console.log(`   Test cases: ${p.testCasesStructured?.length || 0}`);
      });
    }

    // Also check for problems with wrapperTemplate
    const wrappedProblems = await QuestionBank.countDocuments({ wrapperTemplate: { $exists: true, $ne: null } });
    console.log(`\n🔧 Problems with wrapperTemplate: ${wrappedProblems}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkProblems();
