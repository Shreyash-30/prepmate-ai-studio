import mongoose from 'mongoose';
import { TopicMastery, WeakTopicSignal, RevisionSchedule, AdaptiveStudyPlan } from '../models/MLIntelligence.js';
import PracticeAttemptEvent from '../models/PracticeAttemptEvent.js';
import QuestionBank from '../models/QuestionBank.js';
import RevisionSession from '../models/RevisionSession.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import axios from 'axios';

/**
 * GET /api/revision/queue
 * Fetches prioritized revision schedule with deterministic ordering
 */
export const getRevisionQueue = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Fetch user config for interview weight
    const user = await User.findById(userId);
    let interviewWeight = 0;
    
    // Basic heuristics for compression factor (0.0 to 1.0)
    // Could parse preparationTimeline for exact dates
    const phase = user?.preparationPhase || 'exploration';
    if (phase === 'interview-ready' || phase === 'refinement') {
      interviewWeight = 0.8;
    } else if (phase === 'practice') {
      interviewWeight = 0.4;
    }

    // Attempt to grab schedules
    const schedules = await RevisionSchedule.find({ userId: String(userId) }).lean();
    if (!schedules || schedules.length === 0) {
      return res.status(200).json({ success: true, prioritizedTopics: [] });
    }

    // Grab all mastery and weakness signals to join in memory
    const masteries = await TopicMastery.find({ userId: String(userId) }).lean();
    const weaknesses = await WeakTopicSignal.find({ userId: String(userId) }).lean();

    const masteryMap = new Map(masteries.map(m => [m.topicId, m]));
    const weaknessMap = new Map(weaknesses.map(w => [w.topicId, w]));

    let prioritizedTopics = schedules.map(schedule => {
      const topicId = schedule.topicId;
      const mastery = masteryMap.get(topicId);
      const weakness = weaknessMap.get(topicId);

      const retention = schedule.retention_probability || 1.0;
      const riskScore = weakness?.riskScore || 0;
      const masteryProb = mastery?.mastery_probability || 0;
      const stability = schedule.stability_score || 3.0;

      // Priority formula
      let priority = (1 - retention) * 0.5 + (riskScore / 100) * 0.3 + interviewWeight * 0.2;

      // Overdue clamp
      const now = new Date();
      if (schedule.next_revision_date && new Date(schedule.next_revision_date) < now) {
        priority += 0.1; // small boost for overdue
      }

      // reason
      let reasonForRecommendation = "Spaced repetition due.";
      if (riskScore > 60) {
        reasonForRecommendation = "High weakness risk detected.";
      } else if (retention < 0.5) {
        reasonForRecommendation = "Retention dropping rapidly.";
      }

      return {
        topicId,
        retentionProbability: retention,
        stabilityScore: stability,
        masteryProbability: masteryProb,
        riskScore,
        urgencyLevel: schedule.urgency_level || 'low',
        revisionPriority: priority,
        reasonForRecommendation,
        nextRevisionDate: schedule.next_revision_date,
      };
    });

    prioritizedTopics.sort((a, b) => b.revisionPriority - a.revisionPriority);

    res.status(200).json({ success: true, prioritizedTopics });
  } catch (error) {
    logger.error('Error fetching revision queue:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch queue', error: error.message });
  }
};

/**
 * POST /api/revision/start
 * Generates deterministic array of problems (solved, reinforcement, validation)
 * Requires { topicId }
 */
