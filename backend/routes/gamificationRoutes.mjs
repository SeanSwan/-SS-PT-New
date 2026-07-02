import express from 'express';
import gamificationController from '../controllers/gamificationController.mjs';
import { protect, adminOnly, trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';
import { companionEventBridgeResponseMiddleware } from '../middleware/companionEventBridgeResponseMiddleware.mjs';

const router = express.Router();

const authenticate = protect;
const authorizeAdmin = adminOnly;
const authorizeTrainer = trainerOrAdminOnly;
const authorizeClientOrTrainer = (req, res, next) => {
  if (req.user && (req.user.role === 'client' || req.user.role === 'trainer' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied: Client, Trainer or Admin only'
    });
  }
};

const authorizeOwnerOrAdmin = (req, res, next) => {
  const targetUserId = parseInt(req.params.userId || req.body.userId);
  const requesterId = req.user?.id;
  const role = req.user?.role;

  if (role === 'admin') return next();
  if (role === 'trainer') return next();
  if (targetUserId === requesterId) return next();

  return res.status(403).json({
    success: false,
    error: 'You can only access your own gamification data'
  });
};

router.get('/settings', gamificationController.getSettings);
router.put('/settings', authenticate, authorizeAdmin, gamificationController.updateSettings);
router.get('/leaderboard', gamificationController.getLeaderboard);
router.patch('/notifications/:notificationId/read', authenticate, authorizeClientOrTrainer, gamificationController.markNotificationAsRead);

router.get('/users/:userId/profile', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.getUserProfile);
router.post('/users/:userId/points', authenticate, authorizeTrainer, gamificationController.awardPoints);
router.get('/users/:userId/transactions', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.getUserTransactions);
router.post('/users/:userId/check-milestones', authenticate, authorizeTrainer, gamificationController.checkAndAwardMilestones);

router.get('/achievements', gamificationController.getAllAchievements);
router.get('/achievements/:id', gamificationController.getAchievement);
router.post('/achievements', authenticate, authorizeAdmin, gamificationController.createAchievement);
router.put('/achievements/:id', authenticate, authorizeAdmin, gamificationController.updateAchievement);
router.delete('/achievements/:id', authenticate, authorizeAdmin, gamificationController.deleteAchievement);
router.post('/users/:userId/achievements/:achievementId', authenticate, authorizeTrainer, gamificationController.awardAchievement);
router.put('/users/:userId/achievements/:achievementId/progress', authenticate, authorizeTrainer, gamificationController.updateAchievementProgress);

router.get('/rewards', gamificationController.getAllRewards);
router.get('/rewards/:id', gamificationController.getReward);
router.post('/rewards', authenticate, authorizeAdmin, gamificationController.createReward);
router.put('/rewards/:id', authenticate, authorizeAdmin, gamificationController.updateReward);
router.delete('/rewards/:id', authenticate, authorizeAdmin, gamificationController.deleteReward);
router.post('/users/:userId/rewards/:rewardId/redeem', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.redeemReward);

router.post('/record-workout', authenticate, authorizeClientOrTrainer, companionEventBridgeResponseMiddleware, gamificationController.recordWorkoutCompletion);

router.get('/milestones', gamificationController.getAllMilestones);
router.get('/milestones/:id', gamificationController.getMilestone);
router.post('/milestones', authenticate, authorizeAdmin, gamificationController.createMilestone);
router.put('/milestones/:id', authenticate, authorizeAdmin, gamificationController.updateMilestone);
router.delete('/milestones/:id', authenticate, authorizeAdmin, gamificationController.deleteMilestone);

router.get('/streak-freeze/:userId', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.getStreakFreezeStatus);
router.post('/streak-freeze/use', authenticate, authorizeClientOrTrainer, gamificationController.useStreakFreeze);

router.get('/users/:userId/weekly-recap', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.getWeeklyRecap);
router.get('/activity-feed', authenticate, authorizeClientOrTrainer, gamificationController.getActivityFeed);

router.get('/comeback-challenge/:userId', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.getComebackChallenge);
router.post('/comeback-challenge/accept', authenticate, authorizeClientOrTrainer, gamificationController.acceptComebackChallenge);

router.get('/users/:userId/job-class', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.getJobClass);
router.put('/users/:userId/job-class', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.setJobClass);

router.get('/ghost/config', gamificationController.getGhostConfig);
router.get('/users/:userId/ghost', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.getGhost);
router.post('/users/:userId/ghost/compare', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.compareGhost);

router.get('/vault/config', gamificationController.getVaultConfig);
router.post('/users/:userId/vault/roll', authenticate, authorizeTrainer, gamificationController.rollVaultDrop);
router.get('/users/:userId/vault/inventory', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.getVaultInventory);

router.get('/aegis-hud/config', gamificationController.getAegisHudConfig);
router.get('/users/:userId/aegis-hud', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.getAegisHud);
router.post('/users/:userId/aegis-hud/replenish', authenticate, authorizeTrainer, gamificationController.replenishAegisHud);
router.put('/users/:userId/aegis-hud/:needKey', authenticate, authorizeAdmin, gamificationController.setAegisHudNeed);

router.get('/pet/config', authenticate, gamificationController.getPetConfig);
router.get('/users/:userId/pet', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.getPet);
router.post('/users/:userId/pet/adopt', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.adoptPet);
router.post('/users/:userId/pet/interact', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.interactWithPet);
router.post('/users/:userId/pet/activity', authenticate, authorizeTrainer, gamificationController.recordPetActivity);
router.put('/users/:userId/pet/rename', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.renamePet);
router.delete('/users/:userId/pet', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.releasePet);

export default router;
