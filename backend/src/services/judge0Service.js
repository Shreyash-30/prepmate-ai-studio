/**
 * Judge0 API Service
 *
 * Production-grade integration with Judge0 via RapidAPI
 * 
 * Features:
 * - RapidAPI authentication headers
 * - Language mapping (Python, JavaScript, Java, C++, Go, Rust, Ruby, PHP, C#)
 * - Code submission with multiple test cases
 * - Safe polling with configurable timeouts and intervals
 * - Comprehensive error handling
 * - Per-test-case execution with comparison
 * - Rate limiting support at controller level
 * 
 * Configuration:
 * - JUDGE0_RAPIDAPI_KEY: RapidAPI key for authorization
 * - JUDGE0_RAPIDAPI_HOST: RapidAPI host (judge0-ce.p.rapidapi.com)
 * - JUDGE0_BASE_URL: Judge0 endpoint URL
 * - JUDGE0_TIMEOUT_MS: Total timeout for polling
 * - JUDGE0_POLL_INTERVAL_MS: Delay between polls
 * - JUDGE0_MAX_POLL_ATTEMPTS: Maximum number of poll attempts
 * - JUDGE0_CODE_LENGTH_LIMIT: Maximum code length in chars
 */

import axios from 'axios';
import logger from '../utils/logger.js';
import AIObservabilityService from './AIObservabilityService.js';

// Judge0 Configuration from Environment
const JUDGE0_BASE_URL = process.env.JUDGE0_BASE_URL || 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_RAPIDAPI_KEY = process.env.JUDGE0_RAPIDAPI_KEY;
const JUDGE0_RAPIDAPI_HOST = process.env.JUDGE0_RAPIDAPI_HOST || 'judge0-ce.p.rapidapi.com';
const JUDGE0_POLL_TIMEOUT_MS = parseInt(process.env.JUDGE0_TIMEOUT_MS || '20000', 10);
const JUDGE0_POLL_INTERVAL_MS = parseInt(process.env.JUDGE0_POLL_INTERVAL_MS || '1000', 10);
const JUDGE0_MAX_POLL_ATTEMPTS = parseInt(process.env.JUDGE0_MAX_POLL_ATTEMPTS || '20', 10);
const JUDGE0_CODE_LENGTH_LIMIT = parseInt(process.env.JUDGE0_CODE_LENGTH_LIMIT || '50000', 10);

// Validation: Check if required credentials are configured
if (!JUDGE0_RAPIDAPI_KEY) {
  logger.warn(
    '⚠️ JUDGE0_RAPIDAPI_KEY not configured. Code execution will be disabled. ' +
    'Set JUDGE0_RAPIDAPI_KEY in .env file.'
  );
} else {
  logger.info('✅ Judge0 RapidAPI credentials configured');
}

/**
 * Language ID mapping for Judge0
 * Reference: https://judge0.com/docs/api/system-and-information#available-languages
 */
const LANGUAGE_MAP = {
  'python': 71,              // Python 3
  'python3': 71,
  'javascript': 63,          // Node.js / JavaScript
  'js': 63,
  'node': 63,
  'java': 62,                // Java
  'cpp': 54,                 // C++
  'c++': 54,
  'c': 50,                   // C
  'go': 60,                  // Go
  'rust': 73,                // Rust
  'typescript': 63,          // TypeScript (compile to JS)
  'ts': 63,
  'ruby': 72,                // Ruby
  'php': 68,                 // PHP
  'csharp': 51,              // C#
  'c#': 51,
  'swift': 83,               // Swift
  'kotlin': 78,              // Kotlin
};

/**
 * Judge0 Status Codes
 * Ref: https://judge0.com/docs/api/submission-statuses
 */
const STATUS_CODES = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR: 7,
  INTERNAL_ERROR: 8,
  EXEC_FORMAT_ERROR: 9,
  MEMORY_LIMIT_EXCEEDED: 10,
  FILE_ERROR: 11,
  EXIT_SIGNAL: 12,
};

