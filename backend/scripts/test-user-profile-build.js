/**
 * User Profile Build & AI Integration Test
 * Tests: User → LeetCode → AI Service → Mastery Profile
 * 
 * Flow:
 * 1. Login user (jay@gmail.com / 123456)
 * 2. Check LeetCode integration status
 * 3. Get user's submissions/problems
 * 4. Send data to AI service for processing
 * 5. Verify ML calculations and profile generation
 * 6. Log all issues and missing data
 */

import axios from 'axios';
import mongoose from 'mongoose';
import crypto from 'crypto';

const API_BASE = 'http://localhost:8000';
const MONGO_URI = 'mongodb://localhost:27017/prepmate-ai-studio';
const AI_SERVICE_URL = 'http://localhost:8001';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

const log = {
  title: (msg) => console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}\n${colors.blue}${msg}${colors.reset}\n${colors.blue}${'='.repeat(70)}${colors.reset}\n`),
  section: (msg) => console.log(`\n${colors.cyan}► ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  json: (obj) => console.log(JSON.stringify(obj, null, 2)),
  value: (label, value) => console.log(`   ${label}: ${colors.magenta}${value}${colors.reset}`),
};

let issues = [];
let missingThings = [];

function addIssue(category, message, details) {
  issues.push({ category, message, details });
  log.error(`[${category}] ${message}`);
  if (details) log.info(`   Details: ${details}`);
}

