import express from 'express';
import { 
  signup, 
  login, 
  getProfile, 
  updateProfile, 
  logout,
  forgotPassword,
  resetPassword,
  updatePassword
} from '../controllers/authController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Protected routes
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.put('/update-password', authMiddleware, updatePassword);
router.post('/logout', authMiddleware, logout);

export default router;
