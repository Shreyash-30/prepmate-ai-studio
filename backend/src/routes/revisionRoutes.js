import express from 'express';
import { getRevisionQueue, startRevision, submitRevision } from '../controllers/revisionController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.use(auth); // Require authentication for all revision endpoints

// Get prioritized revision topics
router.get('/queue', getRevisionQueue);

// Start a revision session for a topic
router.post('/start', startRevision);

// Submit results of a revision session
router.post('/submit', submitRevision);

export default router;
