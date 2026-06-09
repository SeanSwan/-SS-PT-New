// backend/routes/clientProgressRoutes.mjs
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';
import {
  createClientGoal,
  getClientComparisonAnalytics,
  getClientGoals,
  getClientInjuryRiskAssessment,
  getClientProgressLeaderboard,
  getClientWorkoutHistory,
  getCurrentClientProgress,
  getTargetClientProgress,
  updateClientGoal,
  updateCurrentClientProgress,
  updateTargetClientProgress,
} from '../controllers/clientProgressController.mjs';

const router = express.Router();

const currentClientAccess = [
  protect,
  authorize(['client', 'admin']),
];

const clientReadAccess = [
  protect,
  authorize(['client', 'trainer', 'admin']),
  verifyClientAccessByUserId({ paramName: 'clientId' }),
];

const targetClientAccess = [
  protect,
  authorize(['trainer', 'admin']),
  verifyClientAccessByUserId({ paramName: 'userId' }),
];

router.get('/', ...currentClientAccess, getCurrentClientProgress);

router.put('/', ...currentClientAccess, updateCurrentClientProgress);

router.get('/leaderboard', protect, getClientProgressLeaderboard);

router.get('/:clientId/workout-history', ...clientReadAccess, getClientWorkoutHistory);

router.get('/:clientId/comparison', ...clientReadAccess, getClientComparisonAnalytics);

router.get('/:clientId/goals', ...clientReadAccess, getClientGoals);

router.post('/:clientId/goals', ...clientReadAccess, createClientGoal);

router.put('/:clientId/goals/:goalId', ...clientReadAccess, updateClientGoal);

router.get('/:clientId/risk-assessment', ...clientReadAccess, getClientInjuryRiskAssessment);

router.get('/:userId', ...targetClientAccess, getTargetClientProgress);

router.put('/:userId', ...targetClientAccess, updateTargetClientProgress);

export default router;
