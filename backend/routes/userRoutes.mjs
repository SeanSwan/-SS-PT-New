/**
 * userRoutes.mjs
 * Lightweight user endpoints (credits, profile helpers)
 */
import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { getUserCredits } from '../controllers/userCreditsController.mjs';

const router = express.Router();

/**
 * @route   GET /api/user/credits
 * @desc    Get current user's remaining session credits
 * @access  Private
 */
router.get('/credits', protect, getUserCredits);

export default router;
