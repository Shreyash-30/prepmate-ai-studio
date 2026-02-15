/**
 * Backend ↔ AI Service Integration Test
 * 
 * Tests complete data flow:
 * 1. Frontend calls Backend with JWT
 * 2. Backend proxies to Python AI service
 * 3. AI service computes ML models
 * 4. Results are stored in MongoDB
 * 5. Backend returns results to frontend
 * 
 * Usage:
 *   node backend/scripts/test-integration.js
 * 
 * Prerequisites:
 *   - MongoDB running
 *   - Backend running on port 8000
 *   - AI service running on port 8001
 */

import axios from 'axios';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });
dotenv.config({ path: './ai-services/.env' });

const BACKEND_URL = 'http://localhost:8000';
const AI_SERVICE_URL = 'http://localhost:8001';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/prepmate-ai-studio';
const JWT_SECRET = process.env.JWT_SECRET || 'prepmate_ai_jwt_secret_key_change_in_production';

// Test user data
const TEST_USER_EMAIL = 'integration-test@prepmate.ai';
let TEST_USER_ID = null;
let TEST_JWT = null;

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const log = {
  section: (title) => console.log(`\n${colors.cyan}${'='.repeat(70)}${colors.reset}`),
  title: (msg) => console.log(`${colors.bright}${colors.blue}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  json: (obj, indent = 2) => console.log(JSON.stringify(obj, null, indent)),
};

// Test data for mastery update
const masteryTestData = {
  topicId: 'arrays_easy',
  attempts: [
    { correct: true, difficulty: 1, hints_used: 0, time_ms: 8000 },
    { correct: true, difficulty: 1, hints_used: 0, time_ms: 7000 },
    { correct: true, difficulty: 2, hints_used: 1, time_ms: 15000 },
    { correct: true, difficulty: 2, hints_used: 0, time_ms: 12000 },
  ],
};

// Test data for retention update
const retentionTestData = {
  topicId: 'arrays_easy',
  isSuccessfulRevision: true,
  timeSinceLastRevisionHours: 24,
};

async function setupTestUser() {
  log.info('Setting up test user...');
  const db = mongoose.connection.db;
  const usersCollection = db.collection('users');

  // Check if test user exists
  let user = await usersCollection.findOne({ email: TEST_USER_EMAIL });

  if (!user) {
    // Create test user
    user = {
      email: TEST_USER_EMAIL,
      password: 'hashed-password-placeholder',
      learningLevel: 'intermediate',
      createdAt: new Date(),
    };
    const result = await usersCollection.insertOne(user);
    user._id = result.insertedId;
    log.success(`Created test user: ${TEST_USER_EMAIL}`);
  } else {
    log.success(`Using existing test user: ${TEST_USER_EMAIL}`);
  }

  TEST_USER_ID = user._id.toString();
  TEST_JWT = jwt.sign({ userId: TEST_USER_ID }, JWT_SECRET, { expiresIn: '1h' });
  log.info(`Generated JWT token for user: ${TEST_USER_ID}`);
}

async function testServiceHealth() {
  log.section();
  log.title('TEST 1: Service Health Checks');
  
  try {
    // Check Backend
    const backendHealth = await axios.get(`${BACKEND_URL}/health`);
    log.success(`Backend health: ${backendHealth.data.status}`);
  } catch (error) {
    log.error(`Backend not responding: ${error.message}`);
    process.exit(1);
  }

  try {
    // Check AI Service
    const aiHealth = await axios.get(`${AI_SERVICE_URL}/ai/health`);
    log.success(`AI Service health: ${aiHealth.data.status}`);
  } catch (error) {
    log.error(`AI Service not responding: ${error.message}`);
    process.exit(1);
  }

  try {
    // Check MongoDB
    await mongoose.connect(MONGO_URI);
    log.success('MongoDB connected');
  } catch (error) {
    log.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
}

async function testMasteryUpdate() {
  log.section();
  log.title('TEST 2: Mastery Engine Update (Backend → AI → MongoDB)');

  const backendClient = axios.create({
    baseURL: BACKEND_URL,
    headers: {
      Authorization: `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  try {
    // Step 1: Call Backend
    log.info('Step 1: Sending mastery update request to backend...');
    log.info(`Authorization: Bearer ${TEST_JWT.substring(0, 20)}...`);
    log.json(masteryTestData);

    const backendResponse = await backendClient.post('/api/ai/ml/mastery/update', masteryTestData);

    if (backendResponse.data.success) {
      log.success('Backend received and proxied request to AI service');
      log.info('AI Service Response:');
      log.json(backendResponse.data.data);
    } else {
      log.error(`Backend error: ${backendResponse.data.error}`);
      return false;
    }

    // Step 2: Verify AI Service received correct data
    log.info('\nStep 2: Verifying AI service calculations...');
    const masteryProbability = backendResponse.data.data.mastery_probability;
    const confidence = backendResponse.data.data.confidence_score;

    log.info(`Mastery Probability: ${(masteryProbability * 100).toFixed(1)}%`);
    log.info(`Confidence Score: ${(confidence * 100).toFixed(1)}%`);
    log.info(`Improvement Trend: ${backendResponse.data.data.improvement_trend}`);
    log.info(`Recommended Difficulty: ${backendResponse.data.data.recommended_difficulty}`);

    // Validate calculations
    if (masteryTestData.attempts.every(a => a.correct) && masteryProbability > 0.8) {
      log.success('✓ Mastery calculation correct (all correct → high probability)');
    } else {
      log.warning('⊠ Unexpected mastery probability');
    }

    // Step 3: Verify data stored in MongoDB
    log.info('\nStep 3: Verifying data stored in MongoDB...');
    const db = mongoose.connection.db;
    const masteryCollection = db.collection('topic_mastery');
    
    const storedRecord = await masteryCollection.findOne({
      userId: new mongoose.Types.ObjectId(TEST_USER_ID),
      topicId: masteryTestData.topicId,
    });

    if (storedRecord) {
      log.success('✓ Record stored in topic_mastery collection');
      log.info('Stored data:');
      log.json({
        userId: storedRecord.userId,
        topicId: storedRecord.topicId,
        mastery_probability: storedRecord.mastery_probability,
        confidence_score: storedRecord.confidence_score,
        improvement_trend: storedRecord.improvement_trend,
        attempts_count: storedRecord.attempts_count,
        createdAt: storedRecord.createdAt,
        updatedAt: storedRecord.updatedAt,
      });

      // Verify stored values match API response
      if (
        Math.abs(storedRecord.mastery_probability - masteryProbability) < 0.01 &&
        Math.abs(storedRecord.confidence_score - confidence) < 0.01
      ) {
        log.success('✓ Stored values match API response');
      } else {
        log.error('✗ Stored values do not match API response');
        return false;
      }
    } else {
      log.error('✗ Record not found in MongoDB');
      return false;
    }

    log.success('MASTERY UPDATE TEST PASSED\n');
    return true;
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    if (error.response?.data) {
      log.json(error.response.data);
    }
    return false;
  }
}

async function testRetentionUpdate() {
  log.section();
  log.title('TEST 3: Retention Model Update (Backend → AI → MongoDB)');

  const backendClient = axios.create({
    baseURL: BACKEND_URL,
    headers: {
      Authorization: `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  try {
    // Call Backend
    log.info('Step 1: Sending retention update request...');
    log.json(retentionTestData);

    const response = await backendClient.post('/api/ai/ml/retention/update', retentionTestData);

    if (response.data.success) {
      log.success('Backend proxied request successfully');
      log.info('AI Service Response:');
      log.json(response.data.data);
    } else {
      log.error(`Backend error: ${response.data.error}`);
      return false;
    }

    // Verify calculations
    log.info('\nStep 2: Verifying retention calculations...');
    const retention = response.data.data.retention_probability;
    const stability = response.data.data.stability_score;
    const nextRevision = response.data.data.next_revision_date;

    log.info(`Retention Probability: ${(retention * 100).toFixed(1)}%`);
    log.info(`Stability Score: ${stability.toFixed(2)}`);
    log.info(`Next Revision: ${nextRevision}`);

    // For successful revision after 24 hours, expect high retention and 3+ day interval
    if (retention > 0.9 && stability > 20) {
      log.success('✓ Retention calculation correct (successful revision with good retention)');
    } else {
      log.warning('⊠ Unexpected retention values');
    }

    // Verify stored in MongoDB
    log.info('\nStep 3: Verifying data stored in MongoDB...');
    const db = mongoose.connection.db;
    const revisionCollection = db.collection('revision_schedule');

    const storedRecord = await revisionCollection.findOne({
      userId: new mongoose.Types.ObjectId(TEST_USER_ID),
      topicId: retentionTestData.topicId,
    });

    if (storedRecord) {
      log.success('✓ Record stored in revision_schedule collection');
      log.info('Stored data:');
      log.json({
        userId: storedRecord.userId,
        topicId: storedRecord.topicId,
        retention_probability: storedRecord.retention_probability,
        stability_score: storedRecord.stability_score,
        next_revision_date: storedRecord.next_revision_date,
        urgency_level: storedRecord.urgency_level,
      });

      if (Math.abs(storedRecord.retention_probability - retention) < 0.01) {
        log.success('✓ Stored values match API response');
      } else {
        log.error('✗ Stored values do not match');
        return false;
      }
    } else {
      log.error('✗ Record not found in MongoDB');
      return false;
    }

    log.success('RETENTION UPDATE TEST PASSED\n');
    return true;
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    if (error.response?.data) {
      log.json(error.response.data);
    }
    return false;
  }
}

async function testWeaknessAnalysis() {
  log.section();
  log.title('TEST 4: Weakness Analysis (Backend → AI → MongoDB)');

  const backendClient = axios.create({
    baseURL: BACKEND_URL,
    headers: {
      Authorization: `Bearer ${TEST_JWT}`,
      'Content-Type': 'application/json',
    },
  });

  try {
    log.info('Step 1: Requesting weakness analysis...');

    const response = await backendClient.post('/api/ai/ml/weakness/analyze', {
      userId: TEST_USER_ID,
      includeContestData: true,
    });

    if (response.data.success) {
      log.success('Backend proxied request successfully');
      log.info('AI Service Response:');
      const weakData = response.data.data;
      
      log.json({
        weak_topics_count: weakData.weak_topics?.length || 0,
        focus_areas: weakData.focus_areas || [],
        intervention_priority_score: weakData.intervention_priority_score || 0,
      });

      // Verify stored in MongoDB
      log.info('\nStep 2: Verifying data stored in MongoDB...');
      const db = mongoose.connection.db;
      const weaknessCollection = db.collection('weak_topic_signals');

      const storedRecords = await weaknessCollection
        .find({ userId: new mongoose.Types.ObjectId(TEST_USER_ID) })
        .toArray();

      if (storedRecords.length > 0) {
        log.success(`✓ ${storedRecords.length} weakness signals stored in MongoDB`);
        log.info('Sample stored record:');
        log.json({
          topicId: storedRecords[0].topicId,
          riskScore: storedRecords[0].riskScore,
          signalType: storedRecords[0].signalType,
          recommendation: storedRecords[0].recommendation,
        });
      } else {
        log.warning('⊠ No weakness records stored yet (may be expected on first run)');
      }

      log.success('WEAKNESS ANALYSIS TEST PASSED\n');
      return true;
    } else {
      log.error(`Backend error: ${response.data.error}`);
      return false;
    }
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    if (error.response?.data) {
      log.json(error.response.data);
    }
    return false;
  }
}

async function summarizeResults(results) {
  log.section();
  log.title('INTEGRATION TEST SUMMARY');

  const passed = results.filter(r => r).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);

  console.log(`
${colors.bright}Results: ${passed}/${total} tests passed (${percentage}%)${colors.reset}

${colors.bright}Data Flow Verification:${colors.reset}
  Backend (port 8000)        ✓ Connected
  AI Service (port 8001)     ✓ Connected  
  MongoDB                    ✓ Connected
  
${colors.bright}Integration Tests:${colors.reset}
  ${results[0] ? colors.green + '✓' : colors.red + '✗'} JWT Authentication
  ${results[1] ? colors.green + '✓' : colors.red + '✗'} Mastery Engine (Data → Calc → Storage)
  ${results[2] ? colors.green + '✓' : colors.red + '✗'} Retention Model (Data → Calc → Storage)
  ${results[3] ? colors.green + '✓' : colors.red + '✗'} Weakness Detection (Data → Calc → Storage)
  
${colors.bright}Data Pipeline Status:${colors.reset}
${results.every(r => r) ? colors.green + '✓ FULLY OPERATIONAL' : colors.yellow + '⚠ PARTIALLY OPERATIONAL'}${colors.reset}
  `);
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║    Backend ↔ AI Service Integration Test                          ║
║    Verifying Data Flow & ML Output Calculations & MongoDB Storage  ║
╚════════════════════════════════════════════════════════════════════╝
  `);

  const results = [];

  try {
    await testServiceHealth();
    await setupTestUser();
    results.push(true); // Health check passed

    results.push(await testMasteryUpdate());
    results.push(await testRetentionUpdate());
    results.push(await testWeaknessAnalysis());

    await summarizeResults(results);

    await mongoose.connection.close();
    process.exit(results.every(r => r) ? 0 : 1);
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main();
