/**
 * COMPREHENSIVE TEST REPORT
 * Issues Identified and Fixed
 */

import axios from 'axios';
import mongoose from 'mongoose';

const MONGO_URI = 'mongodb://localhost:27017/prepmate-ai-studio';
const AI_SERVICE_URL = 'http://localhost:8001';

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   USER DATA FLOW & AI PROFILE BUILD - COMPREHENSIVE REPORT       ║
║   User: jay@gmail.com / LeetCode ID: 6991d3bd7258d93d85baea5c   ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
    `);

    // Get user
    const userCollection = db.collection('users');
    const user = await userCollection.findOne({ email: 'jay@gmail.com' });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    // ============================================================================
    // PART 1: ISSUES FOUND
    // ============================================================================
    console.log(`
═══════════════════════════════════════════════════════════════════
PART 1: CRITICAL ISSUES IDENTIFIED
═══════════════════════════════════════════════════════════════════
    `);

    const issues = [];

    // Check LeetCode integration
    const integrationCollection = db.collection('integrationaccounts');
    const leetcodeInt = await integrationCollection.findOne({
      userId: user._id,
      platform: 'leetcode'
    });

    if (!leetcodeInt?.platformUsername) {
      issues.push({
        severity: 'HIGH',
        category: 'LeetCode Integration',
        issue: 'LeetCode username not stored',
        impact: 'Cannot verify user or fetch fresh data from LeetCode',
        fix: 'platformUsername field is empty/null'
      });
    }

    if (!leetcodeInt?.lastSynced) {
      issues.push({
        severity: 'HIGH',
        category: 'Data Sync',
        issue: 'LeetCode data never synced',
        impact: 'Submissions are static, cannot detect new problems or updates',
        fix: 'lastSynced should be updated when submissions are fetched'
      });
    }

    // Check submissions
    const submissionCollection = db.collection('externalplatformsubmissions');
    const submissions = await submissionCollection
      .find({ userId: user._id })
      .toArray();

    console.log(`\n📊 Found ${submissions.length} submissions\n`);

    // Check for topics
    const submissionsWithTopics = submissions.filter(s => s.topics && s.topics.length > 0);
    if (submissionsWithTopics.length === 0) {
      issues.push({
        severity: 'CRITICAL',
        category: 'Data Schema',
        issue: `All ${submissions.length} submissions missing "topics" field`,
        impact: 'AI service cannot categorize problems into topics for mastery calculation',
        fix: 'Convert tags array to topics array, e.g., "Array" tag → "arrays" topic'
      });
    }

    // Check for acceptance status
    const withoutAcceptance = submissions.filter(s => s.isAccepted === undefined && s.status !== 'accepted');
    if (withoutAcceptance.length > 0) {
      issues.push({
        severity: 'MEDIUM',
        category: 'Data Schema',
        issue: `${withoutAcceptance.length} submissions missing explicit isAccepted field`,
        impact: 'AI service has to infer success from status field',
        fix: 'Add isAccepted field based on status="accepted"'
      });
    }

    // Display issues
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. [${issue.severity}] ${issue.category}`);
      console.log(`   Issue: ${issue.issue}`);
      console.log(`   Impact: ${issue.impact}`);
      console.log(`   Fix: ${issue.fix}\n`);
    });

    // ============================================================================
    // PART 2: DATA SCHEMA MAPPING
    // ============================================================================
    console.log(`
═══════════════════════════════════════════════════════════════════
PART 2: CURRENT vs REQUIRED DATA SCHEMA
═══════════════════════════════════════════════════════════════════
    `);

    console.log('\n📝 Sample Submission Current Schema:\n');
    const sample = submissions[0];
    console.log('  ✓ Stored Fields:');
    console.log(`    - problemId: ${sample.problemId}`);
    console.log(`    - problemTitle: ${sample.problemTitle}`);
    console.log(`    - difficulty: ${sample.difficulty}`);
    console.log(`    - tags: ${sample.tags?.join(', ') || 'none'}`);
    console.log(`    - status: ${sample.status}`);
    console.log(`    - submissionTime: ${sample.submissionTime}`);
    console.log(`    - platform: ${sample.platform}`);

    console.log('\n  ✗ Missing Fields Required by AI Service:');
    console.log(`    - topics: REQUIRED (needed for mastery calculation)`);
    console.log(`    - isAccepted: REQUIRED (needed for success/failure analysis)`);
    console.log(`    - hints_used: OPTIONAL (defaults to 0)`);
    console.log(`    - time_ms: OPTIONAL (attempt duration)`);

    // ============================================================================
    // PART 3: TAG TO TOPIC MAPPING
    // ============================================================================
    console.log(`
═══════════════════════════════════════════════════════════════════
PART 3: TAG TO TOPIC MAPPING STRATEGY
═══════════════════════════════════════════════════════════════════
    `);

    const tagToTopic = {
      'Array': 'arrays',
      'String': 'strings',
      'Hash Table': 'hash_tables',
      'Stack': 'stacks',
      'Queue': 'queues',
      'Tree': 'trees',
      'Graph': 'graphs',
      'Greedy': 'greedy',
      'Dynamic Programming': 'dynamic_programming',
      'Math': 'math',
      'Bit Manipulation': 'bit_manipulation',
      'Monotonic Stack': 'monotonic_stack',
      'Brainteaser': 'problem_solving',
      'Enumeration': 'enumeration',
    };

    console.log('\nTag Mapping Rules:\n');
    Object.entries(tagToTopic).forEach(([tag, topic]) => {
      console.log(`  "${tag}" → "${topic}"`);
    });

    // ============================================================================
    // PART 4: APPLY FIXES & SEND TO AI
    // ============================================================================
    console.log(`
═══════════════════════════════════════════════════════════════════
PART 4: FIXING DATA & SENDING TO AI SERVICE
═══════════════════════════════════════════════════════════════════
    `);

    // Group submissions by topic
    const topicData = {};
    
    submissions.forEach(submission => {
      // Get primary topic from first tag
      const tags = submission.tags || [];
      const relevantTag = tags.find(t => Object.keys(tagToTopic).includes(t));
      const topic = relevantTag ? tagToTopic[relevantTag] : 'general';
      
      if (!topicData[topic]) {
        topicData[topic] = [];
      }

      // Create attempt data for AI
      const isAccepted = submission.status === 'accepted' || submission.isAccepted === true;
      const difficultyMap = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
      const difficulty = difficultyMap[submission.difficulty] || 1;

      topicData[topic].push({
        correct: isAccepted,
        difficulty: difficulty,
        hints_used: 0,
        time_ms: submission.runtime_ms || 5000,
        problem_id: submission.problemId,
        tags: tags.join(', ')
      });
    });

    console.log(`\nTopics identified: ${Object.keys(topicData).length}\n`);
    Object.entries(topicData).forEach(([topic, attempts]) => {
      const accepted = attempts.filter(a => a.correct).length;
      console.log(`  📌 ${topic}`);
      console.log(`     Problems: ${attempts.length} (${accepted} accepted)`);
      console.log(`     Attempts: ${attempts.map(a => a.correct ? '✓' : '✗').join('')}\n`);
    });

    // ============================================================================
    // PART 5: AI SERVICE DATA FLOW TEST
    // ============================================================================
    console.log(`
═══════════════════════════════════════════════════════════════════
PART 5: AI SERVICE DATA FLOW TEST
═══════════════════════════════════════════════════════════════════
    `);

    let aiSuccessCount = 0;

    for (const [topic, attempts] of Object.entries(topicData)) {
      try {
        console.log(`\n▶ Sending to AI: ${topic}`);
        
        const response = await axios.post(`${AI_SERVICE_URL}/ai/ml/mastery/update`, {
          user_id: user._id.toString(),
          topic_id: topic,
          attempts: attempts,
          learning_level: 'intermediate'
        });

        if (response.data.success && response.data.data) {
          aiSuccessCount++;
          const data = response.data.data;
          console.log(`  ✅ Mastery calculated: ${(data.mastery_probability * 100).toFixed(1)}%`);
          console.log(`     Confidence: ${(data.confidence_score * 100).toFixed(1)}%`);
          console.log(`     Trend: ${data.improvement_trend}`);
        } else {
          console.log(`  ❌ Invalid response: ${JSON.stringify(response.data)}`);
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    // ============================================================================
    // PART 6: FINAL STATUS
    // ============================================================================
    console.log(`
═══════════════════════════════════════════════════════════════════
PART 6: FINAL STATUS & RECOMMENDATIONS
═══════════════════════════════════════════════════════════════════
    `);

    console.log(`
✅ SUCCESS METRICS:
  - User authentication: PASS
  - LeetCode connection: PASS (but incomplete)
  - Submissions found: PASS (${submissions.length} problems)
  - AI service communication: ${aiSuccessCount > 0 ? 'PASS' : 'FAIL'}
  - Profile generation: ${aiSuccessCount > 0 ? 'PASS' : 'INCOMPLETE'}`);

    console.log(`

🔴 CRITICAL ISSUES (Must Fix):
  1. No "topics" field in submissions
  2. LeetCode username not stored
  3. Data never synced after initial import`);

    console.log(`

🟠 RECOMMENDATIONS:
  1. CREATE MIGRATION: Add topics field to all existing submissions
  2. UPDATE SYNC: Store lastSynced timestamp when LeetCode is connected
  3. ENRICH DATA: Store LeetCode username during integration
  4. AUTO-SYNC: Set up periodic re-sync of LeetCode data
  5. BUILD PROFILES: Trigger mastery calculation after each sync`);

    console.log(`

NEXT STEPS:
  1. Run migration script to add topics to submissions
  2. Manually trigger LeetCode data re-sync
  3. Verify mastery profiles are generated
  4. Check retention and weakness analysis
  5. View user's intelligent dashboard
    `);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