const STATUS_DESCRIPTION = {
  1: 'In Queue',
  2: 'Processing',
  3: 'Accepted',
  4: 'Wrong Answer',
  5: 'Time Limit Exceeded',
  6: 'Compilation Error',
  7: 'Runtime Error',
  8: 'Internal Error',
  9: 'Exec Format Error',
  10: 'Memory Limit Exceeded',
  11: 'File Error',
  12: 'Exit Signal',
};

/**
 * Judge0 API Service
 */
class Judge0Service {
  constructor() {
    this.baseURL = JUDGE0_BASE_URL;
    this.rapidapiKey = JUDGE0_RAPIDAPI_KEY;
    this.rapidapiHost = JUDGE0_RAPIDAPI_HOST;
  }

  /**
   * Check if Judge0 is properly configured
   * @returns {boolean} True if credentials are set
   */
  isConfigured() {
    return !!this.rapidapiKey;
  }

  /**
   * Get HTTP headers for Judge0 RapidAPI requests
   * @returns {Object} Headers object
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-rapidapi-key': this.rapidapiKey,
      'x-rapidapi-host': this.rapidapiHost,
    };
  }

  /**
   * Map language name to Judge0 language ID
   * @param {string} language - Language name (case-insensitive)
   * @returns {number} Judge0 language ID
   * @throws {Error} If language is not supported
   */
  getLanguageId(language) {
    if (!language) {
      throw new Error('Language is required');
    }

    const languageLower = language.toLowerCase().trim();
    const languageId = LANGUAGE_MAP[languageLower];

    if (!languageId) {
      const supported = Object.keys(LANGUAGE_MAP).join(', ');
      throw new Error(
        `Unsupported language: ${language}. Supported: ${supported}`
      );
    }

    return languageId;
  }

  /**
   * Validate code before submission
   * @param {string} code - Source code
   * @throws {Error} If validation fails
   */
  validateCode(code) {
    if (!code || typeof code !== 'string') {
      throw new Error('Code must be a non-empty string');
    }

    if (code.length > JUDGE0_CODE_LENGTH_LIMIT) {
      throw new Error(
        `Code exceeds maximum length of ${JUDGE0_CODE_LENGTH_LIMIT} characters`
      );
    }

    // Check for null bytes
    if (code.includes('\0')) {
      throw new Error('Code contains null bytes');
    }
  }

