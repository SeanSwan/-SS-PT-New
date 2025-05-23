/**
 * Workout Routes
 * =============
 * Routes for workout tracking functionality
 */

import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import workoutController from '../controllers/workoutController.mjs';

const router = express.Router();

// --- Session Routes ---

/**
 * @route GET /api/workout/sessions
 * @desc Get all workout sessions for the current user
 * @access Private
 */
router.get('/sessions', protect, workoutController.getWorkoutSessions);

/**
 * @route GET /api/workout/sessions/user/:userId
 * @desc Get all workout sessions for a specific user
 * @access Private (Admin/Trainer only)
 */
router.get('/sessions/user/:userId', protect, authorize(['admin', 'trainer']), workoutController.getWorkoutSessions);

/**
 * @route GET /api/workout/sessions/:sessionId
 * @desc Get a specific workout session
 * @access Private
 */
router.get('/sessions/:sessionId', protect, workoutController.getWorkoutSessionById);

/**
 * @route POST /api/workout/sessions
 * @desc Create a new workout session
 * @access Private
 */
router.post('/sessions', protect, workoutController.createWorkoutSession);

/**
 * @route PUT /api/workout/sessions/:sessionId
 * @desc Update a workout session
 * @access Private
 */
router.put('/sessions/:sessionId', protect, workoutController.updateWorkoutSession);

/**
 * @route DELETE /api/workout/sessions/:sessionId
 * @desc Delete a workout session
 * @access Private
 */
router.delete('/sessions/:sessionId', protect, workoutController.deleteWorkoutSession);

// --- Progress Routes ---

/**
 * @route GET /api/workout/progress
 * @desc Get progress for the current user
 * @access Private
 */
router.get('/progress', protect, workoutController.getClientProgress);

/**
 * @route GET /api/workout/progress/:userId
 * @desc Get progress for a specific user
 * @access Private (Admin/Trainer only)
 */
router.get('/progress/:userId', protect, workoutController.getClientProgress);

// --- Statistics Routes ---

/**
 * @route GET /api/workout/statistics
 * @desc Get workout statistics for the current user
 * @access Private
 */
router.get('/statistics', protect, workoutController.getWorkoutStatistics);

/**
 * @route GET /api/workout/statistics/:userId
 * @desc Get workout statistics for a specific user
 * @access Private (Admin/Trainer only)
 */
router.get('/statistics/:userId', protect, workoutController.getWorkoutStatistics);

// --- Exercise Recommendation Routes ---

/**
 * @route GET /api/workout/recommendations
 * @desc Get exercise recommendations for the current user
 * @access Private
 */
router.get('/recommendations', protect, workoutController.getExerciseRecommendations);

/**
 * @route GET /api/workout/recommendations/:userId
 * @desc Get exercise recommendations for a specific user
 * @access Private (Admin/Trainer only)
 */
router.get('/recommendations/:userId', protect, authorize(['admin', 'trainer']), workoutController.getExerciseRecommendations);

// --- Plan Routes ---

/**
 * @route GET /api/workout/plans
 * @desc Get all workout plans for the current user
 * @access Private
 */
router.get('/plans', protect, (req, res) => {
  // Placeholder for future implementation
  res.status(501).json({ message: 'Not implemented yet' });
});

/**
 * @route GET /api/workout/plans/:planId
 * @desc Get a specific workout plan
 * @access Private
 */
router.get('/plans/:planId', protect, workoutController.getWorkoutPlanById);

/**
 * @route POST /api/workout/plans
 * @desc Create a new workout plan
 * @access Private (Admin/Trainer only)
 */
router.post('/plans', protect, authorize(['admin', 'trainer']), workoutController.createWorkoutPlan);

/**
 * @route PUT /api/workout/plans/:planId
 * @desc Update a workout plan
 * @access Private
 */
router.put('/plans/:planId', protect, workoutController.updateWorkoutPlan);

/**
 * @route DELETE /api/workout/plans/:planId
 * @desc Delete a workout plan
 * @access Private
 */
router.delete('/plans/:planId', protect, workoutController.deleteWorkoutPlan);

/**
 * @route POST /api/workout/plans/:planId/generate
 * @desc Generate workout sessions from a plan
 * @access Private
 */
router.post('/plans/:planId/generate', protect, workoutController.generateWorkoutSessions);

export default router;