/**
 * Complete Database Schema & Example Data
 * Shows all collections, fields, and example documents for user jay@gmail.com
 */

import mongoose from 'mongoose';

const MONGO_URI = 'mongodb://localhost:27017/prepmate-ai-studio';
const USER_EMAIL = 'jay@gmail.com';

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                    DATABASE SCHEMA & EXAMPLE DATA                            ║
║                   Complete System Architecture Overview                       ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    `);

    // Get user
    const userCollection = db.collection('users');
    const user = await userCollection.findOne({ email: USER_EMAIL });

    if (!user) {
      console.log(`User ${USER_EMAIL} not found`);
      return;
    }

    const userId = user._id.toString();

    // ============================================================================
    // PART 1: CORE USER COLLECTION
    // ============================================================================
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 1. USERS COLLECTION - Core User Information                                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    `);

    console.log(`\nCollection: "users"
Purpose: Core user profile and authentication data
Documents: ${await userCollection.countDocuments()}

Schema Fields:
  _id                 ObjectId       Unique user identifier
  email              String         User email (unique)
  name               String         User full name
  password           String         Hashed password (bcrypt)
  avatar             String/Null    Avatar URL
  role               String         User role (admin/user)
  targetCompanies   String         Companies user want to join
  preparationTimeline String        Timeline (e.g., "3-6 months")
  createdAt          Date           Account creation timestamp
  updatedAt          Date           Last update timestamp
  lastLogin          Date           Last login timestamp

Example Document (${USER_EMAIL}):
${JSON.stringify(user, null, 2).split('\n').slice(0, 20).join('\n')}
...
    `);

    // ============================================================================
    // PART 2: EXTERNAL PLATFORM PROFILE
    // ============================================================================
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 2. INTEGRATIONACCOUNTS COLLECTION - Third-Party Integrations                 ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    `);

    const integrationCollection = db.collection('integrationaccounts');
    const integrations = await integrationCollection
      .find({ userId: user._id })
      .toArray();

    console.log(`\nCollection: "integrationaccounts"
Purpose: External platform connections (LeetCode, CodeForces, etc.)
Documents for this user: ${integrations.length}

Schema Fields:
  _id                  ObjectId       Unique identifier
  userId              ObjectId       Reference to users._id
  platform            String         Platform name (leetcode, codeforces)
  platformUsername    String         Username on external platform
  platformUserId      String         User ID on external platform
  accessToken         String         OAuth access token (encrypted)
  status              String         Connection status (active, inactive)
  createdAt           Date           When connected
  lastSynced          Date/Null      Last data sync timestamp

Example Document (LeetCode):`);

    if (integrations.length > 0) {
      const example = JSON.stringify(integrations[0], null, 2);
      console.log(example.split('\n').slice(0, 15).join('\n'));
    } else {
      console.log('  (No integrations found for user)');
    }

    // ============================================================================
    // PART 3: SUBMISSIONS COLLECTION
    // ============================================================================
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 3. EXTERNALPLATFORMSUBMISSIONS COLLECTION - Problem Submissions              ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    `);

    const submissionCollection = db.collection('externalplatformsubmissions');
    const submissions = await submissionCollection
      .find({ userId: user._id })
      .toArray();

    console.log(`\nCollection: "externalplatformsubmissions"
Purpose: User's problem-solving submissions from external platforms
Documents for this user: ${submissions.length}

Schema Fields:
  _id                ObjectId       Unique identifier
  userId             ObjectId       Reference to users._id
  platform           String         Source platform (leetcode)
  platformSubmissionId String      Submission ID on platform
  problemId          String         Problem ID on platform
  problemTitle       String         Problem name
  difficulty         String         Easy/Medium/Hard
  difficultyLevel    Number         1-3 difficulty rating
  status             String         accepted/rejected
  tags               Array<String>  Problem tags/categories
  submissionTime     Date           When problem was solved
  runtime_ms         Number         Execution time
  memory_kb          Number         Memory used
  language           String/Null    Programming language
  createdAt          Date           Record created
  updatedAt          Date           Last updated

Example Document (First Submission):`);

    if (submissions.length > 0) {
      const example = JSON.stringify(submissions[0], null, 2);
      console.log(example.split('\n').slice(0, 25).join('\n'));
    }

    console.log(`

Total stats:
  Submissions: ${submissions.length}
  Accepted: ${submissions.filter(s => s.status === 'accepted').length}
  By Difficulty:
    - Easy: ${submissions.filter(s => s.difficulty === 'Easy').length}
    - Medium: ${submissions.filter(s => s.difficulty === 'Medium').length}
    - Hard: ${submissions.filter(s => s.difficulty === 'Hard').length}
    `);

    // ============================================================================
    // PART 4: MASTERY PROFILES (ML OUTPUT)
    // ============================================================================
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 4. TOPIC_MASTERY COLLECTION - AI-Generated Mastery Profiles                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    `);

    const masteryCollection = db.collection('topic_mastery');
    const masteryRecords = await masteryCollection
      .find({ userId: user._id })
      .toArray();

    console.log(`\nCollection: "topic_mastery"
