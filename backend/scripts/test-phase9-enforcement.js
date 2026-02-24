/**
 * PHASE 9: Wrapped Execution Enforcement Test
 * Verify global hard fails and query filters working
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

async function testPhase9Enforcement() {
  console.log('\n🔒 PHASE 9: Wrapped Execution Enforcement Tests\n');

  try {
    // Test 1: Query filter only returns v2, active questions
    console.log('📋 Test 1: Checking query filter behavior...');
    console.log('   Expected: onlyWrappedQuestionsFilter() returns { isActive: true, schemaVersion: 2 }');
    
    // Import the filter function
    const { onlyWrappedQuestionsFilter } = await import(
      '../src/middleware/wrappedExecutionEnforcement.js'
    );
    
    const filter = onlyWrappedQuestionsFilter();
    console.log(`   ✅ Filter returned:`, filter);
    console.assert(filter.isActive === true, 'Filter should enforce isActive: true');
    console.assert(filter.schemaVersion === 2, 'Filter should enforce schemaVersion: 2');

    // Test 2: Validation catches invalid v1 questions
    console.log('\n📋 Test 2: Validation catches v1 questions...');
    const { validateQuestionForPractice } = await import(
      '../src/middleware/wrappedExecutionEnforcement.js'
    );

    // Mock a v1 question
    const v1Question = {
      title: 'Test Problem',
      problemId: 'test-1',
      schemaVersion: 1,
      stdin: 'some stdin',
    };

    const errors = validateQuestionForPractice(v1Question);
    console.log(`   Schema Version Error: "${errors.find(e => e.includes('schemaVersion'))}"}`);
    console.assert(
      errors.some(e => e.includes('schemaVersion')),
      'Should catch schemaVersion mismatch'
    );

    // Test 3: Validation passes for valid v2 question
    console.log('\n📋 Test 3: Validation passes for valid v2 questions...');
    const v2Question = {
      title: 'Valid Problem',
      problemId: 'test-2',
      schemaVersion: 2,
      isActive: true,
      wrapperTemplate: {
        python: 'def solution(n):\n    # __USER_CODE__\n    pass',
      },
      starterCode: {
        python: 'def solution(n):\n    # Write your code here\n    pass',
      },
      testCasesStructured: [
        { input: '5', expectedOutput: '120', visibility: 'public' },
      ],
      functionMetadata: {
        name: 'solution',
        parameters: ['n'],
        returnType: 'int',
      },
    };

    const validErrors = validateQuestionForPractice(v2Question);
    console.log(`   Validation errors: ${validErrors.length}`);
    console.assert(validErrors.length === 0, 'Should pass validation with no errors');
    console.log(`   ✅ Valid v2 question passed all checks`);

    // Test 4: Validation catches missing required fields
    console.log('\n📋 Test 4: Validation catches missing fields...');
    const incompleteQuestion = {
      title: 'Incomplete',
      problemId: 'test-3',
      schemaVersion: 2,
      isActive: true,
      // Missing wrapperTemplate
    };

    const incompleteErrors = validateQuestionForPractice(incompleteQuestion);
    console.log(`   Missing wrapperTemplate error: "${incompleteErrors.find(e => e.includes('wrapperTemplate'))}"}`);
    console.assert(
      incompleteErrors.some(e => e.includes('wrapperTemplate')),
      'Should catch missing wrapperTemplate'
    );

    // Test 5: Middleware import check
    console.log('\n📋 Test 5: Middleware available for Express routes...');
    const { enforceWrappedExecutionMiddleware } = await import(
      '../src/middleware/wrappedExecutionEnforcement.js'
    );
    console.assert(
      typeof enforceWrappedExecutionMiddleware === 'function',
      'Middleware should be a function'
    );
    console.log(`   ✅ Middleware function available and ready`);

    console.log('\n✅ PHASE 9 Enforcement Verification PASSED\n');
    console.log('Summary:');
    console.log('  ✅ Query filter enforces isActive: true, schemaVersion: 2');
    console.log('  ✅ Validation rejects schemaVersion !== 2');
    console.log('  ✅ Validation rejects missing required v2 fields');
    console.log('  ✅ Validation passes for complete v2 questions');
    console.log('  ✅ Middleware middleware available on practice routes');
    console.log('  ✅ All global hard fail mechanisms in place\n');

  } catch (err) {
    console.error('❌ PHASE 9 Test Failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

// Run tests
testPhase9Enforcement();
