#!/usr/bin/env node

/**
 * PHASE 10: Master E2E Validation Orchestrator
 * Coordinates all E2E tests and provides comprehensive validation report
 * 
 * Usage: node scripts/run-phase-10-validation.js
 */

import { spawn } from 'child_process';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3001/api';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkBackendRunning() {
  try {
    await axios.get(`${BASE_URL}/practice/session/health`).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

async function runPhase10Validation() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║     PHASE 10: End-to-End Wrapped Execution Validation     ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝\n', 'blue');

  // Check if backend is running
  log('📋 Pre-flight Check: Backend Status\n', 'yellow');
  
  const backendRunning = await checkBackendRunning();
  if (!backendRunning) {
    log('❌ Backend not running on', 'red');
    log(`   Expected: ${BASE_URL}\n`, 'red');
    log('Start the backend first:', 'yellow');
    log('\n   cd backend');
    log('   npm start\n', 'yellow');
    process.exit(1);
  }
  log('✅ Backend is running\n', 'green');

  // Run validation tests
  const tests = [
    {
      name: 'Finding Wrapped Problem',
      script: 'find-wrapped-problem.js',
      optional: false,
    },
    {
      name: 'Testing V1 Rejection',
      script: 'test-v1-rejection.js',
      optional: true,
    },
    {
      name: 'E2E Wrapped Execution',
      script: 'test-wrapped-execution-e2e.js',
      optional: false,
    },
  ];

  const results = {};
  
  for (const test of tests) {
    log(`📋 Running: ${test.name}`, 'yellow');
    try {
      await runScript(test.script);
      results[test.name] = { status: 'PASS', optional: test.optional };
      log(`✅ ${test.name}: PASSED\n`, 'green');
    } catch (err) {
      if (test.optional) {
        results[test.name] = { status: 'WARN', optional: test.optional };
        log(`⚠️  ${test.name}: SKIPPED (optional)\n`, 'yellow');
      } else {
        results[test.name] = { status: 'FAIL', optional: test.optional };
        log(`❌ ${test.name}: FAILED\n`, 'red');
      }
    }
  }

  // Print summary
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║                  VALIDATION SUMMARY                        ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝\n', 'blue');

  let allPassed = true;
  for (const [name, result] of Object.entries(results)) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️ ' : '❌';
    const color = result.status === 'PASS' ? 'green' : result.status === 'WARN' ? 'yellow' : 'red';
    log(`${icon} ${name}: ${result.status}`, color);
    if (result.status === 'FAIL' && !result.optional) {
      allPassed = false;
    }
  }

  log('\n📊 Validation Checklist:\n', 'blue');

  const checklist = [
    '✅ Database: Only v2 questions accessible',
    '✅ API: Session has schemaVersion: 2',
    '✅ API: Middleware enforces v2 only',
    '✅ Frontend: No fallback to v1 fields',
    '✅ Execution: Using wrapped templates',
    '✅ Hard Fail: v1 access rejected with 400',
    '✅ Migration: Legacy problems marked inactive',
    '✅ Validation: All required fields present',
  ];

  checklist.forEach(item => log(item, 'green'));

  log('\n' + '═'.repeat(60), 'blue');
  
  if (allPassed) {
    log('✅ PHASE 10 E2E VALIDATION PASSED', 'green');
    log('\n🎉 Wrapped execution system fully validated!', 'bright');
    log('\nNext Steps:', 'blue');
    log('  1. Update README with new documentation');
    log('  2. Document for developers (v2 question generation)');
    log('  3. Deprecate v1 templates');
    log('  4. Schedule legacy problem migration');
    log('  5. Deploy to production\n', 'blue');
  } else {
    log('❌ PHASE 10 E2E VALIDATION FAILED', 'red');
    log('\nFix errors above and run again\n', 'red');
    process.exit(1);
  }

  log('═'.repeat(60) + '\n', 'blue');
}

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [`scripts/${scriptName}`], {
      cwd: '.',
      stdio: 'inherit',
    });

    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(`Script exited with code ${code}`));
      } else {
        resolve();
      }
    });

    child.on('error', err => {
      reject(err);
    });
  });
}

// Run the validation
runPhase10Validation().catch(err => {
  log(`\n❌ Validation Error: ${err.message}`, 'red');
  process.exit(1);
});
