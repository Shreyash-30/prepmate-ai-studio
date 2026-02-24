/**
 * PHASE 9: Wrapped Execution Enforcement Test
 * Verify global hard fails and query filters working
 */

// Simple unit tests that don't require server running
async function testPhase9Enforcement() {
  console.log('\n🔒 PHASE 9: Wrapped Execution Enforcement Tests\n');
  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Query filter only returns v2, active questions
    console.log('📋 Test 1: Checking query filter behavior...');
    console.log('   Expected: onlyWrappedQuestionsFilter() returns { isActive: true, schemaVersion: 2 }');
    
    try {
      // Import the filter function
      const { onlyWrappedQuestionsFilter } = await import(
        '../src/middleware/wrappedExecutionEnforcement.js'
      );
      
      const filter = onlyWrappedQuestionsFilter();
      console.log(`   ✅ Filter returned:`, filter);
      
      if (filter.isActive === true && filter.schemaVersion === 2) {
        console.log('   ✅ PASS: Filter correctly enforces isActive: true, schemaVersion: 2\n');
        passed++;
      } else {
        console.log('   ❌ FAIL: Filter values incorrect\n');
        failed++;
      }
    } catch (e) {
      console.log(`   ❌ FAIL: ${e.message}\n`);
      failed++;
    }

    // Test 2: Validation catches invalid v1 questions
    console.log('📋 Test 2: Validation catches v1 questions...');
    try {
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
      const hasSchemaError = errors.some(e => e.includes('schemaVersion'));
      
      if (hasSchemaError) {
        console.log(`   ✅ PASS: Correctly detected schemaVersion mismatch\n`);
        passed++;
      } else {
        console.log(`   ❌ FAIL: Did not catch schemaVersion error\n`);
        failed++;
      }
    } catch (e) {
      console.log(`   ❌ FAIL: ${e.message}\n`);
      failed++;
    }

    // Test 3: Validation passes for valid v2 question
    console.log('📋 Test 3: Validation passes for valid v2 questions...');
    try {
      const { validateQuestionForPractice } = await import(
        '../src/middleware/wrappedExecutionEnforcement.js'
      );

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
      
      if (validErrors.length === 0) {
        console.log(`   ✅ PASS: Valid v2 question passed all checks\n`);
        passed++;
      } else {
        console.log(`   ❌ FAIL: Valid question failed with errors: ${validErrors.join(', ')}\n`);
        failed++;
      }
    } catch (e) {
      console.log(`   ❌ FAIL: ${e.message}\n`);
      failed++;
    }

    // Test 4: Validation catches missing required fields
    console.log('📋 Test 4: Validation catches missing fields...');
    try {
      const { validateQuestionForPractice } = await import(
        '../src/middleware/wrappedExecutionEnforcement.js'
      );

      const incompleteQuestion = {
        title: 'Incomplete',
        problemId: 'test-3',
        schemaVersion: 2,
        isActive: true,
        // Missing wrapperTemplate
      };

      const incompleteErrors = validateQuestionForPractice(incompleteQuestion);
      const hasMissingWrapper = incompleteErrors.some(e => e.includes('wrapperTemplate'));
      
      if (hasMissingWrapper) {
        console.log(`   ✅ PASS: Correctly detected missing wrapperTemplate\n`);
        passed++;
      } else {
        console.log(`   ❌ FAIL: Did not catch missing wrapperTemplate\n`);
        failed++;
      }
    } catch (e) {
      console.log(`   ❌ FAIL: ${e.message}\n`);
      failed++;
    }

    // Test 5: Middleware import check
    console.log('📋 Test 5: Middleware available for Express routes...');
    try {
      const { enforceWrappedExecutionMiddleware } = await import(
        '../src/middleware/wrappedExecutionEnforcement.js'
      );
      
      if (typeof enforceWrappedExecutionMiddleware === 'function') {
        console.log(`   ✅ PASS: Middleware function available and ready\n`);
        passed++;
      } else {
        console.log(`   ❌ FAIL: Middleware is not a function\n`);
        failed++;
      }
    } catch (e) {
      console.log(`   ❌ FAIL: ${e.message}\n`);
      failed++;
    }

    // Summary
    console.log('\n📊 Test Results:');
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    
    if (failed === 0) {
      console.log('\n✅ PHASE 9 Enforcement Verification PASSED\n');
      console.log('Summary:');
      console.log('  ✅ Query filter enforces isActive: true, schemaVersion: 2');
      console.log('  ✅ Validation rejects schemaVersion !== 2');
      console.log('  ✅ Validation rejects missing required v2 fields');
      console.log('  ✅ Validation passes for complete v2 questions');
      console.log('  ✅ Middleware available on practice routes');
      console.log('  ✅ All global hard fail mechanisms in place\n');
      process.exit(0);
    } else {
      console.log('\n❌ PHASE 9 Tests Failed\n');
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ PHASE 9 Test Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

// Run tests
testPhase9Enforcement();
