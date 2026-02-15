import express from 'express';
import { connect, getStatus, resync, disconnect } from '../controllers/integrationController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// All integration routes require authentication
router.use(authMiddleware);

/**
 * POST /api/integrations/connect
 * Connect a new platform account
 */
router.post('/connect', connect);

/**
 * GET /api/integrations/status
 * Get all integrations and their status
 */
router.get('/status', getStatus);

/**
 * POST /api/integrations/resync/:platform
 * Manually trigger a resync for a specific platform
 */
router.post('/resync/:platform', resync);

/**
 * DELETE /api/integrations/:platform
 * Disconnect a platform account
 */
router.delete('/:platform', disconnect);

export default router;
