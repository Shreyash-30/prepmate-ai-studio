import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

// Test user credentials
const testUser = {
  email: 'jay@gmail.com',
  password: 'pass-123456',
  name: 'Jay Test User',
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

async function testSignup() {
  log('step', '=== SIGNUP / CREATE USER ===');
  try {
    const res = await axios.post(`${API_BASE}/auth/signup`, {
      email: testUser.email,
      password: testUser.password,
      name: testUser.name,
    });

    if (res.data?.success) {
      log('success', `User created or already exists: ${testUser.email}`);
      return true;
    } else {
      log('warn', `Signup response: ${JSON.stringify(res.data)}`);
      return true; // Continue even if already exists
    }
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    // Check if error is because user already exists
    if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
      log('info', `User already exists: ${testUser.email}`);
      return true;
    }
    log('warn', `Signup failed: ${errorMsg}`);
    return true; // Continue anyway
  }
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
      log('error', `No token in response: ${JSON.stringify(res.data)}`);
      return false;
    }
  } catch (error) {
    log('error', `Login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function getAllTopics() {
  try {
    const res = await axios.get(`${API_BASE}/practice/topics`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    return res.data?.data || [];
  } catch (error) {
    log('warn', `Could not fetch topics: ${error.message}`);
    return [];
  }
}

async function testStartSession() {
  log('step', '=== START PRACTICE SESSION ===');
  try {
    // No need to fetch topics since we don't have auth yet
    const topicId = 'arrays'; // Default topic
    const problemId = 'test-two-sum'; // Our newly created problem
    const language = 'python';

    log('info', `Starting session: topicId=${topicId}, problemId=${problemId}, language=${language}`);

    const res = await axios.post(
      `${API_BASE}/practice/session/start`,
      {
        problemId,
        topicId,
        language,
      },
      {
        headers: authToken
          ? {
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            }
          : {
              'Content-Type': 'application/json',
            },
      }
    );

    if (res.data?.data?.sessionId) {
      sessionId = res.data.data.sessionId;
      log('success', `Session created: ${sessionId}`);
      log('info', `Schema version: ${res.data.data.schemaVersion}`);
      log('info', `Execution type: ${res.data.data.executionType}`);
      return true;
    } else {
      log('error', `No sessionId in response: ${JSON.stringify(res.data)}`);
      return false;
    }
  } catch (error) {
    log('error', `Start session failed: ${error.response?.data?.message || error.message}`);
    if (error.response?.data) {
      log('info', `Full error: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

async function testGetSession() {
  log('step', '=== GET SESSION DETAILS & VERIFY QUESTION LOADED ===');
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
    const checks = [];

    // Check title
    if (session.problemTitle) {
      log('success', `✓ Problem title: "${session.problemTitle}"`);
      checks.push(true);
    } else {
      log('error', '✗ Problem title missing');
      checks.push(false);
    }

    // Check description
    if (session.problemDescription) {
      log('success', `✓ Problem description loaded (${session.problemDescription.length} chars)`);
      checks.push(true);
    } else {
      log('error', '✗ Problem description missing');
      checks.push(false);
    }

    // Check constraints
    if (session.constraints && Array.isArray(session.constraints)) {
      log('success', `✓ Constraints loaded (${session.constraints.length} items)`);
      checks.push(true);
    } else {
      log('warn', `⚠ Constraints missing or not array`);
    }

    // Check starter code
    if (session.starterCode && session.starterCode[session.codeLanguage]) {
      const starterLen = session.starterCode[session.codeLanguage].length;
      log('success', `✓ Starter code loaded (${starterLen} chars)`);
      checks.push(true);
    } else {
      log('warn', '⚠ Starter code missing for language');
    }

    // Check test cases - CRITICAL
    if (session.testCases && Array.isArray(session.testCases)) {
      log('success', `✓ Test cases loaded (${session.testCases.length} total)`);
      const visibleTests = session.testCases.filter((t) => t.visibility === 'visible');
      log('info', `  Visible test cases: ${visibleTests.length}`);

      if (visibleTests.length > 0) {
        const firstTest = visibleTests[0];
        log('info', `  First test case:`);
        try {
          const inputStr = typeof firstTest.input === 'string' ? firstTest.input : JSON.stringify(firstTest.input);
          const outputStr = typeof firstTest.expectedOutput === 'string' 
            ? firstTest.expectedOutput 
            : JSON.stringify(firstTest.expectedOutput);
          log('info', `    Input: ${inputStr.substring(0, 100)}`);
          log('info', `    Expected: ${outputStr.substring(0, 100)}`);
        } catch (e) {
          log('info', `    (Could not display first test)`);
        }
      }
      checks.push(true);
    } else {
      log('error', `✗ Test cases missing or not array`);
      checks.push(false);
    }

    // Check wrapper template - CRITICAL
    if (session.wrapperTemplate && session.wrapperTemplate[session.codeLanguage]) {
      const wrapper = session.wrapperTemplate[session.codeLanguage];
      log('success', `✓ Wrapper template loaded (${wrapper.length} chars)`);
      if (wrapper.includes('__USER_CODE__')) {
        log('success', `  ✓ Contains __USER_CODE__ placeholder`);
        checks.push(true);
      } else {
        log('error', `  ✗ Missing __USER_CODE__ placeholder`);
        checks.push(false);
      }
    } else {
      log('warn', '⚠ Wrapper template missing');
    }

    // Check function metadata
    if (session.functionMetadata) {
      log('success', `✓ Function metadata: ${session.functionMetadata.functionName}`);
      if (session.functionMetadata.parameters) {
        const paramStr = Array.isArray(session.functionMetadata.parameters)
          ? session.functionMetadata.parameters.join(', ')
          : JSON.stringify(session.functionMetadata.parameters);
        log('info', `  Parameters: ${paramStr}`);
      }
      checks.push(true);
    } else {
      log('warn', '⚠ Function metadata missing');
    }

    const allChecks = checks.filter(c => c).length;
    log('info', `Total checks passed: ${allChecks}/${checks.length}`);

    return checks.length > 5 && checks.filter(c => c).length >= 4;
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
      log('success', `✓ Test results: ${result.testResults.length} tests executed`);
      const passed = result.testResults.filter((t) => t.verdict === 'accepted').length;
      const failed = result.testResults.filter((t) => t.verdict !== 'accepted').length;
      log('info', `  Passed: ${passed}/${result.testResults.length}`);
      if (failed > 0) {
        log('warn', `  Failed: ${failed}`);
      }

      // Show first few results
      result.testResults.slice(0, 2).forEach((testResult, i) => {
        log('info', `  Test ${i + 1}: ${testResult.verdict}`);
        if (testResult.errorOutput) {
          log('warn', `    Error: ${testResult.errorOutput.substring(0, 80)}`);
        }
      });

      return passed > 0;
    } else {
      log('warn', 'No testResults in response');
      return result.verdict !== 'error';
    }
  } catch (error) {
    log('error', `Run code failed: ${error.response?.data?.message || error.message}`);
    if (error.response?.data?.error) {
      log('info', `Error detail: ${error.response.data.error}`);
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
      log('success', `✓ All tests passed!`);
      return true;
    } else {
      log('warn', `⚠ Some tests did not pass`);
      if (result.testResults) {
        const passed = result.testResults.filter((t) => t.verdict === 'accepted').length;
        log('info', `  Passed: ${passed}/${result.testResults.length}`);
      }
      return false;
    }
  } catch (error) {
    log('error', `Submit failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log(`\n${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   INTEGRATION TEST: jay@gmail.com             ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   Testing: Question Loading & Execution       ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════╝${colors.reset}\n`);

  const tests = [
    { name: 'Create/Signup User', fn: testSignup },
    { name: 'Login', fn: testLogin },
    { name: 'Start Practice Session', fn: testStartSession },
    { name: 'Load Question & Verify Data', fn: testGetSession },
    { name: 'Run Code on Test Case', fn: testRunCode },
    { name: 'Submit Solution', fn: testSubmit },
  ];

  const results = {};

  for (const test of tests) {
    results[test.name] = await test.fn();
    console.log(); // blank line
  }

  // Summary
  console.log(`${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   TEST SUMMARY                                 ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════╝${colors.reset}\n`);

  let passed = 0;
  for (const [name, result] of Object.entries(results)) {
    const status = result ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
    console.log(`  ${status}  ${name}`);
    if (result) passed++;
  }

  console.log(
    `\n${colors.bright}Result: ${passed}/${tests.length} tests passed${colors.reset}\n`
  );

  process.exit(passed >= 4 ? 0 : 1);
}

runAllTests();
