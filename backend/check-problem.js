import mongoose from 'mongoose';
import QuestionBank from '../backend/src/models/QuestionBank.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/prepmate-ai-studio';

async function checkQuestionDetails() {
  try {
    await mongoose.connect(MONGO_URI);
    
    // Get first problem
    const problem = await QuestionBank.findOne({ problemId: 'problem-1' });
    
    if (!problem) {
      console.log('Problem not found');
      process.exit(1);
    }

    console.log('=== PROBLEM-1 Details ===\n');
    console.log('Title:', problem.title || 'MISSING');
    console.log('Description:', problem.description ? `${problem.description.substring(0, 100)}...` : 'MISSING');
    console.log('Schema Version:', problem.schemaVersion);
    console.log('Has wrapperTemplate:', !!problem.wrapperTemplate);
    
    if (problem.wrapperTemplate) {
      console.log('  Type:', typeof problem.wrapperTemplate);
      console.log('  Is Object:', typeof problem.wrapperTemplate === 'object');
      if (typeof problem.wrapperTemplate === 'object') {
        for (const [lang, template] of Object.entries(problem.wrapperTemplate)) {
          if (typeof template === 'string') {
            console.log(`  - ${lang}: ${template.length} chars, has __USER_CODE__: ${template.includes('__USER_CODE__')}`);
          }
        }
      }
    }

    console.log('\nHas starterCode:', !!problem.starterCode);
    if (problem.starterCode) {
      console.log('  Type:', typeof problem.starterCode);
      if (typeof problem.starterCode === 'object') {
        for (const [lang, code] of Object.entries(problem.starterCode)) {
          if (typeof code === 'string') {
            console.log(`  - ${lang}: ${code.length} chars`);
          }
        }
      }
    }

    console.log('\nHas functionMetadata:', !!problem.functionMetadata);
    if (problem.functionMetadata) {
      console.log('  Function:', problem.functionMetadata.functionName);
      console.log('  Parameters:', problem.functionMetadata.parameters);
      console.log('  ReturnType:', problem.functionMetadata.returnType);
    }

    console.log('\nTestCases:');
    if (problem.testCases && problem.testCases.length > 0) {
      console.log(`  Count: ${problem.testCases.length}`);
      problem.testCases.slice(0, 2).forEach((tc, i) => {
        console.log(`  Test ${i+1}:`);
        console.log(`    Input: ${typeof tc.input === 'object' ? JSON.stringify(tc.input) : tc.input}`);
        console.log(`    Expected: ${typeof tc.expectedOutput === 'object' ? JSON.stringify(tc.expectedOutput) : tc.expectedOutput}`);
        console.log(`    Visibility: ${tc.visibility}`);
      });
    } else {
      console.log('  ✗ NO TEST CASES');
    }

    console.log('\nConstraints:');
    if (problem.constraints && problem.constraints.length > 0) {
      console.log(`  Count: ${problem.constraints.length}`);
      problem.constraints.slice(0, 2).forEach((c, i) => {
        console.log(`  ${i+1}. ${c}`);
      });
    } else {
      console.log('  ✗ NO CONSTRAINTS');
    }

    console.log('\nExampleCases:');
    if (problem.exampleCases && problem.exampleCases.length > 0) {
      console.log(`  Count: ${problem.exampleCases.length}`);
      problem.exampleCases.slice(0, 2).forEach((ec, i) => {
        console.log(`  Example ${i+1}:`);
        console.log(`    Input: ${ec.input || JSON.stringify(ec)}`);
        console.log(`    Output: ${ec.output || ec.expectedOutput || 'N/A'}`);
      });
    } else {
      console.log('  ✗ NO EXAMPLE CASES');
    }

    // Check all keys in the problem
    console.log('\nAll fields in document:');
    const keys = Object.keys(problem.toObject());
    keys.forEach(k => {
      const val = problem[k];
      const type = Array.isArray(val) ? `Array(${val.length})` : typeof val;
      console.log(`  - ${k}: ${type}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkQuestionDetails();