Purpose: ML-calculated skill mastery for each topic
Documents for this user: ${masteryRecords.length}

Schema Fields:
  _id                     ObjectId       Unique identifier
  userId                  ObjectId       Reference to users._id
  topicId                 String         Topic identifier (arrays, trees, etc.)
  mastery_probability     Number         0-1, skill level
  confidence_score        Number         0-1, confidence in estimate
  improvement_trend       String         improving/stable/declining
  attempts_count          Number         Total attempts on topic
  last_attempt_timestamp  String         ISO timestamp
  recommended_difficulty  String         Next recommended difficulty
  updatedAt               Date           Last recalculation

Calculation Method: Bayesian Knowledge Tracing (BKT)
  - Analyzes problem-solving attempts
  - Tracks success/failure patterns
  - Estimates probability user "knows" the skill
  - Updates after each new submission

Example Document (If Available):`);

    if (masteryRecords.length > 0) {
      const topTopics = masteryRecords
        .sort((a, b) => b.mastery_probability - a.mastery_probability)
        .slice(0, 3);

      topTopics.forEach((record, i) => {
        console.log(`\n  Topic ${i + 1}: ${record.topicId}`);
        console.log(`  ${JSON.stringify(record, null, 2).split('\n').slice(0, 12).join('\n  ')}`);
      });

      console.log(`

