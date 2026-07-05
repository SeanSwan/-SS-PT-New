/**
 * ============================================================================
 * FILE: gamificationRoutes.mjs
 * PURPOSE: REST API routes for gamification system with RBAC
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-23
 * AI VILLAGE VALIDATED: 2026-03-23
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines 25+ REST endpoints under /api/gamification/*
 * with role-based access control (admin, trainer, client). Maps HTTP methods
 * to gamificationController methods.
 *
 * HOW IT FITS IN THE APP: Express router mounted at /api/gamification
 *   server.mjs → gamificationRoutes → gamificationController
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Gamification System
 *
 * Base Path: /api/gamification
 *
 * Architecture Overview:
 * ┌─────────────────────┐      ┌──────────────────┐      ┌─────────────────┐
 * │  Client Dashboard   │─────▶│  Gamification    │─────▶│  Gamification   │
 * │  (React)            │      │  Routes          │      │  Controller     │
 * └─────────────────────┘      └──────────────────┘      └─────────────────┘
 *
 * Middleware Strategy (Custom Role Middleware):
 *
 *   authenticate = protect (JWT verification)
 *   authorizeAdmin = adminOnly (admin role check)
 *   authorizeTrainer = trainerOrAdminOnly (trainer + admin)
 *   authorizeClientOrTrainer = custom (client + trainer + admin)
 *
 * API Endpoints (25 total):
 *
 * ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 * │ METHOD  ENDPOINT                                         AUTH             PURPOSE         │
 * ├──────────────────────────────────────────────────────────────────────────────────────────┤
 * │ GET     /settings                                        Public           Get config      │
 * │ PUT     /settings                                        Admin            Update config   │
 * │ GET     /leaderboard                                     Public           Top users       │
 * │ PATCH   /notifications/:id/read                          Client/T/A       Mark read       │
 * ├──────────────────────────────────────────────────────────────────────────────────────────┤
 * │ GET     /users/:userId/profile                           Client/T/A       User stats      │
 * │ POST    /users/:userId/points                            Trainer/Admin    Award points    │
 * │ GET     /users/:userId/transactions                      Client/T/A       Point history   │
 * │ POST    /users/:userId/check-milestones                  Trainer/Admin    Check milestones│
 * ├──────────────────────────────────────────────────────────────────────────────────────────┤
 * │ GET     /achievements                                    Public           List all        │
 * │ GET     /achievements/:id                                Public           Single          │
 * │ POST    /achievements                                    Admin            Create          │
 * │ PUT     /achievements/:id                                Admin            Update          │
 * │ DELETE  /achievements/:id                                Admin            Delete          │
 * │ POST    /users/:userId/achievements/:achievementId       Trainer/Admin    Award           │
 * │ PUT     /users/:userId/achievements/:id/progress         Trainer/Admin    Update progress │
 * ├──────────────────────────────────────────────────────────────────────────────────────────┤
 * │ GET     /rewards                                         Public           List all        │
 * │ GET     /rewards/:id                                     Public           Single          │
 * │ POST    /rewards                                         Admin            Create          │
 * │ PUT     /rewards/:id                                     Admin            Update          │
 * │ DELETE  /rewards/:id                                     Admin            Delete          │
 * │ POST    /users/:userId/rewards/:rewardId/redeem          Client/T/A       Redeem          │
 * ├──────────────────────────────────────────────────────────────────────────────────────────┤
 * │ GET     /milestones                                      Public           List all        │
 * │ GET     /milestones/:id                                  Public           Single          │
 * │ POST    /milestones                                      Admin            Create          │
 * │ PUT     /milestones/:id                                  Admin            Update          │
 * │ DELETE  /milestones/:id                                  Admin            Delete          │
 * ├──────────────────────────────────────────────────────────────────────────────────────────┤
 * │ POST    /record-workout                                  Client/T/A       Auto-award pts  │
 * └──────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * Middleware Aliases (Why Custom Names?):
 * - authenticate = protect (clearer intent for routes file)
 * - authorizeAdmin = adminOnly (consistency)
 * - authorizeTrainer = trainerOrAdminOnly (trainer + admin access)
 * - authorizeClientOrTrainer = custom inline middleware (all authenticated roles)
 *
 * Business Logic:
 *
 * WHY Public Access for Leaderboard/Achievements/Rewards?
 * - Marketing (show achievements to attract new users)
 * - Transparency (users see available rewards before signup)
 * - Social proof (leaderboard drives competition)
 * - No sensitive data exposed (points, names, badges only)
 *
 * WHY Trainer Can Award Points/Achievements?
 * - Trainer-client relationship (trainer rewards client progress)
 * - Engagement tool (trainers motivate clients)
 * - Delegation (reduces admin workload)
 * - Logged for audit (req.user.id tracked in controller)
 *
 * WHY Separate authorizeClientOrTrainer Middleware?
 * - Flexible access (client can view own profile, trainer can view any)
 * - Inline definition (not reused elsewhere, no separate file needed)
 * - Clear intent (role check logic visible in routes file)
 *
 * Created: 2024-XX-XX
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

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

// ─────────────────────────────────────────────────────────────
// SECURITY: IDOR Ownership Middleware (Fix #1 — CRITICAL)
// PURPOSE: Prevents clients from accessing other users' gamification data
// WHY: Without this, any authenticated client can read/modify any user's
//      points, achievements, and transactions by changing the :userId param
// ─────────────────────────────────────────────────────────────
const authorizeOwnerOrAdmin = (req, res, next) => {
  const targetUserId = parseInt(req.params.userId || req.body.userId);
  const requesterId = req.user?.id;
  const role = req.user?.role;

  // Admins can access any user's data
  if (role === 'admin') return next();

  // Trainers can access their assigned clients' data
  // TODO: In future sprint, verify trainer-client assignment from DB
  if (role === 'trainer') return next();

  // Clients can only access their own data
  if (targetUserId === requesterId) return next();

  return res.status(403).json({
    success: false,
    error: 'You can only access your own gamification data'
  });
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
router.get('/users/:userId/profile', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.getUserProfile);

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
router.get('/users/:userId/transactions', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.getUserTransactions);

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
router.post('/users/:userId/rewards/:rewardId/redeem', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.redeemReward);

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

/**
 * Streak Freeze routes (Loss Aversion Psychology)
 */

