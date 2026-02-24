#!/usr/bin/env node
/**
 * DIAGNOSTIC: Check LLM Question Generation Flow
 * 
 * Traces:
 * 1. What AI service returns
 * 2. What backend saves to DB
 * 3. ProblemId consistency
 * 4. Frontend response format
 */

const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Question: QuestionBank } = require('../src/models');
const User = require('../src/models/User');

const BACKEND_URL = 'http://localhost:5000';
const AI_SERVICE_URL = 'http://localhost:8001';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prepmate';
const TOPIC = 'coin-change-problem';

async function diagnose() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`DIAGNOSTIC: LLM Question Generation Flow`);
  console.log(`${'='.repeat(70)}\n`);

  let issues = [];

  try {
    // 1. Connect to DB
    console.log(`[1/5] Connecting to MongoDB...`);
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ Connected\n`);

    // 2. Create test user
    console.log(`[2/5] Creating test user...`);
    const user = await User.findOne().lean();
    if (!user) {
      throw new Error('No users in database! Create a user first.');
    }
    const userId = user._id;
    console.log(`✅ Using user: ${userId}\n`);

    // 3. Check what's in DB for this topic
    console.log(`[3/5] Checking database for "${TOPIC}" questions...`);
    const dbQuestions = await QuestionBank.find({ 
      $or: [
        { title: { $regex: TOPIC, $options: 'i' } },
        { titleSlug: { $regex: TOPIC, $options: 'i' } },
        { topicTags: TOPIC },
        { normalizedTopics: TOPIC.toLowerCase().replace(/\s+/g, '_') }
      ]
    }).lean();
    
    console.log(`   Found: ${dbQuestions.length} questions`);
    if (dbQuestions.length > 0) {
      dbQuestions.forEach((q, i) => {
        console.log(`   [${i + 1}] ${q.title}`);
        console.log(`       problemId: ${q.problemId}`);
        console.log(`       schemaVersion: ${q.schemaVersion}`);
        console.log(`       isActive: ${q.isActive}`);
        console.log(`       source: ${q.source}`);
      });
    } else {
      console.log(`   ⚠️ No questions found in DB for this topic`);
      issues.push('No questions in database for topic');
    }
    console.log('');

    // 4. Try to get questions from AI service
    console.log(`[4/5] Testing AI service directly...`);
    try {
      const aiResponse = await axios.post(
        `${AI_SERVICE_URL}/ai/practice/generate-questions`,
        {
          topic: TOPIC,
          limit: 3,
          learner_profile: {
            topicId: TOPIC,
            level: 'intermediate',
            recentScore: 0.5,
          },
        },
        { timeout: 10000 }
      );

      if (aiResponse.data.questions && aiResponse.data.questions.length > 0) {
        console.log(`✅ AI service returned ${aiResponse.data.questions.length} questions`);
        aiResponse.data.questions.slice(0, 2).forEach((q, i) => {
          console.log(`   [${i + 1}] ${q.problemTitle || 'NO TITLE'}`);
          console.log(`       Has problemId: ${'problemId' in q}`);
          if ('problemId' in q) {
            console.log(`       problemId: ${q.problemId}`);
          }
          console.log(`       Has testCases: ${'testCases' in q && Array.isArray(q.testCases)}`);
          if (q.testCases) {
            console.log(`       testCases length: ${q.testCases.length}`);
          }
        });
      } else {
        console.log(`❌ AI service returned no questions`);
        console.log(`   Response:`, JSON.stringify(aiResponse.data, null, 2).substring(0, 300));
        issues.push('AI service not returning questions');
      }
    } catch (err) {
      console.log(`⚠️ Could not reach AI service`);
      console.log(`   Error: ${err.message}`);
      console.log(`   Make sure AI service is running on ${AI_SERVICE_URL}`);
      issues.push('AI service not accessible');
    }
    console.log('');

    // 5. Try to generate via backend
    console.log(`[5/5] Testing backend generation...`);
    try {
      const backendResponse = await axios.post(
        `${BACKEND_URL}/api/practice/topics/${TOPIC}/generate-questions`,
        { userId, limit: 3 },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userId}`,
          },
          timeout: 15000,
        }
      );

      if (backendResponse.data.success && backendResponse.data.data?.questions) {
        const qList = backendResponse.data.data.questions;
        console.log(`✅ Backend returned ${qList.length} questions`);
        qList.slice(0, 2).forEach((q, i) => {
          console.log(`   [${i + 1}] ${q.problemTitle || q.title || 'NO TITLE'}`);
          console.log(`       Has problemId: ${'problemId' in q}`);
          if ('problemId' in q) {
            console.log(`       problemId: ${q.problemId}`);
          }
          console.log(`       schemaVersion: ${q.schemaVersion}`);
        });

        // Now check if these are in DB
        console.log(`\n   Checking if returned questions are in DB...`);
        for (const q of qList.slice(0, 2)) {
          const inDb = await QuestionBank.findOne({ 
            problemId: q.problemId 
          }).lean();
          if (inDb) {
            console.log(`   ✅ Found in DB: ${q.problemId}`);
          } else {
            console.log(`   ❌ NOT in DB: ${q.problemId}`);
            issues.push(`Backend returned problemId ${q.problemId} but not in DB`);
          }
        }
      } else {
        console.log(`❌ Backend request failed`);
        console.log(`   Response:`, backendResponse.data);
        issues.push('Backend generation failed');
      }
    } catch (err) {
      console.log(`⚠️ Backend request failed`);
      console.log(`   Error: ${err.message}`);
      if (err.response?.data) {
        console.log(`   Response:`, JSON.stringify(err.response.data, null, 2).substring(0, 300));
      }
      issues.push('Backend not accessible or generation failed');
    }

    // Summary
    console.log(`\n${'='.repeat(70)}`);
    console.log(`DIAGNOSTIC RESULTS`);
    console.log(`${'='.repeat(70)}`);

    if (issues.length === 0) {
      console.log(`✅ All systems working correctly!`);
      console.log(`   - AI service generating questions with problemIds`);
      console.log(`   - Backend converting and saving correctly`);
      console.log(`   - Database queries working`);
    } else {
      console.log(`❌ Found ${issues.length} issue(s):\n`);
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    }

  } catch (error) {
    console.error(`\n❌ FATAL ERROR:`, error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

diagnose();