Overall Mastery Summary:
  Topics Analyzed: ${masteryRecords.length}`);

      const stats = {
        strong: masteryRecords.filter(r => r.mastery_probability > 0.7).length,
        medium: masteryRecords.filter(r => r.mastery_probability > 0.4 && r.mastery_probability <= 0.7).length,
        weak: masteryRecords.filter(r => r.mastery_probability <= 0.4).length,
      };

      console.log(`  ⭐ Strong (>70%): ${stats.strong}`);
      console.log(`  ◐ Medium (40-70%): ${stats.medium}`);
      console.log(`  ◯ Weak (<40%): ${stats.weak}`);

      const avg = masteryRecords.reduce((s, r) => s + r.mastery_probability, 0) / masteryRecords.length;
      console.log(`  📊 Average Mastery: ${(avg * 100).toFixed(1)}%`);
    } else {
      console.log('  (No mastery profiles generated yet)');
    }

    // ============================================================================
    // PART 5: REVISION SCHEDULE (RETENTION MODEL)
    // ============================================================================
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 5. REVISION_SCHEDULE COLLECTION - Spaced Repetition Scheduling               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    `);

    const revisionCollection = db.collection('revision_schedule');
    const revisions = await revisionCollection
      .find({ userId: user._id })
      .toArray();

    console.log(`\nCollection: "revision_schedule"
Purpose: Spaced repetition scheduling based on Ebbinghaus forgetting curve
Documents for this user: ${revisions.length}

Schema Fields:
  _id                   ObjectId       Unique identifier
  userId                ObjectId       Reference to users._id
  topicId               String         Topic to revise
  retention_probability Number         0-1, memory retention estimate
  stability_score       Number         Memory stability (higher = more stable)
  nextRevisionDate      String         When to revise next (ISO date)
  lastRevisionDate      String         Last revision timestamp
  isSuccessful          Boolean        Did last attempt succeed
  revisionCount         Number         Total revision attempts
  days_until_revision   Number         Days until next review
  urgency_level         String         high/medium/low
  updatedAt             Date           Last update

Algorithm: Ebbinghaus Forgetting Curve
  - Tracks memory decay over time
  - Optimal review intervals calculated
  - Next review scheduled when learning is ~50% forgotten

Example Documents (If Available):`);

    if (revisions.length > 0) {
      const examples = revisions.slice(0, 2);
      examples.forEach((rev, i) => {
        console.log(`\n  Revision ${i + 1}: ${rev.topicId}`);
        console.log(`    Next Review: ${rev.nextRevisionDate}`);
        console.log(`    Retention: ${(rev.retention_probability * 100).toFixed(1)}%`);
        console.log(`    Urgency: ${rev.urgency_level}`);
      });
    } else {
      console.log('  (No revision schedules yet)');
    }

    // ============================================================================
    // PART 6: WEAKNESS DETECTION
    // ============================================================================
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 6. WEAK_TOPIC_SIGNALS COLLECTION - Weakness Analysis                         ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    `);

    const weaknessCollection = db.collection('weak_topic_signals');
    const weaknesses = await weaknessCollection
      .find({ userId: user._id })
      .toArray();

    console.log(`\nCollection: "weak_topic_signals"
Purpose: Identifies struggling areas requiring intervention
Documents for this user: ${weaknesses.length}

Schema Fields:
  _id             ObjectId       Unique identifier
  userId          ObjectId       Reference to users._id
  topicId         String         Topic area
  riskScore       Number         0-100, failure risk
  signalType      String         low_accuracy / high_time / low_attempt
  factors         Object         Breakdown of risk factors
  priority        String         critical/high/medium/low
  suggestedAction String         Recommended action
  detectedAt      Date           When weakness detected

Risk Calculation:
  - Accuracy factor: Success rate on problems
  - Time factor: Excessive time spent on problems
  - Attempt factor: Too many attempts before success
  - Knowledge factor: Mastery probability below threshold