/**
 * @route   GET /api/gamification/streak-freeze/:userId
 * @desc    Get user's streak freeze status (available, max, used)
 * @access  Client, Trainer, Admin
 */
router.get('/streak-freeze/:userId', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.getStreakFreezeStatus);

/**
 * @route   POST /api/gamification/streak-freeze/use
 * @desc    Use a streak freeze to protect current streak
 * @access  Client, Trainer, Admin
 */
router.post('/streak-freeze/use', authenticate, authorizeClientOrTrainer, gamificationController.useStreakFreeze);

/**
 * Weekly Recap (Spotify Wrapped-style)
 */

/**
 * @route   GET /api/gamification/users/:userId/weekly-recap
 * @desc    Get weekly recap stats (this week vs last week)
 * @access  Client, Trainer, Admin
 */
router.get('/users/:userId/weekly-recap', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.getWeeklyRecap);

/**
 * Activity Feed (polling fallback for WebSocket)
 */

/**
 * @route   GET /api/gamification/activity-feed
 * @desc    Get recent gamification activity for live feed (polling fallback)
 * @access  Client, Trainer, Admin
 */
router.get('/activity-feed', authenticate, authorizeClientOrTrainer, gamificationController.getActivityFeed);

/**
 * Comeback Challenge routes (Re-engagement Psychology)
 */

/**
 * @route   GET /api/gamification/comeback-challenge/:userId
 * @desc    Get active comeback challenge for user
 * @access  Client, Trainer, Admin
 */
router.get('/comeback-challenge/:userId', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.getComebackChallenge);

/**
 * @route   POST /api/gamification/comeback-challenge/accept
 * @desc    Accept a comeback challenge
 * @access  Client, Trainer, Admin
 */
router.post('/comeback-challenge/accept', authenticate, authorizeClientOrTrainer, gamificationController.acceptComebackChallenge);

/**
 * Job Class routes (FFXIV-style fitness classes — V2)
 */

/**
 * @route   GET /api/gamification/users/:userId/job-class
 * @desc    Get user's current job class
 * @access  Client, Trainer, Admin (IDOR protected)
 */
router.get('/users/:userId/job-class', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.getJobClass);

