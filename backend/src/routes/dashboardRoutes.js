import express from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All dashboard routes are protected
router.use(auth);

router.get('/stats', dashboardController.getStats);
router.get('/mastery-heatmap', dashboardController.getMasteryHeatmap);
router.get('/weak-topics', dashboardController.getWeakTopics);
router.get('/today-tasks', dashboardController.getTodayTasks);
router.get('/performance-trend', dashboardController.getPerformanceTrend);
router.get('/readiness', dashboardController.getReadinessScore);

export default router;
