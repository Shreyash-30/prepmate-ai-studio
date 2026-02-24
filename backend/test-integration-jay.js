import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

// Test user credentials
const testUser = {
  email: 'jay@gmail.com',
  password: 'pass-123456',
};

let authToken = null;
let sessionId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(type, message) {
  const prefix = {
    success: `${colors.green}✅${colors.reset}`,
    error: `${colors.red}❌${colors.reset}`,
    info: `${colors.cyan}ℹ️${colors.reset}`,
    warn: `${colors.yellow}⚠️${colors.reset}`,
    step: `${colors.bright}${colors.cyan}▶${colors.reset}`,
  };

  console.log(`${prefix[type]} ${message}`);
}

async function testLogin() {
  log('step', '=== LOGIN TEST ===');
  try {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      email: testUser.email,
      password: testUser.password,
    });

    if (res.data?.data?.token) {
      authToken = res.data.data.token;
      log('success', `Logged in as ${testUser.email}`);
      log('info', `Token: ${authToken.substring(0, 20)}...`);
      return true;
    } else {
      log('error', 'No token in response');
      return false;
    }
  } catch (error) {
    log('error', `Login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testStartSession() {
  log('step', '=== START PRACTICE SESSION ===');
  try {
    const res = await axios.post(
      `${API_BASE}/practice/session/start`,
      {
        problemId: 'two-sum', // Common problem ID
        language: 'python',
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (res.data?.data?.sessionId) {
      sessionId = res.data.data.sessionId;
      log('success', `Session created: ${sessionId}`);
      return true;
    } else {
      log('error', 'No sessionId in response');
      return false;
    }
  } catch (error) {
    log('error', `Start session failed: ${error.response?.data?.message || error.message}`);
    log('info', `Response: ${JSON.stringify(error.response?.data)}`);
    return false;
  }
}

async function testGetSession() {
  log('step', '=== GET SESSION DETAILS ===');
  try {
    const res = await axios.get(`${API_BASE}/practice/session/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    const session = res.data?.data;

    if (!session) {
      log('error', 'No session data returned');
      return false;
    }

    log('success', 'Session loaded successfully');

    // Check question details
    log('info', `Problem ID: ${session.problemId}`);
    log('info', `Language: ${session.codeLanguage}`);

    // Check title and description
    if (session.problemTitle) {
      log('success', `✓ Problem title: ${session.problemTitle}`);
    } else {
      log('warn', 'Problem title missing');
    }

    if (session.problemDescription) {
      log('success', '✓ Problem description loaded');
    } else {
      log('warn', 'Problem description missing');
    }

    // Check constraints
    if (session.constraints && Array.isArray(session.constraints)) {
      log('success', `✓ Constraints loaded (${session.constraints.length} items)`);
    } else if (session.constraints) {
      log('warn', `⚠ Constraints not array: ${typeof session.constraints}`);
    } else {
      log('warn', 'Constraints missing');
    }

    // Check starter code
    if (session.starterCode && session.starterCode[session.codeLanguage]) {
      log('success', '✓ Starter code loaded');
      const starterLen = session.starterCode[session.codeLanguage].length;
      log('info', `  Starter code length: ${starterLen} chars`);
    } else {
      log('warn', 'Starter code missing for language');
    }

    // Check test cases
    if (session.testCases && Array.isArray(session.testCases)) {
      log('success', `✓ Test cases loaded (${session.testCases.length} total)`);
      const visibleTests = session.testCases.filter((t) => t.visibility === 'visible');
      log('info', `  Visible test cases: ${visibleTests.length}`);

      // Show first test case structure
      if (visibleTests.length > 0) {
        const firstTest = visibleTests[0];
        log('info', `  First test case:`);
        log('info', `    Input: ${JSON.stringify(firstTest.input).substring(0, 80)}`);
        log('info', `    Expected: ${JSON.stringify(firstTest.expectedOutput).substring(0, 80)}`);
      }
    } else {
      log('error', 'Test cases not found or not array');
    }

    // Check wrapper template
    if (session.wrapperTemplate && session.wrapperTemplate[session.codeLanguage]) {
      const wrapper = session.wrapperTemplate[session.codeLanguage];
      log('success', `✓ Wrapper template loaded (${wrapper.length} chars)`);
      if (wrapper.includes('__USER_CODE__')) {
        log('success', '  ✓ Contains __USER_CODE__ placeholder');
      } else {
        log('error', '  ✗ Missing __USER_CODE__ placeholder');
      }
    } else {
      log('warn', 'Wrapper template missing');
    }

    // Check function metadata
    if (session.functionMetadata) {
      log('success', `✓ Function metadata: ${session.functionMetadata.functionName}`);
      if (session.functionMetadata.parameters) {
        log('info', `  Parameters: ${JSON.stringify(session.functionMetadata.parameters)}`);
      }
    }

    return true;
  } catch (error) {
    log('error', `Get session failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testRunCode() {
  log('step', '=== RUN CODE ON TEST CASE ===');
  try {
    const userCode = `def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`;

    const res = await axios.post(
      `${API_BASE}/practice/run/${sessionId}`,
      {
        code: userCode,
        language: 'python',
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = res.data?.data;

    if (!result) {
      log('error', 'No result returned from runCode');
      return false;
    }

    log('success', 'Code executed successfully');
    log('info', `Execution Mode: ${result.executionMode}`);
    log('info', `Verdict: ${result.verdict}`);

    if (result.testResults && Array.isArray(result.testResults)) {
      log('success', `✓ Test results: ${result.testResults.length} tests`);
      const passed = result.testResults.filter((t) => t.verdict === 'accepted').length;
      log('info', `  Passed: ${passed}/${result.testResults.length}`);

      // Show first result
      if (result.testResults.length > 0) {
        const firstResult = result.testResults[0];
        log('info', `  First test: ${firstResult.verdict}`);
        if (firstResult.errorOutput) {
          log('warn', `    Error: ${firstResult.errorOutput.substring(0, 100)}`);
        }
      }
    } else {
      log('warn', 'No testResults in response');
    }

    return result.verdict !== 'error';
  } catch (error) {
    log('error', `Run code failed: ${error.response?.data?.message || error.message}`);
    if (error.response?.data) {
      log('info', `Full error: ${JSON.stringify(error.response.data).substring(0, 200)}`);
    }
    return false;
  }
}

async function testSubmit() {
  log('step', '=== SUBMIT SOLUTION ===');
  try {
    const userCode = `def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`;

    const res = await axios.post(
      `${API_BASE}/practice/submit`,
      {
        sessionId: sessionId,
        code: userCode,
        language: 'python',
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = res.data?.data;

    if (!result) {
      log('error', 'No result returned from submit');
      return false;
    }

    log('success', 'Solution submitted successfully');
    log('info', `Final Verdict: ${result.verdict}`);

    if (result.allTestsPassed) {
      log('success', '✓ All tests passed!');
    } else {
      log('warn', '⚠ Some tests failed');
    }

    if (result.testResults && Array.isArray(result.testResults)) {
      log('success', `Test results: ${result.testResults.length} total`);
      const passed = result.testResults.filter((t) => t.verdict === 'accepted').length;
      log('info', `  Passed: ${passed}/${result.testResults.length}`);
    }

    return result.allTestsPassed === true;
  } catch (error) {
    log('error', `Submit failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log(`\n${colors.bright}${colors.cyan}╔════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   INTEGRATION TEST: jay@gmail.com           ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════╝${colors.reset}\n`);

  const tests = [
    { name: 'Login', fn: testLogin },
    { name: 'Start Session', fn: testStartSession },
    { name: 'Get Session & Load Question', fn: testGetSession },
    { name: 'Run Code on Test Case', fn: testRunCode },
    { name: 'Submit Solution', fn: testSubmit },
  ];

  const results = {};

  for (const test of tests) {
    results[test.name] = await test.fn();
    console.log(); // blank line
  }

  // Summary
  console.log(`${colors.bright}${colors.cyan}╔════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   TEST SUMMARY                              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════╝${colors.reset}\n`);

  let passed = 0;
  for (const [name, result] of Object.entries(results)) {
    const status = result ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
    console.log(`  ${status}  ${name}`);
    if (result) passed++;
  }

  console.log(
    `\n${colors.bright}Result: ${passed}/${tests.length} tests passed${colors.reset}\n`
  );

  process.exit(passed === tests.length ? 0 : 1);
}

runAllTests();