export const startRevision = async (req, res) => {
  try {
    const { topicId } = req.body;
    const userId = req.user._id;

    if (!topicId) {
      return res.status(400).json({ success: false, message: 'Topic ID required' });
    }

    // 1. Fetch user's solved problems for topic
    const userAttempts = await PracticeAttemptEvent.find({
      userId,
      topicId,
      correctness: true
    }).populate('problemId').lean();

    // Map of unique solved problemIds
    const solvedProblemIds = Array.from(new Set(userAttempts.map(a => a.problemId)));

    // Try to get QuestionBank full instances for these solved ones to ensure they're available
    const solvedQbDocs = await QuestionBank.find({
      problemId: { $in: solvedProblemIds },
      schemaVersion: 2,
      isActive: true
    }).lean();
    
    const validSolvedIds = solvedQbDocs.map(qb => qb.problemId);

    // Filter attempts for stats
    const solvedStatsMap = new Map();
    userAttempts.forEach(a => {
      if (validSolvedIds.includes(a.problemId)) {
         if (!solvedStatsMap.has(a.problemId)) {
           solvedStatsMap.set(a.problemId, {
             problemId: a.problemId,
             firstAttemptAt: a.createdAt,
             hintsUsed: 0,
             attempts: 0,
             doc: solvedQbDocs.find(q => q.problemId === a.problemId)
           });
         }
         const entry = solvedStatsMap.get(a.problemId);
         entry.hintsUsed += a.hintsUsed;
         entry.attempts += a.attempts;
      }
    });

    const solvedStatsArray = Array.from(solvedStatsMap.values());
    // Sort logic to deterministic selection
    // Oldest solved, highest hints, highest attempts
    solvedStatsArray.sort((a, b) => {
      // higher hint dependency first
      if (b.hintsUsed !== a.hintsUsed) return b.hintsUsed - a.hintsUsed;
      // then oldest
      if (a.firstAttemptAt < b.firstAttemptAt) return -1;
      return 1;
    });

    // 2. Determine compression or not
    let solvedCount = 1;
    let reinforceCount = 1;
    let validateCount = 1; 

    // E.g. 50% solved, 30% reinforce, 20% validate -> out of 2 or 3 total problems
    // For a typical revision of 3 problems: 1 old solved, 1 reinforce, 1 validation

    const selectedSolvedDocs = solvedStatsArray.slice(0, solvedCount).map(s => s.doc);

    // 3. Find reinforcement problems (same topic, same diff, not solved recently)
    // For simplicity just find by topic, difficulty matched to average solved
    const reinforceQbDocs = await QuestionBank.find({
      normalizedTopics: topicId,
      schemaVersion: 2,
      isActive: true,
      problemId: { $nin: validSolvedIds },
      difficulty: { $in: ['Easy', 'Medium'] } // arbitrary heuristics
    }).limit(reinforceCount).lean();

    // 4. Find validation problem (Medium/Hard, not solved)
    const validateQbDocs = await QuestionBank.find({
      normalizedTopics: topicId,
      schemaVersion: 2,
      isActive: true,
      problemId: { $nin: validSolvedIds },
      difficulty: { $in: ['Medium', 'Hard'] }
    }).limit(validateCount).lean();

    const validationProblem = validateQbDocs.length > 0 ? validateQbDocs[0] : (reinforceQbDocs[0] || null);

    if (!validationProblem && selectedSolvedDocs.length === 0) {
      // Nothing to revise for some reason
      return res.status(404).json({ success: false, message: 'No suitable problems found for topic' });
    }

    // Assemble final
    const finalPriorProblems = [...selectedSolvedDocs, ...reinforceQbDocs];
    const problemIds = finalPriorProblems.map(p => p.problemId);
    
    // Create RevisionSession
    const session = await RevisionSession.create({
      userId,
      topicId,
      problemIds: problemIds,
      validationProblemId: validationProblem?.problemId || null
    });

    return res.status(200).json({
      success: true,
      revisionSessionId: session._id,
      topicId,
      problemsToRevise: selectedSolvedDocs,
      reinforcementProblems: reinforceQbDocs,
      validationProblem,
      estimatedTime: (problemIds.length + (validationProblem ? 1 : 0)) * 15,
      revisionPriority: 0 // Mock, typically fetch from queue logic
    });
  } catch (error) {
    logger.error('Error starting revision:', error);
    res.status(500).json({ success: false, message: 'Failed to start revision', error: error.message });
  }
};

/**
 * POST /api/revision/submit
 * Handles completed revision session, tracking telemetry and triggering planner sync
 */
export const submitRevision = async (req, res) => {
  try {
    const { revisionSessionId, results } = req.body;
    const userId = req.user._id;

    const session = await RevisionSession.findById(revisionSessionId);
    if (!session || session.userId.toString() !== userId.toString()) {
      return res.status(404).json({ success: false, message: 'Valid revision session not found' });
    }
    
    if (session.isCompleted) {
      return res.status(400).json({ success: false, message: 'Revision session already completed' });
    }

    let correctCount = 0;
    let totalSolveTime = 0;

    // Loop results and create PracticeAttemptEvent records
    if (results && results.length > 0) {
      for (const res of results) {
        if (res.correct) correctCount += 1;
        totalSolveTime += (res.solveTime || 0);
        
        // Save telemetry
        await PracticeAttemptEvent.create({
          userId,
          problemId: res.problemId,
          topicId: session.topicId,
          mode: 'ai_lab',
          isRevision: true,
          solveTime: res.solveTime || 0,
          attempts: res.attempts || 1,
          hintsUsed: res.hintsUsed || 0,
          correctness: res.correct === true,
          sessionId: session._id.toString()
        });
      }
    }
    
    const acc = results?.length > 0 ? (correctCount / results.length) * 100 : 0;
    
    session.revisionAccuracy = acc;
    session.sessionDuration = totalSolveTime;
    session.isCompleted = true;
    
    // retentionDelta will be updated asynchronously by the Python worker interpreting PracticeAttemptEvent, 
    // but we can fake an immediate feedback metric here if we want to visually show it
    session.retentionDelta = acc > 70 ? 0.2 : (acc > 30 ? 0.05 : -0.1);

    await session.save();

    // Check if critical/high -> push to planner dynamically 
    // Normally handled in batch, but planner says do it if specific condition met
    const revSchedule = await RevisionSchedule.findOne({ userId: String(userId), topicId: session.topicId });
    if (revSchedule && (revSchedule.urgency_level === 'critical' || revSchedule.urgency_level === 'high')) {
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const existingPlan = await AdaptiveStudyPlan.findOne({
        userId: String(userId),
        planDate: { $gte: today }
      });
      
      if (existingPlan) {
        const hasTopic = existingPlan.focusTopics.some(ft => ft.topicId === session.topicId);
        if (!hasTopic) {
          existingPlan.focusTopics.push({
            topicId: session.topicId,
            priority: 'high',
            suggestedTime: 20
          });
          await existingPlan.save();
        }
      }
    }

    return res.status(200).json({
      success: true,
      revisionAccuracy: session.revisionAccuracy,
      retentionDelta: session.retentionDelta,
      message: 'Revision submitted and processed'
    });
  } catch (error) {
    logger.error('Error submitting revision:', error);
    res.status(500).json({ success: false, message: 'Failed to submit revision', error: error.message });
  }
};
