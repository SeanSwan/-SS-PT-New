import express from 'express';
import analyticsController from '../controllers/analyticsController.mjs';
import { protect } from '../middleware/authMiddleware.mjs';

const router = express.Router();

// @route   GET /api/analytics/:userId/strength-profile
// @desc    Get a client's strength profile for the radar chart.
// @access  Private
router.get('/:userId/strength-profile', protect, analyticsController.getStrengthProfile);

export default router;