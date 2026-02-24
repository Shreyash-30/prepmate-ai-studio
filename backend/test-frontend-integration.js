/**
 * Frontend Integration Test
 * Verifies that test cases are properly loaded and displayed
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

async function runFrontendIntegrationTest() {
  console.log('\n🧪 FRONTEND INTEGRATION TEST');
  console.log('='.repeat(60));

  try {
    // Step 1: Create a practice session
    console.log('\n📝 STEP 1: Creating practice session...');
    const createSessionResponse = await axios.post(
      `${API_BASE_URL}/practice/session/start`,
      {
        topicId: 'array',
        problemId: 'twosum-wrapped',
        language: 'python',
      },
      {
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      }
    );

    const sessionId = createSessionResponse.data.data.sessionId;
    console.log(`✅ Session created: ${sessionId}`);
    console.log(`   Schema version: ${createSessionResponse.data.data.schemaVersion}`);

    // Step 2: Fetch full session data (as frontend does)
    console.log('\n📦 STEP 2: Fetching full session data (like frontend does)...');
    const getSessionResponse = await axios.get(
      `${API_BASE_URL}/practice/session/${sessionId}`,
      {
        headers: {
          Authorization: 'Bearer test-token',
        },
      }
    );

    const session = getSessionResponse.data.data;
    console.log(`✅ Full session fetched`);
    console.log(`   Starter codes: ${Object.keys(session.starterCode || {}).join(', ')}`);
    console.log(`   Test cases count: ${session.testCases?.length || 0}`);

    // Step 3: Verify test cases are proper objects (not strings)
    console.log('\n🔍 STEP 3: Checking test case format...');
    if (!session.testCases || session.testCases.length === 0) {
      console.log(`⚠️  WARNING: No test cases loaded!`);
    } else {
      const firstTestCase = session.testCases[0];
      console.log(`✅ Test cases exist`);
      console.log(`   First test case type: ${typeof firstTestCase}`);
      console.log(`   First test case: ${JSON.stringify(firstTestCase, null, 2).substring(0, 200)}...`);

      // Check format
      if (firstTestCase.input !== undefined && firstTestCase.expectedOutput !== undefined) {
        console.log(`✅ Test case format is CORRECT (wrapped: input + expectedOutput)`);
      } else if (firstTestCase.inputData && firstTestCase.outputData) {
        console.log(`✅ Test case format is CORRECT (alternative: inputData + outputData)`);
      } else {
        console.log(`❌ Test case format is WRONG - missing standard fields`);
      }
    }

    // Step 4: Verify starter code
    console.log('\n💻 STEP 4: Checking starter code...');
    const pythonStarter = session.starterCode?.python;
    if (pythonStarter) {
      console.log(`✅ Python starter code exists`);
      console.log(`   Length: ${pythonStarter.length} chars`);
      console.log(`   Content: ${pythonStarter.substring(0, 100)}...`);
    } else {
      console.log(`❌ Python starter code missing!`);
    }

    // Step 5: Verify wrapper template
    console.log('\n🔧 STEP 5: Checking wrapper template...');
    if (session.wrapperTemplate) {
      console.log(`✅ Wrapper template exists`);
      console.log(`   Contains __USER_CODE__: ${session.wrapperTemplate.includes('__USER_CODE__') ? '✅' : '❌'}`);
      console.log(`   Length: ${session.wrapperTemplate.length} chars`);
    } else {
      console.log(`❌ Wrapper template missing!`);
    }

    // Step 6: Summary
    console.log('\n📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Session ID: ${sessionId}`);
    console.log(`Schema Version: ${session.schemaVersion || 'unknown'}`);
    console.log(`Test Cases: ${session.testCases?.length || 0}`);
    console.log(`Starter Code Languages: ${Object.keys(session.starterCode || {}).join(', ')}`);
    console.log(`Wrapper Template: ${session.wrapperTemplate ? '✅ Present' : '❌ Missing'}`);
    console.log(`Function Metadata: ${session.functionMetadata ? '✅ Present' : '❌ Missing'}`);

    // Frontend should now see test cases!
    console.log('\n✨ FRONTEND READY');
    console.log('When the frontend creates a session:');
    console.log('1. Calls POST /practice/session/start → gets sessionId');
    console.log('2. Calls GET /practice/session/{sessionId} → gets full data with testCases');
    console.log('3. Displays testCases from session.testCases array');
    console.log(`\n✅ Session data is ready to be displayed in UI`);
    console.log(`   Frontend should display ${session.testCases?.length || 0} test cases`);

  } catch (error) {
    console.error('\n❌ ERROR:', error.response?.data || error.message);
  }
}

runFrontendIntegrationTest();