Example Documents (If Available):`);

    if (weaknesses.length > 0) {
      const examples = weaknesses.slice(0, 2);
      examples.forEach((w, i) => {
        console.log(`\n  Weakness ${i + 1}: ${w.topicId}`);
        console.log(`    Risk Score: ${w.riskScore.toFixed(1)}/100`);
        console.log(`    Priority: ${w.priority}`);
        console.log(`    Signal: ${w.signalType}`);
      });
    } else {
      console.log('  (No weakness signals detected)');
    }

    // ============================================================================
    // PART 7: COMPLETE DATA FLOW DIAGRAM
    // ============================================================================
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 7. COMPLETE DATA FLOW ARCHITECTURE                                           ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    `);

    console.log(`
DATA FLOW DIAGRAM:
═════════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                    USER REGISTRATION                           │
├─────────────────────────────────────────────────────────────────┤
│  Input: email, password, name                                   │
│  ↓                                                              │
│  Store: users collection (encrypted password)                  │
│  Output: userId, JWT token                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│          LEETCODE INTEGRATION CONNECTION                        │
├─────────────────────────────────────────────────────────────────┤
│  Input: LeetCode username                                       │
│  ↓                                                              │
│  Store: integrationaccounts collection                          │
│  Fetch: User's problems & submissions via LeetCode API          │
│  ↓                                                              │
│  Store: externalplatformsubmissions collection (20 docs)        │
│  Output: Structured submission data with:                       │
│          - problemId, problemTitle, difficulty                  │
│          - status (accepted), tags, timestamp                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│        AI SERVICE - MASTERY CALCULATION (FastAPI)              │
├─────────────────────────────────────────────────────────────────┤
│  Algorithm: Bayesian Knowledge Tracing (BKT)                   │
│  ↓                                                              │
│  For each topic in submissions:                                 │
│    - Collect all attempts for that topic                        │
│    - Apply BKT formula for each attempt                         │
│    - Calculate mastery probability + confidence                 │
│    - Store result in MongoDB                                    │
│  ↓                                                              │
│  Store: topic_mastery collection (5 docs for jay)               │
│  Output: mastery_probability (0-1 scale)                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│    AI SERVICE - RETENTION SCHEDULING (FastAPI)                 │
├─────────────────────────────────────────────────────────────────┤
│  Algorithm: Ebbinghaus Forgetting Curve                         │
│  ↓                                                              │
│  For each mastery record:                                       │
│    - Calculate memory decay over time                           │
│    - Optimal review interval determined                         │
│    - Next revision date calculated                              │
│  ↓                                                              │
│  Store: revision_schedule collection                            │
│  Output: When to study each topic next                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│    AI SERVICE - WEAKNESS DETECTION (FastAPI)                   │
├─────────────────────────────────────────────────────────────────┤
│  Algorithm: Multi-factor Risk Analysis                          │
│  ↓                                                              │
│  For each topic:                                                │
│    - Low mastery probability → risk signal                      │
│    - High failure rate → risk signal                            │
│    - Excessive time spent → risk signal                         │
│    - Few attempts with high failure → risk signal               │
│    - Calculate weighted risk score                              │
│  ↓                                                              │
│  Store: weak_topic_signals collection                           │
│  Output: Topics needing intervention                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│        FRONTEND - INTELLIGENT DASHBOARD                         │
├─────────────────────────────────────────────────────────────────┤
│  Display:                                                       │
│    - Overall mastery across all topics                          │
│    - Strong areas (mastery > 70%)                               │
│    - Weak areas (mastery < 40%)                                 │
│    - Next topics to revise (from revision_schedule)             │
│    - Intervention recommendations (from weak_topic_signals)    │
│    - Perfect revision timing (spaced repetition)                │
└─────────────────────────────────────────────────────────────────┘

═════════════════════════════════════════════════════════════════════════════════
    `);

    // ============================================================================
    // PART 8: COLLECTION SUMMARY
    // ============================================================================
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 8. COLLECTION STATISTICS & INDEXES                                           ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    `);

    const collections = [
      { name: 'users', description: 'User profiles' },
      { name: 'integrationaccounts', description: 'External integrations' },
      { name: 'externalplatformsubmissions', description: 'Problem submissions' },
      { name: 'topic_mastery', description: 'Mastery profiles' },
      { name: 'revision_schedule', description: 'Revision schedule' },
      { name: 'weak_topic_signals', description: 'Weakness analysis' },
      { name: 'mentor_conversations', description: 'Chat history' },
      { name: 'code_reviews', description: 'Code review feedback' },
      { name: 'interview_sessions', description: 'Interview practice' },
      { name: 'learning_content', description: 'Generated notes' },
    ];

    console.log('\nCollections in prepmate-ai-studio database:\n');
    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`  ${coll.name.padEnd(35)} ${count.toString().padStart(5)} documents  (${coll.description})`);
    }

    console.log(`

Indexes Created for Performance:
  users:
    - _id (unique)
    - email (unique)
  
  externalplatformsubmissions:
    - userId, platform (compound)
    - problemId
  
  topic_mastery:
    - userId (indexed for fast user lookup)
    - (userId, topicId) (unique compound)
  
  revision_schedule:
    - userId, nextRevisionDate (for calculating what to review)
  
  weak_topic_signals:
    - userId, riskScore (for finding weakest areas)
    `);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