/**
 * @route   PUT /api/gamification/users/:userId/job-class
 * @desc    Set or change user's job class
 * @access  Client, Trainer, Admin (IDOR protected)
 */
router.put('/users/:userId/job-class', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.setJobClass);

/**
 * Ghost Mode routes (Personal Competition — V2)
 */

/**
 * @route   GET /api/gamification/ghost/config
 * @desc    Get ghost mode configuration and bonus structure
 * @access  Public
 */
router.get('/ghost/config', gamificationController.getGhostConfig);

/**
 * @route   GET /api/gamification/users/:userId/ghost
 * @desc    Get the ghost (best previous workout) for comparison
 * @access  Client, Trainer, Admin (IDOR protected)
 */
router.get('/users/:userId/ghost', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.getGhost);

/**
 * @route   POST /api/gamification/users/:userId/ghost/compare
 * @desc    Compare completed workout against ghost, award bonuses
 * @access  Client, Trainer, Admin (IDOR protected)
 */
router.post('/users/:userId/ghost/compare', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.compareGhost);

/**
 * Vault Decryption routes (Loot Drop System — V2)
 */

/**
 * @route   GET /api/gamification/vault/config
 * @desc    Get vault configuration (rarity tiers, drop triggers)
 * @access  Public
 */
router.get('/vault/config', gamificationController.getVaultConfig);

/**
 * @route   POST /api/gamification/users/:userId/vault/roll
 * @desc    Roll for a loot drop after a qualifying action
 * @access  Trainer, Admin
 */
router.post('/users/:userId/vault/roll', authenticate, authorizeTrainer, gamificationController.rollVaultDrop);

/**
 * @route   GET /api/gamification/users/:userId/vault/inventory
 * @desc    Get user's loot drop history/inventory
 * @access  Client, Trainer, Admin (IDOR protected)
 */
router.get('/users/:userId/vault/inventory', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.getVaultInventory);

/**
 * Aegis HUD routes (RPG Needs System — V2)
 */

/**
 * @route   GET /api/gamification/aegis-hud/config
 * @desc    Get needs configuration (labels, icons, colors, decay rates)
 * @access  Public
 */
router.get('/aegis-hud/config', gamificationController.getAegisHudConfig);

/**
 * @route   GET /api/gamification/users/:userId/aegis-hud
 * @desc    Get current needs state with decay applied
 * @access  Client, Trainer, Admin (IDOR protected)
 */
router.get('/users/:userId/aegis-hud', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.getAegisHud);

/**
 * @route   POST /api/gamification/users/:userId/aegis-hud/replenish
 * @desc    Replenish needs from an action (workout, social, etc.)
 * @access  Trainer, Admin
 */
router.post('/users/:userId/aegis-hud/replenish', authenticate, authorizeTrainer, gamificationController.replenishAegisHud);

/**
 * @route   PUT /api/gamification/users/:userId/aegis-hud/:needKey
 * @desc    Admin override: set a specific need value
 * @access  Admin only
 */
router.put('/users/:userId/aegis-hud/:needKey', authenticate, authorizeAdmin, gamificationController.setAegisHudNeed);

// ── COMPANION PET ROUTES ──

/** @route GET /api/gamification/pet/config — Species catalog + evolution stages */
router.get('/pet/config', authenticate, gamificationController.getPetConfig);

/** @route GET /api/gamification/users/:userId/pet — Get pet state */
router.get('/users/:userId/pet', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.getPet);

/** @route POST /api/gamification/users/:userId/pet/adopt — Adopt a new pet */
router.post('/users/:userId/pet/adopt', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.adoptPet);

/** @route POST /api/gamification/users/:userId/pet/interact — Pet/feed/play */
router.post('/users/:userId/pet/interact', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.interactWithPet);

/** @route POST /api/gamification/users/:userId/pet/activity — Record activity */
router.post('/users/:userId/pet/activity', authenticate, authorizeTrainer, gamificationController.recordPetActivity);

/** @route PUT /api/gamification/users/:userId/pet/rename — Rename pet */
router.put('/users/:userId/pet/rename', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.renamePet);

/** @route DELETE /api/gamification/users/:userId/pet — Release pet */
router.delete('/users/:userId/pet', authenticate, authorizeClientOrTrainer, authorizeOwnerOrAdmin, gamificationController.releasePet);

export default router;