  /**
   * Submit a single test case to Judge0
   * 
   * @param {Object} params - Submission parameters
   * @param {string} params.code - Source code to compile and execute
   * @param {string} params.language - Programming language
   * @param {string} params.input - Standard input for the program
   * @param {string} params.expectedOutput - Expected output (for comparison)
   * @param {number} params.timeLimit - CPU time limit in seconds (default: 2)
   * @param {number} params.memoryLimit - Memory limit in MB (default: 256)
   * @returns {Promise<string>} Submission token
   * @throws {Error} If submission fails
   */
  async submitCode(params) {
    const {
      code,
      language = 'python',
      input = '',
      expectedOutput = '',
      timeLimit = 2,
      memoryLimit = 256,
    } = params;

    // Validate inputs
    this.validateCode(code);
    const languageId = this.getLanguageId(language);

    try {
      const payload = {
        language_id: languageId,
        source_code: code,
        stdin: input || '',
        expected_output: expectedOutput || '',
        cpu_time_limit: timeLimit,
        cpu_extra_time: 1,
        wall_time_limit: timeLimit * 2,
        memory_limit: memoryLimit * 1024, // Convert MB to KB
        stack_limit: 64 * 1024, // 64 MB stack (max allowed is 128 MB = 128000 KB)
      };

      logger.debug(`Submitting code to Judge0: language=${language} (ID: ${languageId})`);

      const response = await axios.post(
        `${this.baseURL}/submissions?base64_encoded=false&wait=false`,
        payload,
        { headers: this.getHeaders(), timeout: 10000 }
      );

      if (!response.data || !response.data.token) {
        throw new Error('No token received from Judge0');
      }

      logger.info(`Code submitted to Judge0: token=${response.data.token}`);

      return response.data.token;
    } catch (error) {
      logger.error('Judge0 submission error:', error.message);
      
      // Log detailed error response for 422 and other status codes
      if (error.response) {
        logger.error(`HTTP Status: ${error.response?.status}`);
        logger.error(`Response data:`, JSON.stringify(error.response?.data || {}, null, 2));
      }

      if (error.response?.status === 401) {
        throw new Error('Judge0 authentication failed. Check JUDGE0_RAPIDAPI_KEY.');
      } else if (error.response?.status === 422) {
        const validation = error.response?.data?.message || 'Unknown validation error';
        logger.error('🔴 Validation Error (422):', validation);
        throw new Error(`Judge0 validation error: ${validation}`);
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded on Judge0. Try again in a moment.');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to Judge0. Service may be unavailable.');
      }

      throw new Error(`Judge0 submission failed: ${error.message}`);
    }
  }

  /**
   * Submit code for multiple test cases
   * Submits each test case independently and returns tokens
   * 
   * @param {Object} params - Submission parameters
   * @param {string} params.code - Source code
   * @param {string} params.language - Programming language
   * @param {Array<Object>} params.testCases - Array of test cases
   * @param {string} params.testCases[].input - Test input
   * @param {string} params.testCases[].expectedOutput - Expected output
   * @param {number} params.timeLimit - Time limit in seconds
   * @param {number} params.memoryLimit - Memory limit in MB
   * @returns {Promise<string[]>} Array of submission tokens
   * @throws {Error} If all submissions fail
   */
  async submitCodeWithTestCases(params) {
    const {
      code,
      language = 'python',
      testCases = [],
      timeLimit = 2,
      memoryLimit = 256,
    } = params;

    // Validate code once
    this.validateCode(code);
    const languageId = this.getLanguageId(language);

    if (!Array.isArray(testCases) || testCases.length === 0) {
      throw new Error('At least one test case is required');
    }

    logger.info(
      `Submitting ${testCases.length} test cases to Judge0 (language: ${language})`
    );

    const tokens = [];
    const errors = [];

    // Submit each test case sequentially (to avoid rate limiting)
    for (let i = 0; i < testCases.length; i++) {
      try {
        const testCase = testCases[i];

        const payload = {
          language_id: languageId,
          source_code: code,
          stdin: testCase.input || '',
          expected_output: testCase.expectedOutput || testCase.output || '',
          cpu_time_limit: timeLimit,
          cpu_extra_time: 1,
          wall_time_limit: timeLimit * 2,
          memory_limit: memoryLimit * 1024,
          stack_limit: 64 * 1024, // 64 MB (Judge0 max is 128000 KB)
        };

        const response = await axios.post(
          `${this.baseURL}/submissions?base64_encoded=false&wait=false`,
          payload,
          { headers: this.getHeaders(), timeout: 10000 }
        );

        if (response.data?.token) {
          tokens.push({
            token: response.data.token,
            testCaseIndex: i,
            input: testCase.input || '',
            expectedOutput: testCase.expectedOutput || testCase.output || '',
          });
        }

        // Small delay between submissions to avoid rate limiting
        if (i < testCases.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        logger.warn(`Failed to submit test case ${i}:`, error.message);
        
        // Log response body for debugging
        if (error.response?.data) {
          logger.warn(`Judge0 response for test case ${i}:`, JSON.stringify(error.response.data));
        }
        
        errors.push({ 
          testCaseIndex: i, 
          error: error.message,
          status: error.response?.status,
          details: error.response?.data
        });
      }
    }

    if (tokens.length === 0) {
      throw new Error(
        `Failed to submit any test cases: ${errors.map((e) => e.error).join('; ')}`
      );
    }

    logger.info(`Successfully submitted ${tokens.length}/${testCases.length} test cases`);

    return tokens;
  }

  /**
   * Poll for submission result with timeout and retry logic
   * 
   * @param {string} token - Submission token
   * @param {number} maxAttempts - Maximum polling attempts (default: JUDGE0_MAX_POLL_ATTEMPTS)
   * @returns {Promise<Object>} Judge0 submission result
   * @throws {Error} If polling times out or fails
   */
  async pollSubmission(token, maxAttempts = JUDGE0_MAX_POLL_ATTEMPTS) {
    if (!token || typeof token !== 'string') {
      throw new Error('Valid submission token is required');
    }

    let attempts = 0;
    const startTime = Date.now();

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(
          `${this.baseURL}/submissions/${token}?base64_encoded=false`,
          { headers: this.getHeaders(), timeout: 10000 }
        );

        const result = response.data;

        // Status > 2 means processing is complete
        if (result.status.id > STATUS_CODES.PROCESSING) {
          logger.debug(
            `Poll successful (attempt ${attempts + 1}): token=${token}, status=${result.status.id}`
          );
          return result;
        }

        // Still processing, wait and retry
        attempts++;
        const elapsedMs = Date.now() - startTime;

        if (elapsedMs > JUDGE0_POLL_TIMEOUT_MS) {
          throw new Error(
            `Polling timeout after ${JUDGE0_POLL_TIMEOUT_MS}ms and ${attempts} attempts`
          );
        }

        logger.debug(`Polling... (attempt ${attempts}/${maxAttempts}, status: ${result.status.description})`);

        await new Promise((resolve) => setTimeout(resolve, JUDGE0_POLL_INTERVAL_MS));
      } catch (error) {
        if (error.message.includes('timeout')) {
          throw error;
        }

        logger.warn(`Poll error on attempt ${attempts + 1}:`, error.message);
        attempts++;

        if (error.response?.status === 404) {
          throw new Error(`Submission token ${token} not found on Judge0`);
        }

        if (attempts >= maxAttempts) {
          throw new Error(`Polling failed after ${maxAttempts} attempts: ${error.message}`);
        }

        await new Promise((resolve) => setTimeout(resolve, JUDGE0_POLL_INTERVAL_MS));
      }
    }

    throw new Error(
      `Polling timeout: submission still processing after ${maxAttempts} attempts`
    );
  }

  /**
   * Get results for multiple submission tokens
   * Polls each token sequentially
   * 
   * @param {Array<Object>} tokens - Array of token objects with metadata
   * @returns {Promise<Array<Object>>} Array of results with test case info
   */
  async getResultsForTokens(tokens) {
    const results = [];

    for (const tokenObj of tokens) {
      try {
        const result = await this.pollSubmission(tokenObj.token);

        results.push({
          ...result,
          testCaseIndex: tokenObj.testCaseIndex,
          input: tokenObj.input,
          expectedOutput: tokenObj.expectedOutput,
        });
      } catch (error) {
        logger.error(`Failed to get result for token ${tokenObj.token}:`, error.message);

        results.push({
          error: error.message,
          token: tokenObj.token,
          testCaseIndex: tokenObj.testCaseIndex,
          status: { id: -1, description: 'Error' },
          input: tokenObj.input,
          expectedOutput: tokenObj.expectedOutput,
        });
      }
    }

    return results;
  }

  /**
   * Execute code against a single test case (run mode)
   * Used for test-only execution without submission
   * 
   * @param {Object} params - Execution parameters
   * @returns {Promise<Object>} Formatted test result
   */
  async executeSingleTest(params) {
    const token = await this.submitCode(params);
    const result = await this.pollSubmission(token);
    return this.formatTestResult(result, params);
  }

  /**
   * Execute code against multiple test cases (run mode)
   * Used for testing code without official submission
   * 
   * @param {Object} params - Execution parameters with testCases
   * @returns {Promise<Object>} Formatted batch results
   */
  async runAgainstTestCases(params) {
    const tokens = await this.submitCodeWithTestCases(params);
    const results = await this.getResultsForTokens(tokens);
    return this.formatBatchResults(results);
  }

  /**
   * Submit solution for official judging
   * Same as runAgainstTestCases but intended for official submissions
   * 
   * @param {Object} params - Submission parameters
   * @returns {Promise<Object>} Submission verdict with all test results
   */
  async submitSolution(params) {
    return this.runAgainstTestCases(params);
  }

  /**
   * Format single test result
   * 
   * @param {Object} result - Judge0 result
   * @param {Object} params - Original parameters (contains expected output)
   * @returns {Object} Formatted result
   */
  formatTestResult(result, params = {}) {
    const statusId = result.status?.id;
    let verdict = 'wrong_answer';
    let passedTest = false;

    if (statusId === STATUS_CODES.ACCEPTED) {
      verdict = 'accepted';
      passedTest = true;
    } else if (statusId === STATUS_CODES.TIME_LIMIT_EXCEEDED) {
      verdict = 'time_limit_exceeded';
    } else if (statusId === STATUS_CODES.MEMORY_LIMIT_EXCEEDED) {
      verdict = 'memory_limit_exceeded';
    } else if (
      statusId === STATUS_CODES.COMPILATION_ERROR ||
      statusId === STATUS_CODES.RUNTIME_ERROR ||
      statusId === STATUS_CODES.INTERNAL_ERROR
    ) {
      verdict = 'runtime_error';
    }

    return {
      input: params.input || '',
      expectedOutput: params.expectedOutput || '',
      actualOutput: (result.stdout || '').trim(),
      status: verdict,
      time: result.time || 0,
      memory: result.memory || 0,
      processStatus: result.status?.description || 'Unknown',
      errorOutput: result.stderr || result.compile_output || '',
      passedTest,
    };
  }

  /**
   * Format batch test results
   * 
   * @param {Array<Object>} results - Array of Judge0 results with metadata
   * @returns {Object} Aggregated results
   */
  formatBatchResults(results) {
    if (!Array.isArray(results) || results.length === 0) {
      return {
        verdict: 'error',
        passedTests: 0,
        totalTests: 0,
        results: [],
        runtime: 0,
        memory: 0,
        error: 'No results received',
      };
    }

    let passedTests = 0;
    const totalTests = results.length;
    let maxRuntime = 0;
    let maxMemory = 0;
    const formattedResults = [];

    for (const result of results) {
      if (result.error) {
        formattedResults.push({
          input: result.input || '',
          expectedOutput: result.expectedOutput || '',
          actualOutput: '',
          status: 'error',
          time: 0,
          memory: 0,
          processStatus: result.error,
          errorOutput: result.error,
          passedTest: false,
        });
        continue;
      }

      const statusId = result.status?.id;
      const passedTest = statusId === STATUS_CODES.ACCEPTED;

      if (passedTest) {
        passedTests++;
      }

      maxRuntime = Math.max(maxRuntime, result.time || 0);
      maxMemory = Math.max(maxMemory, result.memory || 0);

      let verdict = 'wrong_answer';
      if (statusId === STATUS_CODES.ACCEPTED) {
        verdict = 'accepted';
      } else if (statusId === STATUS_CODES.TIME_LIMIT_EXCEEDED) {
        verdict = 'time_limit_exceeded';
      } else if (statusId === STATUS_CODES.MEMORY_LIMIT_EXCEEDED) {
        verdict = 'memory_limit_exceeded';
      } else if (
        [STATUS_CODES.COMPILATION_ERROR, STATUS_CODES.RUNTIME_ERROR, STATUS_CODES.INTERNAL_ERROR].includes(statusId)
      ) {
        verdict = 'runtime_error';
      }

      formattedResults.push({
        input: result.input || '',
        expectedOutput: result.expectedOutput || '',
        actualOutput: (result.stdout || '').trim(),
        status: verdict,
        time: result.time || 0,
        memory: result.memory || 0,
        processStatus: result.status?.description || 'Unknown',
        errorOutput: result.stderr || result.compile_output || '',
        passedTest,
      });
    }

    // Determine overall verdict
    let overallVerdict = 'accepted';
    if (passedTests < totalTests) {
      overallVerdict = 'wrong_answer';

      // Check for specific errors
      for (const result of formattedResults) {
        if (result.status === 'time_limit_exceeded') {
          overallVerdict = 'time_limit_exceeded';
          break;
        }
        if (result.status === 'memory_limit_exceeded') {
          overallVerdict = 'memory_limit_exceeded';
          break;
        }
        if (result.status === 'runtime_error' && overallVerdict !== 'time_limit_exceeded') {
          overallVerdict = 'runtime_error';
        }
      }
    }

    const result = {
      verdict: overallVerdict,
      passedTests,
      totalTests,
      runtime: maxRuntime,
      memory: maxMemory,
      results: formattedResults,
    };

    // Log to observability service
    AIObservabilityService.logSandboxExecution({
      verdict: overallVerdict,
      executionTime: maxRuntime * 1000, // logSandboxExecution expects ms
      memoryUsed: maxMemory / 1024,     // logSandboxExecution expects MB
    });

    return result;
  }

  // ============================================================
  // NEW: LEETCODE-STYLE WRAPPED CODE EXECUTION (LeetCode-style)
  // ============================================================

  /**
   * Deep equality comparison for JSON objects and arrays
   * Handles nested structures, arrays, objects
   * Returns true if semantically equal (ignoring order for some arrays if needed)
   * 
   * @param {*} actual - Actual output
   * @param {*} expected - Expected output
   * @returns {boolean} True if equal
   */
  deepEqual(actual, expected) {
    // Handle primitives
    if (actual === expected) return true;
    if (typeof actual !== typeof expected) return false;

    // Handle null/undefined
    if (actual == null || expected == null) return actual === expected;

    // Handle arrays
    if (Array.isArray(actual) && Array.isArray(expected)) {
      if (actual.length !== expected.length) return false;
      return actual.every((val, idx) => this.deepEqual(val, expected[idx]));
    }

    // Handle objects
    if (typeof actual === 'object' && typeof expected === 'object') {
      const actualKeys = Object.keys(actual).sort();
      const expectedKeys = Object.keys(expected).sort();

      if (actualKeys.length !== expectedKeys.length) return false;
      if (!actualKeys.every((key, idx) => key === expectedKeys[idx])) return false;

      return actualKeys.every((key) => this.deepEqual(actual[key], expected[key]));
    }

    return false;
  }

  /**
   * Wrap user code with template and replace placeholder
   * 
   * @param {string} userCode - User-written function implementation
   * @param {string} wrapperTemplate - Template with __USER_CODE__ placeholder
   * @returns {string} Wrapped code ready for execution
   * @throws {Error} If template doesn't contain placeholder
   */
  wrapCode(userCode, wrapperTemplate) {
    if (!wrapperTemplate || !wrapperTemplate.includes('__USER_CODE__')) {
      throw new Error('Wrapper template must contain __USER_CODE__ placeholder');
    }

    return wrapperTemplate.replace('__USER_CODE__', userCode);
  }

  /**
   * Run wrapped code with a single test case
   * Executes function and compares JSON output
   * 
   * @param {Object} params
   * @param {string} params.userCode - User function implementation
   * @param {string} params.language - Programming language
   * @param {string} params.wrapperTemplate - Code wrapper template
   * @param {Object} params.testInput - Input as JSON object
   * @param {*} params.expectedOutput - Expected output as JSON
   * @param {number} params.timeLimit - Time limit in seconds (default: 2)
   * @param {number} params.memoryLimit - Memory limit in MB (default: 256)
   * @returns {Promise<Object>} Test result with JSON comparison
   */
  async runWrappedTest(params) {
    const startTime = Date.now();
    const {
      userCode,
      language = 'python',
      wrapperTemplate,
      testInput,
      expectedOutput,
      timeLimit = 2,
      memoryLimit = 256,
    } = params;

    if (!userCode || !wrapperTemplate) {
      throw new Error('userCode and wrapperTemplate are required');
    }

    // Step 1: Inject user code into wrapper template
    let finalCode = wrapperTemplate.replace('__USER_CODE__', userCode);
    
    // ✅ CRITICAL: testInput should already be an object (NOT a string)
    // Only stringify when sending to Judge0 stdin
    const testInputJson = typeof testInput === 'string' ? testInput : JSON.stringify(testInput || {});
    
    logger.info(`[WRAPPED] Starting test execution (language: ${language}, input_size: ${testInputJson.length})`);

    try {
      if (language === 'python' || language === 'python3') {
        // Strategy: Replace all argv-based input reading with stdin fallback
        
        // Handle: input_data = json.loads(sys.argv[1])
        finalCode = finalCode.replace(
          /input_data\s*=\s*json\.loads\(\s*sys\.argv\[\s*1\s*\]\s*\)/,
          `# Judge0 stdin - fallback if empty use embedded data
input_str = sys.stdin.read().strip()
input_data = json.loads(input_str) if input_str else ${testInputJson}`
        );

        // Also handle if there are multiple argv usages or other patterns
        // Remove any remaining sys.argv references and use defined input_data
        finalCode = finalCode.replace(/sys\.argv\[\s*\d+\s*\]/g, `'${testInputJson}'`);
        
      } else if (language === 'javascript' || language === 'js') {
        // Replace process.argv with hardcoded input
        finalCode = finalCode.replace(
          /process\.argv\[\s*2\s*\]/g,
          `'${testInputJson}'`
        );
      }

      // Step 2: Submit code with test input via stdin
      const submitStartTime = Date.now();
      const token = await this.submitCode({
        code: finalCode,
        language,
        input: testInputJson, // Judge0 will provide this via stdin
        expectedOutput: '', // Custom JSON comparison - we do it ourselves
        timeLimit,
        memoryLimit,
      });
      const submitTime = Date.now() - submitStartTime;
      logger.debug(`[WRAPPED] Submit time: ${submitTime}ms`);

      logger.debug(`[WRAPPED] Submission token: ${token}`);

      // Step 3: Poll for result with timing
      const pollStartTime = Date.now();
      const result = await this.pollSubmission(token);
      const pollTime = Date.now() - pollStartTime;
      const statusId = result.status?.id;

      logger.debug(`[WRAPPED] Status ID: ${statusId} (${STATUS_DESCRIPTION[statusId]}), poll_time: ${pollTime}ms`);

      // Step 4: Parse output
      let actualOutput = null;
      let parseError = null;

      if (result.stdout) {
        try {
          actualOutput = JSON.parse(result.stdout.trim());
          logger.info(`[WRAPPED] ✅ Output parsed: ${JSON.stringify(actualOutput)}`);
        } catch (parseErr) {
          parseError = `Failed to parse output as JSON: ${parseErr.message}`;
          logger.warn(`[WRAPPED] Parse failed:`, parseError);
          logger.debug(`[WRAPPED] Stdout: ${result.stdout.substring(0, 300)}`);
        }
      } else if (result.stderr || result.compile_output) {
        parseError = result.stderr || result.compile_output;
        logger.warn(`[WRAPPED] Execution error:`, parseError.substring(0, 200));
      }

      // Step 5: Determine verdict
      let passedTest = false;
      let verdict = 'wrong_answer';

      if (statusId === STATUS_CODES.ACCEPTED) {
        if (parseError) {
          verdict = 'wrong_answer';
          passedTest = false;
        } else {
          passedTest = this.deepEqual(actualOutput, expectedOutput);
          verdict = passedTest ? 'accepted' : 'wrong_answer';
          logger.info(
            `[WRAPPED] Comparison: actual=${JSON.stringify(actualOutput)} | ` +
            `expected=${JSON.stringify(expectedOutput)} | matched=${passedTest}`
          );
        }
      } else if (statusId === STATUS_CODES.TIME_LIMIT_EXCEEDED) {
        verdict = 'time_limit_exceeded';
      } else if (statusId === STATUS_CODES.MEMORY_LIMIT_EXCEEDED) {
        verdict = 'memory_limit_exceeded';
      } else if (statusId === STATUS_CODES.COMPILATION_ERROR) {
        verdict = 'compilation_error';
        parseError = result.compile_output || 'Compilation failed';
      } else if (statusId === STATUS_CODES.RUNTIME_ERROR) {
        verdict = 'runtime_error';
        parseError = result.stderr || 'Runtime error';
      }

      const totalTime = Date.now() - startTime;
      logger.info(`[WRAPPED] Final verdict: ${verdict}, passed: ${passedTest}, total_time: ${totalTime}ms`);

      return {
        input: testInput,
        expectedOutput,
        actualOutput,
        verdict,
        passedTest,
        time: result.time || 0,
        memory: result.memory || 0,
        errorOutput: result.stderr || result.compile_output || '',
        parseError,
      };

    } catch (error) {
      logger.error('[WRAPPED] Execution exception:', error.message);
      logger.error('[WRAPPED] Stack:', error.stack);
      
      return {
        input: testInput,
        expectedOutput,
        actualOutput: null,
        verdict: 'error',
        passedTest: false,
        time: 0,
        memory: 0,
        errorOutput: error.message,
        parseError: error.message,
      };
    }
  }

  /**
   * Run wrapped code against multiple test cases
   * Structured LeetCode-style execution
   * 
   * @param {Object} params
   * @param {string} params.userCode - User function code
   * @param {string} params.language - Language
   * @param {string} params.wrapperTemplate - Wrapper template
   * @param {Array<Object>} params.testCases - Test cases with input/expectedOutput/visibility
   * @param {number} params.timeLimit - Time limit
   * @param {number} params.memoryLimit - Memory limit
   * @returns {Promise<Object>} Batch results
   */
  async runWrappedTests(params) {
    const {
      userCode,
      language = 'python',
      wrapperTemplate,
      testCases = [],
      timeLimit = 2,
      memoryLimit = 256,
    } = params;

    if (!userCode || !wrapperTemplate || testCases.length === 0) {
      throw new Error('userCode, wrapperTemplate, and testCases are required');
    }

    logger.info(`Running ${testCases.length} wrapped tests (language: ${language})`);

    let passedTests = 0;
    let maxRuntime = 0;
    let maxMemory = 0;
    const results = [];

    // Execute each test case
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      try {
        const result = await this.runWrappedTest({
          userCode,
          language,
          wrapperTemplate,
          testInput: testCase.input,
          expectedOutput: testCase.expectedOutput || testCase.output, // Handle both formats
          timeLimit,
          memoryLimit,
        });

        if (result.passedTest) {
          passedTests++;
        }

        maxRuntime = Math.max(maxRuntime, result.time);
        maxMemory = Math.max(maxMemory, result.memory);

        results.push({
          ...result,
          index: i,
          visibility: testCase.visibility || 'public',
        });
      } catch (error) {
        logger.warn(`Test case ${i} failed:`, error.message);
        results.push({
          index: i,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: null,
          verdict: 'error',
          passedTest: false,
          time: 0,
          memory: 0,
          errorOutput: error.message,
          visibility: testCase.visibility || 'public',
        });
      }

      // Small delay between tests
      if (i < testCases.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    // Determine overall verdict
    let overallVerdict = passedTests === testCases.length ? 'accepted' : 'wrong_answer';

    // Check for specific errors
    for (const result of results) {
      if (result.verdict === 'time_limit_exceeded') {
        overallVerdict = 'time_limit_exceeded';
        break;
      }
      if (result.verdict === 'memory_limit_exceeded') {
        overallVerdict = 'memory_limit_exceeded';
        break;
      }
      if (result.verdict === 'runtime_error' && overallVerdict !== 'time_limit_exceeded') {
        overallVerdict = 'runtime_error';
      }
    }

    logger.info(`Execution complete: ${passedTests}/${testCases.length} passed`);

    return {
      verdict: overallVerdict,
      passedTests,
      totalTests: testCases.length,
      runtime: maxRuntime,
      memory: maxMemory,
      results,
    };
  }

  /**
   * Submit wrapped solution (same as run, but for official submission)
   * Used when user clicks "Submit"
   * 
   * @param {Object} params - Same as runWrappedTests
   * @returns {Promise<Object>} Submission verdict
   */
  async submitWrappedSolution(params) {
    return this.runWrappedTests(params);
  }
}

export default new Judge0Service();
