import {
  TopicMastery,
  WeakTopicSignal,
  ReadinessScore,
  AdaptiveStudyPlan
} from '../models/MLIntelligence.js';
import PracticeAttemptEvent from '../models/PracticeAttemptEvent.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

// ============================================
// DUMMY DATA CONSTANTS (FALLBACKS)
// ============================================
const DUMMY_STATS = {
  problemsSolved: 247,
  readinessScore: 74,
  streak: 14,
  platformsSynced: 3,
  platformsTotal: 4
};

const DUMMY_MASTERY = [
  { topic: 'Arrays', level: 85 },
  { topic: 'Trees', level: 62 },
  { topic: 'DP', level: 40 },
  { topic: 'Graphs', level: 55 },
  { topic: 'Strings', level: 78 },
  { topic: 'Sorting', level: 90 },
  { topic: 'Linked Lists', level: 70 },
  { topic: 'Stacks', level: 82 },
];

const DUMMY_WEAKNESSES = [
  { topic: 'Dynamic Programming', reason: 'Only 40% mastery, 3 failed attempts', priority: 'high' },
  { topic: 'Graph Traversal', reason: 'BFS/DFS weak, 55% mastery', priority: 'medium' },
  { topic: 'Backtracking', reason: 'Not attempted recently', priority: 'low' },
];

const DUMMY_TASKS = [
  { label: 'Solve 2 DP problems (Medium)', done: false },
  { label: 'Revise BFS/DFS notes', done: true },
  { label: 'Complete mock interview', done: false },
  { label: 'Review graph problems', done: false },
];

const DUMMY_TREND = [
  { week: 'W1', score: 45 },
  { week: 'W2', score: 52 },
  { week: 'W3', score: 58 },
  { week: 'W4', score: 65 },
  { week: 'W5', score: 70 },
  { week: 'W6', score: 74 },
];

const DUMMY_READINESS = [
  { company: 'Google', score: 68 },
  { company: 'Amazon', score: 74 },
  { company: 'Meta', score: 55 },
  { company: 'Microsoft', score: 80 },
];

/**
 * GET /api/dashboard/stats
 */
