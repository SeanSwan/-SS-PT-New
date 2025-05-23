import express from 'express';
import gamificationController from '../controllers/gamificationController.mjs';
import { protect, adminOnly, trainerOnly, trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';

const router = express.Router();

// Middleware for routes requiring authentication
const authenticate = protect;
const authorizeAdmin = adminOnly;
const authorizeTrainer = trainerOrAdminOnly;
const authorizeClientOrTrainer = (req, res, next) => {
  // Authenticated users can access their own data or trainer/admin can access any data
  if (req.user && (req.user.role === 'client' || req.user.role === 'trainer' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied: Client, Trainer or Admin only'
    });
  }
};

/**
 * @route   GET /api/gamification/settings
 * @desc    Get gamification settings
 * @access  Public
 */
router.get('/settings', gamificationController.getSettings);

/**
 * @route   PUT /api/gamification/settings
 * @desc    Update gamification settings
 * @access  Admin only
 */
router.put('/settings', authenticate, authorizeAdmin, gamificationController.updateSettings);

/**
 * @route   GET /api/gamification/leaderboard
 * @desc    Get leaderboard
 * @access  Public
 */
router.get('/leaderboard', gamificationController.getLeaderboard);

/**
 * @route   PATCH /api/gamification/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Client, Trainer, Admin
 */
router.patch('/notifications/:notificationId/read', authenticate, authorizeClientOrTrainer, gamificationController.markNotificationAsRead);

/**
 * @route   GET /api/gamification/users/:userId/profile
 * @desc    Get user gamification profile
 * @access  Client, Trainer, Admin
 */
router.get('/users/:userId/profile', authenticate, authorizeClientOrTrainer, gamificationController.getUserProfile);

/**
 * @route   POST /api/gamification/users/:userId/points
 * @desc    Award points to a user
 * @access  Trainer, Admin
 */
router.post('/users/:userId/points', authenticate, authorizeTrainer, gamificationController.awardPoints);

/**
 * @route   GET /api/gamification/users/:userId/transactions
 * @desc    Get user point transactions
 * @access  Client, Trainer, Admin
 */
router.get('/users/:userId/transactions', authenticate, authorizeClientOrTrainer, gamificationController.getUserTransactions);

/**
 * @route   POST /api/gamification/users/:userId/check-milestones
 * @desc    Check and award milestones for a user
 * @access  Trainer, Admin
 */
router.post('/users/:userId/check-milestones', authenticate, authorizeTrainer, gamificationController.checkAndAwardMilestones);

/**
 * Achievement routes
 */

/**
 * @route   GET /api/gamification/achievements
 * @desc    Get all achievements
 * @access  Public
 */
router.get('/achievements', gamificationController.getAllAchievements);

/**
 * @route   GET /api/gamification/achievements/:id
 * @desc    Get a single achievement
 * @access  Public
 */
router.get('/achievements/:id', gamificationController.getAchievement);

/**
 * @route   POST /api/gamification/achievements
 * @desc    Create a new achievement
 * @access  Admin only
 */
router.post('/achievements', authenticate, authorizeAdmin, gamificationController.createAchievement);

/**
 * @route   PUT /api/gamification/achievements/:id
 * @desc    Update an achievement
 * @access  Admin only
 */
router.put('/achievements/:id', authenticate, authorizeAdmin, gamificationController.updateAchievement);

/**
 * @route   DELETE /api/gamification/achievements/:id
 * @desc    Delete an achievement
 * @access  Admin only
 */
router.delete('/achievements/:id', authenticate, authorizeAdmin, gamificationController.deleteAchievement);

/**
 * @route   POST /api/gamification/users/:userId/achievements/:achievementId
 * @desc    Award an achievement to a user
 * @access  Trainer, Admin
 */
router.post('/users/:userId/achievements/:achievementId', authenticate, authorizeTrainer, gamificationController.awardAchievement);

/**
 * @route   PUT /api/gamification/users/:userId/achievements/:achievementId/progress
 * @desc    Update user achievement progress
 * @access  Trainer, Admin
 */
router.put('/users/:userId/achievements/:achievementId/progress', authenticate, authorizeTrainer, gamificationController.updateAchievementProgress);

/**
 * Reward routes
 */

/**
 * @route   GET /api/gamification/rewards
 * @desc    Get all rewards
 * @access  Public
 */
router.get('/rewards', gamificationController.getAllRewards);

/**
 * @route   GET /api/gamification/rewards/:id
 * @desc    Get a single reward
 * @access  Public
 */
router.get('/rewards/:id', gamificationController.getReward);

/**
 * @route   POST /api/gamification/rewards
 * @desc    Create a new reward
 * @access  Admin only
 */
router.post('/rewards', authenticate, authorizeAdmin, gamificationController.createReward);

/**
 * @route   PUT /api/gamification/rewards/:id
 * @desc    Update a reward
 * @access  Admin only
 */
router.put('/rewards/:id', authenticate, authorizeAdmin, gamificationController.updateReward);

/**
 * @route   DELETE /api/gamification/rewards/:id
 * @desc    Delete a reward
 * @access  Admin only
 */
router.delete('/rewards/:id', authenticate, authorizeAdmin, gamificationController.deleteReward);

/**
 * @route   POST /api/gamification/users/:userId/rewards/:rewardId/redeem
 * @desc    Redeem a reward for a user
 * @access  Client (self), Trainer, Admin
 */
router.post('/users/:userId/rewards/:rewardId/redeem', authenticate, authorizeClientOrTrainer, gamificationController.redeemReward);

/**
 * @route   POST /api/gamification/record-workout
 * @desc    Record workout completion and award points
 * @access  Client, Trainer, Admin
 */
router.post('/record-workout', authenticate, authorizeClientOrTrainer, gamificationController.recordWorkoutCompletion);

/**
 * Milestone routes
 */

/**
 * @route   GET /api/gamification/milestones
 * @desc    Get all milestones
 * @access  Public
 */
router.get('/milestones', gamificationController.getAllMilestones);

/**
 * @route   GET /api/gamification/milestones/:id
 * @desc    Get a single milestone
 * @access  Public
 */
router.get('/milestones/:id', gamificationController.getMilestone);

/**
 * @route   POST /api/gamification/milestones
 * @desc    Create a new milestone
 * @access  Admin only
 */
router.post('/milestones', authenticate, authorizeAdmin, gamificationController.createMilestone);

/**
 * @route   PUT /api/gamification/milestones/:id
 * @desc    Update a milestone
 * @access  Admin only
 */
router.put('/milestones/:id', authenticate, authorizeAdmin, gamificationController.updateMilestone);

/**
 * @route   DELETE /api/gamification/milestones/:id
 * @desc    Delete a milestone
 * @access  Admin only
 */
router.delete('/milestones/:id', authenticate, authorizeAdmin, gamificationController.deleteMilestone);

export default router;