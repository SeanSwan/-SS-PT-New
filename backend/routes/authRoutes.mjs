// backend/routes/authRoutes.mjs
import express from 'express';
import { register, login, validateToken, getProfile } from '../controllers/authController.mjs';
import { protect } from '../middleware/authMiddleware.mjs';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (client or admin)
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Log in an existing user and return a JWT token
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/validate-token
 * @desc    Validate a JWT token and return user data
 * @access  Public
 */
router.get('/validate-token', validateToken);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile (protected)
 * @access  Private
 */
router.get('/profile', protect, getProfile);

export default router;