export const getStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).lean();

    // 1. Problems Solved
    let problemsSolved = user.totalProblemsCount || 0;
    
    // 2. Readiness Score
    const latestReadiness = await ReadinessScore.findOne({ userId: String(userId) })
      .sort({ createdAt: -1 })
      .lean();
    let readinessScore = latestReadiness ? latestReadiness.readinessScore : 0;

    // 3. Practice Streak
    const recentAttempts = await PracticeAttemptEvent.find({ userId: userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('createdAt')
      .lean();
    
    let streak = 0;
    if (recentAttempts.length > 0) {
      const uniqueDays = new Set(recentAttempts.map(a => 
        new Date(a.createdAt).toISOString().split('T')[0]
      ));
      const sortedDays = Array.from(uniqueDays).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      let current = new Date();
      current.setHours(0,0,0,0);
      
      for (const dayStr of sortedDays) {
        const day = new Date(dayStr);
        day.setHours(0,0,0,0);
        
        const diff = (current - day) / (1000 * 60 * 60 * 24);
        if (diff <= 1) {
          streak++;
          current = day;
        } else {
          break;
        }
      }
    }

    // 4. Platforms Synced
    let platformsSynced = 0;
    if (user.platformProfiles?.leetcode?.connected) platformsSynced++;
    if (user.platformProfiles?.codeforces?.connected) platformsSynced++;

    // FALLBACKS - Use dummy if real is 0, for demo stability
    if (problemsSolved === 0) problemsSolved = DUMMY_STATS.problemsSolved;
    if (readinessScore === 0) readinessScore = DUMMY_STATS.readinessScore;
    if (streak === 0) streak = DUMMY_STATS.streak;
    if (platformsSynced === 0) platformsSynced = DUMMY_STATS.platformsSynced;

    res.json({
      success: true,
      data: {
        problemsSolved,
        readinessScore,
        streak,
        platformsSynced,
        platformsTotal: DUMMY_STATS.platformsTotal
      }
    });
  } catch (error) {
    logger.error('Error in getStats:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/dashboard/mastery-heatmap
 */
export const getMasteryHeatmap = async (req, res) => {
  try {
    const userId = req.user._id;
    const masteries = await TopicMastery.find({ userId: String(userId) }).lean();
    
    const realData = masteries.map(m => ({
      topic: m.topicId.replace(/_/g, ' '),
      level: Math.round(m.mastery_probability * 100)
    }));

    // Merge logic: Start with real data, fill with dummy data for topics not present in real data
    const existingTopics = new Set(realData.map(d => d.topic.toLowerCase()));
    const data = [...realData];
    
    DUMMY_MASTERY.forEach(d => {
      if (!existingTopics.has(d.topic.toLowerCase())) {
        data.push(d);
      }
    });

    res.json({ success: true, data: data.slice(0, 8) });
  } catch (error) {
    logger.error('Error in getMasteryHeatmap:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/dashboard/weak-topics
 */
export const getWeakTopics = async (req, res) => {
  try {
    const userId = req.user._id;
    const weaknesses = await WeakTopicSignal.find({ userId: String(userId) })
      .sort({ riskScore: -1 })
      .limit(5)
      .lean();

    const realData = weaknesses.map(w => ({
      topic: (w.topicName || w.topicId).replace(/_/g, ' '),
      reason: w.recommendation || `Risk score: ${Math.round(w.riskScore)}%`,
      priority: w.riskScore > 75 ? 'high' : w.riskScore > 40 ? 'medium' : 'low'
    }));

    // Merge logic: Fill up to 3 topics
    const data = [...realData];
    if (data.length < 3) {
      const existingTopics = new Set(realData.map(d => d.topic.toLowerCase()));
      DUMMY_WEAKNESSES.forEach(d => {
        if (data.length < 3 && !existingTopics.has(d.topic.toLowerCase())) {
          data.push(d);
        }
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error in getWeakTopics:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/dashboard/today-tasks
 */
export const getTodayTasks = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0,0,0,0);

    const plan = await AdaptiveStudyPlan.findOne({
      userId: String(userId),
      planDate: { $gte: today }
    }).lean();

    let data = [];
    if (plan) {
      data = plan.focusTopics.map(t => ({
        label: `Practice ${t.topicId.replace(/_/g, ' ')} (${t.suggestedTime} mins)`,
        done: false
      }));
    }

    // Fill up to 4 tasks
    if (data.length < 4) {
      const existingLabels = new Set(data.map(d => d.label.toLowerCase()));
      DUMMY_TASKS.forEach(d => {
        if (data.length < 4 && !existingLabels.has(d.label.toLowerCase())) {
          data.push(d);
        }
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error in getTodayTasks:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/dashboard/performance-trend
 */
export const getPerformanceTrend = async (req, res) => {
  try {
    const userId = req.user._id;
    const scores = await ReadinessScore.find({ userId: String(userId) })
      .sort({ createdAt: 1 })
      .limit(10)
      .lean();

    let data = scores.map((s, i) => ({
      week: `T${i + 1}`,
      score: Math.round(s.readinessScore)
    }));

    // If trend is empty, show dummy trend
    if (data.length === 0) {
      data = DUMMY_TREND;
    }

    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error in getPerformanceTrend:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/dashboard/readiness
 */
export const getReadinessScore = async (req, res) => {
  try {
    const userId = req.user._id;
    const scores = await ReadinessScore.find({ userId: String(userId) }).lean();
    
    let realData = scores.map(s => ({
      company: s.targetCompany ? s.targetCompany.charAt(0).toUpperCase() + s.targetCompany.slice(1) : 'General',
      score: Math.round(s.readinessScore)
    }));

    // Merge logic: show real company readiness if available, fill rest with dummy
    const data = [...realData];
    const existingCompanies = new Set(realData.map(d => d.company.toLowerCase()));
    
    DUMMY_READINESS.forEach(d => {
      if (data.length < 4 && !existingCompanies.has(d.company.toLowerCase())) {
        data.push(d);
      }
    });

    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error in getReadinessScore:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
