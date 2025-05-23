/**
 * Exercise Routes
 * ==============
 * Routes for exercise functionality, including recommendations
 */

import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import workoutController from '../controllers/workoutController.mjs';

const router = express.Router();

/**
 * @route GET /api/exercises/recommended
 * @desc Get exercise recommendations for the current user
 * @access Private
 */
router.get('/recommended', workoutController.getExerciseRecommendations);

/**
 * @route GET /api/exercises/recommended/:userId
 * @desc Get exercise recommendations for a specific user
 * @access Private (Admin/Trainer only)
 */
router.get('/recommended/:userId', protect, authorize(['admin', 'trainer']), workoutController.getExerciseRecommendations);

export default router;