/**
 * Deep Dive Analysis - User Submissions Schema
 * Analyze what data is actually stored vs what's needed
 */

import axios from 'axios';
import mongoose from 'mongoose';

const MONGO_URI = 'mongodb://localhost:27017/prepmate-ai-studio';

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  Submissions Schema Analysis          ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Get user
    const userCollection = db.collection('users');
    const user = await userCollection.findOne({ email: 'jay@gmail.com' });
    
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log(`User: ${user.email} (${user._id})\n`);

    // Get a sample submission
    const submissionCollection = db.collection('externalplatformsubmissions');
    const submission = await submissionCollection.findOne({ userId: user._id });

    if (submission) {
      console.log('Sample Submission Document:');
      console.log(JSON.stringify(submission, null, 2));
      
      console.log('\n\n✓ Data Present:');
      const fields = [
        'userId', 'problemTitle', 'problemId', 'isAccepted', 
        'difficulty', 'submissionDate', 'language', 'platform'
      ];
      fields.forEach(field => {
        const value = submission[field];
        console.log(`  - ${field}: ${value !== undefined ? '✓' : '✗'}`);
      });

      console.log('\n✗ Data Missing:');
      const missingFields = [
        'topics', 'tags', 'category', 'problemDescription',
        'solutionCode', 'executionTime', 'memoryUsage'
      ];
      missingFields.forEach(field => {
        const value = submission[field];
        console.log(`  - ${field}: ${value !== undefined && value !== null && value.length > 0 ? '✓' : '✗'}`);
      });
    } else {
      console.log('No submissions found');
    }

    // Get all submissions for this user
    console.log('\n\n╔════════════════════════════════════════╗');
    console.log('║  All User Submissions                 ║');
    console.log('╚════════════════════════════════════════╝\n');

    const allSubmissions = await submissionCollection
      .find({ userId: user._id })
      .toArray();

    console.log(`Total submissions: ${allSubmissions.length}\n`);

    // Check what topics are present
    const topicsPresent = new Set();
    const tagsPresent = new Set();
    
    allSubmissions.forEach(sub => {
      if (sub.topics && Array.isArray(sub.topics)) {
        sub.topics.forEach(t => topicsPresent.add(t));
      }
      if (sub.tags && Array.isArray(sub.tags)) {
        sub.tags.forEach(t => tagsPresent.add(t));
      }
    });

    console.log(`Topics found: ${topicsPresent.size}`);
    if (topicsPresent.size > 0) {
      Array.from(topicsPresent).slice(0, 10).forEach(t => {
        console.log(`  - ${t}`);
      });
    } else {
      console.log('  (none)');
    }

    console.log(`\nTags found: ${tagsPresent.size}`);
    if (tagsPresent.size > 0) {
      Array.from(tagsPresent).slice(0, 10).forEach(t => {
        console.log(`  - ${t}`);
      });
    } else {
      console.log('  (none)');
    }

    // Get LeetCode integration info
    console.log('\n\n╔════════════════════════════════════════╗');
    console.log('║  LeetCode Integration Details         ║');
    console.log('╚════════════════════════════════════════╝\n');

    const integrationCollection = db.collection('integrationaccounts');
    const leetcodeIntegration = await integrationCollection.findOne({
      userId: user._id,
      platform: 'leetcode'
    });

    if (leetcodeIntegration) {
      console.log('LeetCode Integration Info:');
      console.log(`  Username: ${leetcodeIntegration.platformUsername || 'N/A'}`);
      console.log(`  Connected: ${leetcodeIntegration.createdAt}`);
      console.log(`  Last Synced: ${leetcodeIntegration.lastSynced || 'Never'}`);
      console.log(`  Status: ${leetcodeIntegration.status || 'N/A'}`);
    }

    // Check sync logs
    console.log('\n\n╔════════════════════════════════════════╗');
    console.log('║  Integration Sync Logs                ║');
    console.log('╚════════════════════════════════════════╝\n');

    const syncCollection = db.collection('integrationsynclogs');
    const syncLogs = await syncCollection
      .find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    if (syncLogs.length > 0) {
      console.log(`Found ${syncLogs.length} sync logs:\n`);
      syncLogs.forEach((log, i) => {
        console.log(`${i + 1}. ${log.createdAt}`);
        console.log(`   Status: ${log.status}`);
        console.log(`   Message: ${log.message || 'N/A'}`);
        console.log(`   Records Synced: ${log.recordsSynced || 0}`);
        if (log.error) {
          console.log(`   Error: ${log.error}`);
        }
        console.log();
      });
    } else {
      console.log('No sync logs found');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
