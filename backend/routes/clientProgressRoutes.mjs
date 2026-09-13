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
  // 'user' is the DEFAULT role minted by public self-registration
  // (models/User.mjs:135) and is client-equivalent (utils/clientAccess.mjs:23).
  // Both handlers below are self-scoped (`req.user.id` only —
  // controllers/clientProgressController.mjs:64,77), so omitting it 403'd a
  // fresh signup from its OWN current progress. NOTE: unlike clientReadAccess
  // there is no verifyClientAccessByUserId on these two routes — nothing to
  // pair with, which is why tests/api/clientProgressSelfAccessExecution.test.mjs
  // (behavioural) rather than the pairing guard covers them.
  authorize(['client', 'admin', 'user']),
];

const clientReadAccess = [
  protect,
  authorize(['client', 'trainer', 'admin', 'user']),
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