function addMissing(message) {
  missingThings.push(message);
  log.warn(`Missing: ${message}`);
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║   User Profile Build & AI Integration Test                        ║
║   Checking data flow: User → LeetCode → AI Service → ML Profile   ║
╚════════════════════════════════════════════════════════════════════╝
  `);

  try {
    await mongoose.connect(MONGO_URI);
    log.success('MongoDB connected');

    const db = mongoose.connection.db;
    let authToken = null;
    let userId = null;
    let userData = null;

    // ============================================================================
    // STEP 1: LOGIN USER
    // ============================================================================
    log.title('STEP 1: USER AUTHENTICATION');
    
    try {
      log.section('Logging in as jay@gmail.com');
      const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
        email: 'jay@gmail.com',
        password: '123456',
      });

      if (loginResponse.data.success && loginResponse.data.token) {
        authToken = loginResponse.data.token;
        userId = loginResponse.data.user.id;  // Extract from user object
        log.success(`User authenticated: ${loginResponse.data.user.email}`);
        log.value('User ID', userId);
        log.value('Name', loginResponse.data.user.name);
        log.value('Role', loginResponse.data.user.role);
        log.value('Token', authToken.substring(0, 50) + '...');
      } else {
        addIssue('AUTH', 'Login failed or invalid response', loginResponse.data.message);
        throw new Error('Authentication failed');
      }
    } catch (error) {
      addIssue('AUTH', 'Cannot authenticate user', error.message);
      throw error;
    }

    // ============================================================================
    // STEP 2: GET USER PROFILE
    // ============================================================================
    log.title('STEP 2: USER PROFILE INFORMATION');

    try {
      log.section('Fetching user profile from database');
      const userCollection = db.collection('users');
      userData = await userCollection.findOne({ _id: new mongoose.Types.ObjectId(userId) });

      if (userData) {
        log.success(`User profile found`);
        log.value('Email', userData.email);
        log.value('Name', userData.name || 'N/A');
        log.value('Account Created', userData.createdAt);
        log.value('Last Login', userData.lastLogin || 'Never');
      } else {
        addIssue('PROFILE', 'User profile not found in database', `User ID: ${userId}`);
      }
    } catch (error) {
      addIssue('PROFILE', 'Error fetching user profile', error.message);
    }

    // ============================================================================
    // STEP 3: CHECK LEETCODE INTEGRATION
    // ============================================================================
    log.title('STEP 3: LEETCODE INTEGRATION STATUS');

    let leetcodeProfile = null;
    let submissions = [];

    try {
      log.section('Checking LeetCode integration');
      const integrationCollection = db.collection('integrationaccounts');
      leetcodeProfile = await integrationCollection.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        platform: 'leetcode',
      });

      if (leetcodeProfile) {
        log.success('LeetCode account connected');
        log.value('LeetCode Username', leetcodeProfile.platformUsername);
        log.value('Connected At', leetcodeProfile.createdAt);
        log.value('Last Synced', leetcodeProfile.lastSynced || 'Never');
        
        // Check sync status
        if (leetcodeProfile.lastSynced) {
          const lastSync = new Date(leetcodeProfile.lastSynced);
          const daysSinceSync = (Date.now() - lastSync) / (1000 * 60 * 60 * 24);
          log.value('Days since last sync', daysSinceSync.toFixed(2));
          
          if (daysSinceSync > 7) {
            addMissing('LeetCode data might be outdated (last synced >7 days ago)');
          }
        } else {
          addMissing('LeetCode data has never been synced');
        }
      } else {
        addIssue('LEETCODE', 'LeetCode account not connected', `User ID: ${userId}`);
      }
    } catch (error) {
      addIssue('LEETCODE', 'Error checking LeetCode integration', error.message);
    }

    // ============================================================================
    // STEP 4: GET USER'S SUBMISSIONS AND PROBLEMS
    // ============================================================================
    log.title('STEP 4: USER SUBMISSIONS & PROBLEM DATA');

    try {
      log.section('Fetching user submissions from LeetCode');
      const submissionCollection = db.collection('externalplatformsubmissions');
      
      submissions = await submissionCollection
        .find({ userId: new mongoose.Types.ObjectId(userId) })
        .toArray();

      log.success(`Found ${submissions.length} submissions`);
      
      if (submissions.length === 0) {
        addMissing('No submissions found - user may not have solved any problems');
      } else {
        // Analyze submissions
        const solved = submissions.filter(s => s.isAccepted).length;
        const byDifficulty = {
          easy: 0,
          medium: 0,
          hard: 0,
        };
        
        submissions.forEach(s => {
          const diff = (s.difficulty || 'unknown').toLowerCase();
          if (diff in byDifficulty) byDifficulty[diff]++;
        });

        log.info(`Total submissions: ${submissions.length}`);
        log.info(`  - Accepted: ${solved}`);
        log.info(`  - Easy: ${byDifficulty.easy}`);
        log.info(`  - Medium: ${byDifficulty.medium}`);
        log.info(`  - Hard: ${byDifficulty.hard}`);

        // Check for missing metadata
        const withoutTopic = submissions.filter(s => !s.topics || s.topics.length === 0);
        const withoutDifficulty = submissions.filter(s => !s.difficulty);
        const withoutTags = submissions.filter(s => !s.tags || s.tags.length === 0);

        if (withoutTopic.length > 0) {
          addMissing(`${withoutTopic.length} submissions missing topic information`);
        }
        if (withoutDifficulty.length > 0) {
          addMissing(`${withoutDifficulty.length} submissions missing difficulty level`);
        }
        if (withoutTags.length > 0) {
          addMissing(`${withoutTags.length} submissions missing tags`);
        }
      }
    } catch (error) {
      addIssue('SUBMISSIONS', 'Error fetching submissions', error.message);
    }

    // ============================================================================
    // STEP 5: SEND DATA TO AI SERVICE FOR PROFILE GENERATION
    // ============================================================================
    log.title('STEP 5: AI SERVICE DATA POPULATION');

    let aiResponses = {};

    if (submissions.length > 0) {
      try {
        log.section('Sending user data to AI service for mastery calculation');
        
        // Group submissions by topic
        const topicMap = {};
        submissions.forEach(submission => {
          const topics = submission.topics || [];
          topics.forEach(topic => {
            if (!topicMap[topic]) {
              topicMap[topic] = [];
            }
            topicMap[topic].push({
              correct: submission.isAccepted,
              difficulty: submission.difficulty === 'Easy' ? 1 : submission.difficulty === 'Medium' ? 2 : 3,
              hints_used: 0,
              time_ms: Math.random() * 60000, // Estimate
            });
          });
        });

        log.info(`Topics identified: ${Object.keys(topicMap).length}`);

        // Send mastery data for each topic
        for (const [topic, attempts] of Object.entries(topicMap)) {
          try {
            log.section(`Sending mastery data for topic: ${topic}`);
            
            const response = await axios.post(`${AI_SERVICE_URL}/ai/ml/mastery/update`, {
              user_id: userId,
              topic_id: topic.replace(/\s+/g, '_').toLowerCase(),
              attempts: attempts,
              learning_level: 'intermediate',
            });

            if (response.data.success && response.data.data) {
              aiResponses[topic] = response.data.data;
              log.success(`Mastery calculated: ${(response.data.data.mastery_probability * 100).toFixed(1)}%`);
              log.value('Confidence', (response.data.data.confidence_score * 100).toFixed(1) + '%');
              log.value('Trend', response.data.data.improvement_trend);
              log.value('Recommended Difficulty', response.data.data.recommended_difficulty);
            } else {
              addIssue('AI_RESPONSE', `Invalid AI response for topic ${topic}`, JSON.stringify(response.data));
            }
          } catch (error) {
            addIssue('AI_SERVICE', `Error sending mastery data for ${topic}`, error.message);
          }
        }
      } catch (error) {
        addIssue('AI_SERVICE', 'Error in AI data population step', error.message);
      }
    } else {
      addMissing('No submissions to send to AI service');
    }

    // ============================================================================
    // STEP 6: VERIFY PROFILE IN MONGODB
    // ============================================================================
    log.title('STEP 6: INTELLIGENT PROFILE VERIFICATION');

    try {
      log.section('Checking generated mastery profiles in MongoDB');
      
      const masteryCollection = db.collection('topic_mastery');
      const userMasteryRecords = await masteryCollection
        .find({ userId: new mongoose.Types.ObjectId(userId) })
        .toArray();

      if (userMasteryRecords.length > 0) {
        log.success(`Found ${userMasteryRecords.length} mastery records`);
        
        userMasteryRecords.forEach((record, i) => {
          log.info(`\n  Topic ${i + 1}: ${record.topicId}`);
          log.value('    Mastery Probability', (record.mastery_probability * 100).toFixed(1) + '%');
          log.value('    Confidence', (record.confidence_score * 100).toFixed(1) + '%');
          log.value('    Trend', record.improvement_trend);
          log.value('    Attempts Count', record.attempts_count);
          log.value('    Last Update', record.last_attempt_timestamp);
        });
      } else {
        addMissing('No mastery profiles found in MongoDB');
      }
    } catch (error) {
      addIssue('PROFILE', 'Error fetching mastery profiles', error.message);
    }

    // ============================================================================
    // STEP 7: CHECK RETENTION & WEAKNESS DATA
    // ============================================================================
    log.title('STEP 7: RETENTION & WEAKNESS ANALYSIS');

    try {
      log.section('Checking retention schedules');
      const retentionCollection = db.collection('revision_schedule');
      const userRetention = await retentionCollection
        .find({ userId: new mongoose.Types.ObjectId(userId) })
        .toArray();

      if (userRetention.length > 0) {
        log.success(`Found ${userRetention.length} retention records`);
      } else {
        addMissing('No retention schedule records found');
      }

      log.section('Checking weakness signals');
      const weaknessCollection = db.collection('weak_topic_signals');
      const userWeakness = await weaknessCollection
        .find({ userId: new mongoose.Types.ObjectId(userId) })
        .toArray();

      if (userWeakness.length > 0) {
        log.success(`Found ${userWeakness.length} weakness records`);
        userWeakness.forEach((w, i) => {
          log.info(`  ${i + 1}. ${w.topicId}: Risk Score ${w.riskScore.toFixed(2)}`);
        });
      } else {
        addMissing('No weakness analysis records found');
      }
    } catch (error) {
      addIssue('ANALYSIS', 'Error fetching retention/weakness data', error.message);
    }

    // ============================================================================
    // STEP 8: OVERALL PROFILE STATISTICS
    // ============================================================================
    log.title('STEP 8: OVERALL PROFILE STATISTICS');

    try {
      const masteryCollection = db.collection('topic_mastery');
      const allMastery = await masteryCollection
        .find({ userId: new mongoose.Types.ObjectId(userId) })
        .toArray();

      if (allMastery.length > 0) {
        const avgMastery = allMastery.reduce((sum, m) => sum + m.mastery_probability, 0) / allMastery.length;
        const avgConfidence = allMastery.reduce((sum, m) => sum + m.confidence_score, 0) / allMastery.length;
        const strongTopics = allMastery.filter(m => m.mastery_probability > 0.7).length;
        const weakTopics = allMastery.filter(m => m.mastery_probability < 0.4).length;

        log.success('Profile Statistics Generated');
        log.value('Total Topics Analyzed', allMastery.length);
        log.value('Average Mastery', (avgMastery * 100).toFixed(1) + '%');
        log.value('Average Confidence', (avgConfidence * 100).toFixed(1) + '%');
        log.value('Strong Topics (>70%)', strongTopics);
        log.value('Weak Topics (<40%)', weakTopics);

        log.section('Topic Breakdown');
        allMastery
          .sort((a, b) => b.mastery_probability - a.mastery_probability)
          .slice(0, 5)
          .forEach((m, i) => {
            const status = m.mastery_probability > 0.7 ? '⭐' : m.mastery_probability > 0.4 ? '◐' : '◯';
            log.info(`  ${i + 1}. ${status} ${m.topicId}: ${(m.mastery_probability * 100).toFixed(1)}%`);
          });
      } else {
        addMissing('No mastery data to calculate overall statistics');
      }
    } catch (error) {
      addIssue('STATS', 'Error calculating statistics', error.message);
    }

    // ============================================================================
    // FINAL REPORT
    // ============================================================================
    log.title('FINAL REPORT');

    console.log(`${colors.green}ISSUES FOUND: ${issues.length}${colors.reset}`);
    if (issues.length > 0) {
      issues.forEach((issue, i) => {
        console.log(`\n${i + 1}. [${colors.red}${issue.category}${colors.reset}] ${issue.message}`);
        if (issue.details) {
          console.log(`   ${issue.details}`);
        }
      });
    } else {
      log.success('No critical issues found');
    }

    console.log(`\n${colors.yellow}MISSING ITEMS: ${missingThings.length}${colors.reset}`);
    if (missingThings.length > 0) {
      missingThings.forEach((item, i) => {
        console.log(`${i + 1}. ${item}`);
      });
    } else {
      log.success('No missing items');
    }

    console.log(`
${colors.cyan}Summary:${colors.reset}
  User Authentication: ${authToken ? '✅' : '❌'}
  LeetCode Connected: ${leetcodeProfile ? '✅' : '❌'}
  Submissions Found: ${submissions.length > 0 ? '✅' : '❌'}
  AI Mastery Calculated: ${Object.keys(aiResponses).length > 0 ? '✅' : '❌'}
  Profile Created: ${issues.length === 0 && missingThings.length < 3 ? '✅' : '⚠️'}
    `);

    await mongoose.connection.close();
    process.exit(issues.length > 0 || missingThings.length > 3 ? 1 : 0);
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
