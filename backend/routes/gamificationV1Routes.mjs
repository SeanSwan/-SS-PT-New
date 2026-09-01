/**
 * GAMIFICATION API ROUTES - COMPLETE v1 API ENDPOINTS
 * =====================================================
 * Production-ready API routes that match frontend gamification components
 * expectations with proper versioning (/api/v1/gamification/*)
 */

import express from 'express';
import rateLimit from 'express-rate-limit';

// Import all controllers
import gamificationController from '../controllers/gamificationController.mjs';
import challengeController from '../controllers/challengeController.mjs';
import challengeEngagementController from '../controllers/challengeEngagementController.mjs';
import challengeResultsController from '../controllers/challengeResultsController.mjs';
import challengeSubmissionController from '../controllers/challengeSubmissionController.mjs';
import progressController from '../controllers/progressController.mjs';
import goalController from '../controllers/goalController.mjs';
import socialController from '../controllers/socialController.mjs';

// Import middleware
import { protect, adminOnly, trainerOnly, trainerOrAdminOnly, authorizeResourceAccess, requireAnyRole } from '../middleware/authMiddleware.mjs';
import { viewAsGuard } from '../middleware/viewAsGuard.mjs';
import logger from '../utils/logger.mjs';

// Import viewAs read-identity helper (Phase 18.C.1A)
import { getEffectiveReadUserId } from '../utils/viewAs/getEffectiveReadUserId.mjs';

// Import service layer (replaces mock-res controller calls)
import { getDashboardData, getFeaturedData, searchGamification } from '../services/gamificationDashboardService.mjs';

const router = express.Router();
const routeErrorMeta = (error) => ({
  errorName: error instanceof Error ? error.name : typeof error
});
const parseSearchLimit = (value, fallback = 20, max = 100) => {
  const rawValue = Array.isArray(value) ? null : value;
  const stringValue = String(rawValue ?? '').trim();
  if (!/^[1-9]\d*$/.test(stringValue)) return fallback;
  return Math.min(Number(stringValue), max);
};

// Middleware shortcuts
const authenticate = protect;
const requireAdmin = adminOnly;
const requireTrainer = trainerOrAdminOnly;
// DELIBERATE: 'user' is EXCLUDED here. An authz sweep flagged the omission as a bug (role
// 'user' is the DB default for new signups, so they 403 on join/goals/follow), but
// gamificationLeaderboardRoleContract.test.mjs encodes the actual product boundary —
// "allows user/client/trainer/admin to read the global leaderboard ONLY". Unpromoted signups
// get the read-only surface via requireProfileReader below; participation (joining
// challenges, creating goals) requires client tier. Do not widen this without Sean's call.
const requireUser = requireAnyRole('client', 'trainer', 'admin');
const requireProfileReader = requireAnyRole('user', 'client', 'trainer', 'admin');

// Rate limiter for point-earning actions (20 per hour per user)
const pointActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => `points:${req.user?.id || req.ip}`,
  message: { success: false, message: 'Too many point actions. Please try again later.' }
});
const challengeViewLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many challenge view events. Please try again later.' }
});
// Rate limiter for companion pet mutations (generous for humans, blocks scripted abuse)
const companionActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyGenerator: (req) => `companion:${req.user?.id || req.ip}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many companion actions. Please slow down and try again shortly.' }
});

// ============================================================================
// USER STATS & PROGRESS ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/gamification/users/:userId/stats
 * @desc    Get comprehensive user statistics (FRONTEND EXPECTED)
 * @access  Authenticated users
 */
router.get('/users/:userId/stats', authenticate, authorizeResourceAccess('userId'), progressController.getUserStats);

/**
 * @route   GET /api/v1/gamification/users/:userId/progress
 * @desc    Get user progress data with analytics (FRONTEND EXPECTED)
 * @access  Authenticated users
 */
router.get('/users/:userId/progress', authenticate, authorizeResourceAccess('userId'), progressController.getUserProgress);

/**
 * @route   POST /api/v1/gamification/users/:userId/progress
 * @desc    Record new progress entry
 * @access  Authenticated users
 */
router.post('/users/:userId/progress', authenticate, authorizeResourceAccess('userId'), progressController.recordProgressEntry);

/**
 * @route   GET /api/v1/gamification/users/:userId/insights
 * @desc    Get detailed progress insights and recommendations
 * @access  Authenticated users
 */
router.get('/users/:userId/insights', authenticate, authorizeResourceAccess('userId'), progressController.getProgressInsights);

// ============================================================================
// LEADERBOARD ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/gamification/leaderboard
 * @desc    Get leaderboard with advanced filtering (FRONTEND EXPECTED)
 * @access  Authenticated users
 */
router.get('/leaderboard', authenticate, requireProfileReader, progressController.getLeaderboard);

// ============================================================================
// CHALLENGE SYSTEM ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/gamification/challenge-templates
 * @desc    Get governed trainer/admin challenge creation templates
 * @access  Trainer/Admin
 */
router.get('/challenge-templates', authenticate, requireTrainer, challengeController.getChallengeTemplates);

/**
 * @route   GET /api/v1/gamification/challenge-submissions/policy
 * @desc    Get client challenge submission entitlement policy
 * @access  Authenticated users
 */
router.get('/challenge-submissions/policy', authenticate, requireUser, challengeSubmissionController.getClientChallengeSubmissionPolicy);

/**
 * @route   POST /api/v1/gamification/challenge-submissions
 * @desc    Create a client challenge submission when entitlement opens
 * @access  Authenticated users
 */
router.post('/challenge-submissions', authenticate, requireUser, challengeSubmissionController.createClientChallengeSubmission);
/**
 * @route   GET /api/v1/gamification/challenge-submissions/manage
 * @desc    Get governed trainer/admin challenge submission queue policy
 * @access  Trainer/Admin
 */
router.get('/challenge-submissions/manage', authenticate, requireTrainer, challengeSubmissionController.getManagedChallengeSubmissions);

/**
 * @route   PATCH /api/v1/gamification/challenge-submissions/:id/moderation
 * @desc    Moderate a client-created challenge submission into review, requested changes, rejection, or private draft
 * @access  Trainer/Admin
 */
router.patch('/challenge-submissions/:id/moderation', authenticate, requireTrainer, challengeSubmissionController.moderateManagedChallengeSubmission);

/**
 * @route   POST /api/v1/gamification/users/:userId/challenges/progress-events/workout-completed
 * @desc    Apply a canonical workout-completed event to joined challenges
 * @access  Authenticated user, assigned trainer, or admin
 */
router.post('/users/:userId/challenges/progress-events/workout-completed', authenticate, requireUser, authorizeResourceAccess('userId'), challengeController.recordWorkoutChallengeProgress);

/**
 * @route   GET /api/v1/gamification/challenges
 * @desc    Get all challenges with filters (FRONTEND EXPECTED)
 * @access  Public
 */
// SECURITY (authz sweep 2026-08-04): this was UNAUTHENTICATED and live-verified returning
// HTTP 200 to an anonymous caller. Its payload embeds real member identities — creator and
// up to 5 participants each with {id, firstName, lastName, username, photo} plus per-member
// currentProgress/progressPercentage (challengeListService) — over the CANONICAL `challenges`
// table. It reads empty today only because challenge content is stale; seeding fresh
// challenges would have armed an anonymous member-roster + fitness-progress harvest.
// `authenticate` only (no role gate): every SwanStudios member may browse public challenges,
// which is what the dashboards that consume this actually need.
router.get('/challenges', authenticate, challengeController.getAllChallenges);

/**
 * @route   GET /api/v1/gamification/challenges/manage
 * @desc    Get trainer/admin managed challenges including drafts
 * @access  Trainer/Admin
 */
router.get('/challenges/manage', authenticate, requireTrainer, challengeController.getManagedChallenges);

/**
 * @route   POST /api/v1/gamification/challenges/:id/view
 * @desc    Record aggregate challenge card/detail view analytics
 * @access  Public
 */
router.post('/challenges/:id/view', challengeViewLimiter, challengeEngagementController.recordChallengeView);

/**
 * @route   GET /api/v1/gamification/challenges/:id/results
 * @desc    Get trainer/admin managed challenge result analytics
 * @access  Trainer/Admin
 */
router.get('/challenges/:id/results', authenticate, requireTrainer, challengeResultsController.getManagedChallengeResults);

/**
 * @route   GET /api/v1/gamification/challenges/:id
 * @desc    Get single challenge with full details
 * @access  Public
 */
// Same exposure, worse payload: the detail route loads the FULL participant list (unlimited)
// with nested user identities. Authenticated members only.
router.get('/challenges/:id', authenticate, challengeController.getChallengeById);

/**
 * @route   POST /api/v1/gamification/challenges
 * @desc    Create new challenge (FRONTEND EXPECTED)
 * @access  Trainer/Admin
 */
router.post('/challenges', authenticate, requireTrainer, challengeController.createChallenge);
/**
 * @route   PATCH /api/v1/gamification/challenges/:id/status
 * @desc    Publish an owned draft challenge
 * @access  Trainer/Admin
 */
router.patch('/challenges/:id/status', authenticate, requireTrainer, challengeController.updateManagedChallengeStatus);
/**
 * @route   PUT /api/v1/gamification/challenges/:id/audience
 * @desc    Replace an owned draft challenge audience
 * @access  Trainer/Admin
 */
router.put('/challenges/:id/audience', authenticate, requireTrainer, challengeController.updateManagedChallengeAudience);

/**
 * @route   POST /api/v1/gamification/challenges/:id/join
 * @desc    Join a challenge (FRONTEND EXPECTED)
 * @access  Authenticated users
 */
router.post('/challenges/:id/join', authenticate, requireUser, challengeController.joinChallenge);

/**
 * @route   DELETE /api/v1/gamification/challenges/:id/leave
 * @desc    Leave a challenge
 * @access  Authenticated users
 */
router.delete('/challenges/:id/leave', authenticate, requireUser, challengeController.leaveChallenge);

/**
 * @route   PUT /api/v1/gamification/challenges/:id/progress
 * @desc    Update challenge progress
 * @access  Authenticated users
 */
router.put('/challenges/:id/progress', authenticate, requireUser, challengeController.updateChallengeProgress);

/**
 * @route   GET /api/v1/gamification/challenges/:id/leaderboard
 * @desc    Get challenge-specific leaderboard
 * @access  Authenticated users
 */
router.get('/challenges/:id/leaderboard', authenticate, requireUser, challengeController.getChallengeLeaderboard);

/**
 * @route   GET /api/v1/gamification/users/:userId/challenges
 * @desc    Get user's challenges (active/completed)
 * @access  Authenticated users
 */
router.get('/users/:userId/challenges', authenticate, authorizeResourceAccess('userId'), challengeController.getUserChallenges);

// ============================================================================
// ACHIEVEMENT SYSTEM ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/gamification/achievements
 * @desc    Get all achievements
 * @access  Public
 */
router.get('/achievements', gamificationController.getAllAchievements);

/**
 * @route   GET /api/v1/gamification/users/:userId/achievements
 * @desc    Get user's achievements (FRONTEND EXPECTED)
 * @access  Authenticated users
 */
router.get('/users/:userId/achievements', authenticate, authorizeResourceAccess('userId'),
  gamificationController.getUserProfile
);

/**
 * @route   GET /api/v1/gamification/achievements/:id
 * @desc    Get single achievement details
 * @access  Public
 */
router.get('/achievements/:id', gamificationController.getAchievement);

/**
 * @route   POST /api/v1/gamification/achievements
 * @desc    Create new achievement
 * @access  Admin only
 */
router.post('/achievements', authenticate, requireAdmin, gamificationController.createAchievement);

/**
 * @route   PUT /api/v1/gamification/achievements/:id
 * @desc    Update achievement
 * @access  Admin only
 */
router.put('/achievements/:id', authenticate, requireAdmin, gamificationController.updateAchievement);

/**
 * @route   DELETE /api/v1/gamification/achievements/:id
 * @desc    Delete achievement
 * @access  Admin only
 */
router.delete('/achievements/:id', authenticate, requireAdmin, gamificationController.deleteAchievement);

/**
 * @route   POST /api/v1/gamification/admin/seed-achievements
 * @desc    Debug: seed achievements and return diagnostics
 * @access  Admin only (temporary)
 */
router.post('/admin/seed-achievements', authenticate, requireAdmin, gamificationController.debugSeedAchievements);

/**
 * @route   POST /api/v1/gamification/users/:userId/achievements/:achievementId
 * @desc    Award achievement to user
 * @access  Trainer/Admin
 */
router.post('/users/:userId/achievements/:achievementId', authenticate, requireTrainer, authorizeResourceAccess('userId'), gamificationController.awardAchievement);

/**
 * @route   PUT /api/v1/gamification/users/:userId/achievements/:achievementId/progress
 * @desc    Update user achievement progress
 * @access  Trainer/Admin
 */
router.put('/users/:userId/achievements/:achievementId/progress', authenticate, requireTrainer, authorizeResourceAccess('userId'), gamificationController.updateAchievementProgress);

// ============================================================================
// POINTS & REWARDS SYSTEM
// ============================================================================

/**
 * @route   POST /api/v1/gamification/users/:userId/points
 * @desc    Award points to user
 * @access  Trainer/Admin
 */
router.post('/users/:userId/points', authenticate, requireTrainer, authorizeResourceAccess('userId'), gamificationController.awardPoints);

/**
 * @route   GET /api/v1/gamification/users/:userId/transactions
 * @desc    Get user point transaction history
 * @access  Authenticated users
 */
router.get('/users/:userId/transactions', authenticate, authorizeResourceAccess('userId'), gamificationController.getUserTransactions);

/**
 * @route   GET /api/v1/gamification/rewards
 * @desc    Get all available rewards
 * @access  Public
 */
router.get('/rewards', gamificationController.getAllRewards);

/**
 * @route   GET /api/v1/gamification/rewards/:id
 * @desc    Get single reward details
 * @access  Public
 */
router.get('/rewards/:id', gamificationController.getReward);

/**
 * @route   POST /api/v1/gamification/rewards
 * @desc    Create new reward
 * @access  Admin only
 */
router.post('/rewards', authenticate, requireAdmin, gamificationController.createReward);

/**
 * @route   PUT /api/v1/gamification/rewards/:id
 * @desc    Update reward
 * @access  Admin only
 */
router.put('/rewards/:id', authenticate, requireAdmin, gamificationController.updateReward);

/**
 * @route   DELETE /api/v1/gamification/rewards/:id
 * @desc    Delete reward
 * @access  Admin only
 */
router.delete('/rewards/:id', authenticate, requireAdmin, gamificationController.deleteReward);

/**
 * @route   POST /api/v1/gamification/users/:userId/rewards/:rewardId/redeem
 * @desc    Redeem reward for user
 * @access  Authenticated users
 */
router.post('/users/:userId/rewards/:rewardId/redeem', authenticate, pointActionLimiter, authorizeResourceAccess('userId'), gamificationController.redeemReward);

// ============================================================================
// MILESTONES SYSTEM
// ============================================================================

/**
 * @route   GET /api/v1/gamification/milestones
 * @desc    Get all milestones
 * @access  Public
 */
router.get('/milestones', gamificationController.getAllMilestones);

/**
 * @route   GET /api/v1/gamification/milestones/:id
 * @desc    Get single milestone
 * @access  Public
 */
router.get('/milestones/:id', gamificationController.getMilestone);

/**
 * @route   POST /api/v1/gamification/milestones
 * @desc    Create new milestone
 * @access  Admin only
 */
router.post('/milestones', authenticate, requireAdmin, gamificationController.createMilestone);

/**
 * @route   PUT /api/v1/gamification/milestones/:id
 * @desc    Update milestone
 * @access  Admin only
 */
router.put('/milestones/:id', authenticate, requireAdmin, gamificationController.updateMilestone);

/**
 * @route   DELETE /api/v1/gamification/milestones/:id
 * @desc    Delete milestone
 * @access  Admin only
 */
router.delete('/milestones/:id', authenticate, requireAdmin, gamificationController.deleteMilestone);

/**
 * @route   POST /api/v1/gamification/users/:userId/check-milestones
 * @desc    Check and award milestones for user
 * @access  Trainer/Admin
 */
router.post('/users/:userId/check-milestones', authenticate, requireTrainer, authorizeResourceAccess('userId'), gamificationController.checkAndAwardMilestones);

// ============================================================================
// GOAL MANAGEMENT SYSTEM
// ============================================================================

/**
 * @route   GET /api/v1/gamification/users/:userId/goals
 * @desc    Get user's goals with filtering (FRONTEND EXPECTED)
 * @access  Authenticated users
 */
router.get('/users/:userId/goals', authenticate, authorizeResourceAccess('userId'), goalController.getUserGoals);

/**
 * @route   POST /api/v1/gamification/users/:userId/goals
 * @desc    Create new goal for the authorized user-scoped frontend path
 * @access  Authenticated users
 */
router.post('/users/:userId/goals', authenticate, authorizeResourceAccess('userId'), goalController.createGoal);

/**
 * @route   GET /api/v1/gamification/goals/:id
 * @desc    Get single goal with detailed analytics
 * @access  Authenticated users
 */
router.get('/goals/:id', authenticate, requireUser, goalController.getGoalById);

/**
 * @route   POST /api/v1/gamification/goals
 * @desc    Create new goal
 * @access  Authenticated users
 */
router.post('/goals', authenticate, requireUser, goalController.createGoal);

/**
 * @route   PUT /api/v1/gamification/goals/:id
 * @desc    Update goal details
 * @access  Authenticated users
 */
router.put('/goals/:id', authenticate, requireUser, goalController.updateGoal);

/**
 * @route   PUT /api/v1/gamification/goals/:id/progress
 * @desc    Update goal progress
 * @access  Authenticated users
 */
router.put('/goals/:id/progress', authenticate, requireUser, goalController.updateGoalProgress);

/**
 * @route   DELETE /api/v1/gamification/goals/:id
 * @desc    Delete goal
 * @access  Authenticated users
 */
router.delete('/goals/:id', authenticate, requireUser, goalController.deleteGoal);

/**
 * @route   GET /api/v1/gamification/goals/:id/analytics
 * @desc    Get goal analytics and insights
 * @access  Authenticated users
 */
router.get('/goals/:id/analytics', authenticate, requireUser, goalController.getGoalAnalytics);

/**
 * @route   GET /api/v1/gamification/users/:userId/goals/categories
 * @desc    Get goal categories statistics
 * @access  Authenticated users
 */
router.get('/users/:userId/goals/categories', authenticate, authorizeResourceAccess('userId'), goalController.getGoalCategoriesStats);

// ============================================================================
// SOCIAL FEATURES & USER INTERACTIONS
// ============================================================================

/**
 * @route   POST /api/v1/gamification/users/:userId/follow
 * @desc    Follow a user (FRONTEND EXPECTED)
 * @access  Authenticated users
 */
router.post('/users/:userId/follow', authenticate, requireUser, socialController.followUser);

/**
 * @route   DELETE /api/v1/gamification/users/:userId/unfollow
 * @desc    Unfollow a user
 * @access  Authenticated users
 */
router.delete('/users/:userId/unfollow', authenticate, requireUser, socialController.unfollowUser);

/**
 * @route   GET /api/v1/gamification/users/:userId/followers
 * @desc    Get user's followers
 * @access  Authenticated users
 */
router.get('/users/:userId/followers', authenticate, requireUser, socialController.getUserFollowers);

/**
 * @route   GET /api/v1/gamification/users/:userId/following
 * @desc    Get users that user is following
 * @access  Authenticated users
 */
router.get('/users/:userId/following', authenticate, requireUser, socialController.getUserFollowing);

/**
 * @route   GET /api/v1/gamification/users/:userId/follow-status
 * @desc    Check follow status between users
 * @access  Authenticated users
 */
router.get('/users/:userId/follow-status', authenticate, requireUser, socialController.getFollowStatus);

/**
 * @route   GET /api/v1/gamification/users/:userId/social-stats
 * @desc    Get user's social statistics
 * @access  Authenticated users
 */
router.get('/users/:userId/social-stats', authenticate, requireUser, socialController.getUserSocialStats);

/**
 * @route   GET /api/v1/gamification/discover-users
 * @desc    Discover users to follow (FRONTEND EXPECTED)
 * @access  Authenticated users
 */
router.get('/discover-users', authenticate, requireUser, socialController.discoverUsers);

/**
 * @route   GET /api/v1/gamification/social-feed
 * @desc    Get personalized social activity feed (FRONTEND EXPECTED)
 * @access  Authenticated users
 */
router.get('/social-feed', authenticate, requireUser, socialController.getSocialFeed);

// ============================================================================
// SETTINGS & CONFIGURATION
// ============================================================================

/**
 * @route   GET /api/v1/gamification/settings
 * @desc    Get gamification settings
 * @access  Public
 */
router.get('/settings', gamificationController.getSettings);

/**
 * @route   PUT /api/v1/gamification/settings
 * @desc    Update gamification settings
 * @access  Admin only
 */
router.put('/settings', authenticate, requireAdmin, gamificationController.updateSettings);

// ============================================================================
// WORKOUT INTEGRATION
// ============================================================================

/**
 * @route   POST /api/v1/gamification/record-workout
 * @desc    Record workout completion and award points
 * @access  Authenticated users
 */
router.post(
  '/record-workout',
  authenticate,
  requireUser,
  (req, res, next) => {
    req.body = req.body || {};
    if (req.body.userId === undefined && req.user?.id !== undefined) {
      req.body.userId = req.user.id;
    }
    return next();
  },
  authorizeResourceAccess('userId'),
  pointActionLimiter,
  gamificationController.recordWorkoutCompletion
);

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * @route   PATCH /api/v1/gamification/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Authenticated users
 */
router.patch('/notifications/:notificationId/read', authenticate, requireUser, gamificationController.markNotificationAsRead);

// ============================================================================
// USER PROFILE ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/gamification/profile
 * @desc    Get current user's gamification profile (convenience route)
 * @access  Authenticated users
 */
router.get('/profile', authenticate, requireProfileReader, viewAsGuard, (req, res) => {
  req.params.userId = getEffectiveReadUserId(req);
  return gamificationController.getUserProfile(req, res);
});

/**
 * @route   PUT /api/v1/gamification/profile/rank-title
 * @desc    Select one earned rank title for the current user's public tag
 * @access  Authenticated users
 */
router.put('/profile/rank-title', authenticate, requireProfileReader, (req, res) => {
  req.params.userId = req.user.id;
  return gamificationController.setSelectedRankTitle(req, res);
});

/**
 * @route   GET /api/v1/gamification/users/:userId/profile
 * @desc    Get user gamification profile
 * @access  Authenticated users
 */
router.get('/users/:userId/profile', authenticate, authorizeResourceAccess('userId'), gamificationController.getUserProfile);

// ============================================================================
// ADDITIONAL ENDPOINTS FOR FRONTEND COMPATIBILITY
// ============================================================================

/**
 * @route   GET /api/v1/gamification/dashboard
 * @desc    Get comprehensive dashboard data
 * @access  Authenticated users
 */
router.get('/dashboard', authenticate, requireUser, viewAsGuard, async (req, res) => {
  try {
    const dashboard = await getDashboardData(getEffectiveReadUserId(req));
    return res.status(200).json({ success: true, dashboard });
  } catch (error) {
    logger.error('[Gamification] Dashboard error:', routeErrorMeta(error));
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
});

/**
 * @route   GET /api/v1/gamification/featured
 * @desc    Get featured challenges and achievements
 * @access  Public
 */
router.get('/featured', async (req, res) => {
  try {
    const featured = await getFeaturedData();
    return res.status(200).json({ success: true, featured });
  } catch (error) {
    logger.error('[Gamification] Featured error:', routeErrorMeta(error));
    return res.status(500).json({ success: false, message: 'Failed to fetch featured content' });
  }
});

/**
 * @route   GET /api/v1/gamification/search
 * @desc    Search across challenges, achievements, and rewards
 * @access  Public
 */
router.get('/search', async (req, res) => {
  try {
    const { q, type = 'all', limit = 20 } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const sanitizedQuery = q.trim().substring(0, 200);
    const sanitizedLimit = parseSearchLimit(limit);
    const validTypes = ['all', 'challenges', 'achievements', 'rewards'];
    const sanitizedType = validTypes.includes(type) ? type : 'all';

    const results = await searchGamification(sanitizedQuery, sanitizedType, sanitizedLimit);
    return res.status(200).json({
      success: true,
      query: sanitizedQuery,
      results,
      total: (results.challenges?.length || 0) + (results.achievements?.length || 0) + (results.rewards?.length || 0)
    });
  } catch (error) {
    logger.error('[Gamification] Search error:', routeErrorMeta(error));
    return res.status(500).json({ success: false, message: 'Search failed' });
  }
});

// ============================================================================
// STREAK FREEZE SYSTEM (Loss Aversion Psychology)
// ============================================================================

/**
 * @route   GET /api/v1/gamification/streak-freeze/:userId
 * @desc    Get user's streak freeze status (available, max, used)
 * @access  Authenticated users (own data or staff)
 */
router.get('/streak-freeze/:userId', authenticate, authorizeResourceAccess('userId'), gamificationController.getStreakFreezeStatus);

/**
 * @route   POST /api/v1/gamification/streak-freeze/use
 * @desc    Use a streak freeze to protect current streak
 * @access  Authenticated users
 */
router.post('/streak-freeze/use', authenticate, requireUser, gamificationController.useStreakFreeze);

// ============================================================================
// COMEBACK CHALLENGES (Re-engagement Psychology)
// ============================================================================

/**
 * @route   GET /api/v1/gamification/comeback-challenge/:userId
 * @desc    Get active comeback challenge for user
 * @access  Authenticated users (own data or staff)
 */
router.get('/comeback-challenge/:userId', authenticate, authorizeResourceAccess('userId'), gamificationController.getComebackChallenge);

/**
 * @route   POST /api/v1/gamification/comeback-challenge/accept
 * @desc    Accept a comeback challenge
 * @access  Authenticated users
 */
router.post('/comeback-challenge/accept', authenticate, requireUser, gamificationController.acceptComebackChallenge);

// ============================================================================
// ACTIVITY FEED & WEEKLY RECAP (Social Psychology)
// ============================================================================

/**
 * @route   GET /api/v1/gamification/activity-feed
 * @desc    Get recent gamification activity for live feed (polling fallback)
 * @access  Authenticated users
 */
router.get('/activity-feed', authenticate, requireUser, gamificationController.getActivityFeed);

/**
 * @route   GET /api/v1/gamification/users/:userId/weekly-recap
 * @desc    Get weekly recap stats (this week vs last week)
 * @access  Authenticated users (own data or staff)
 */
router.get('/users/:userId/weekly-recap', authenticate, authorizeResourceAccess('userId'), gamificationController.getWeeklyRecap);

// ===================== GHOST MODE ENDPOINTS =====================
router.get('/ghost/config', authenticate, requireUser, gamificationController.getGhostConfig);
router.get('/users/:userId/ghost', authenticate, authorizeResourceAccess('userId'), gamificationController.getGhost);
router.post('/users/:userId/ghost/compare', authenticate, authorizeResourceAccess('userId'), gamificationController.compareGhost);

// ===================== VAULT DECRYPTION ENDPOINTS =====================
router.get('/vault/config', authenticate, requireUser, gamificationController.getVaultConfig);
router.post('/users/:userId/vault/roll', authenticate, authorizeResourceAccess('userId'), pointActionLimiter, gamificationController.rollVaultDrop);
router.get('/users/:userId/vault/inventory', authenticate, authorizeResourceAccess('userId'), gamificationController.getVaultInventory);

// ===================== AEGIS HUD + JOB CLASS ENDPOINTS =====================
router.get('/users/:userId/aegis-hud', authenticate, authorizeResourceAccess('userId'), gamificationController.getAegisHud);
router.post('/users/:userId/aegis-hud/replenish', authenticate, authorizeResourceAccess('userId'), gamificationController.replenishAegisHud);
router.put('/users/:userId/aegis-hud/:needKey', authenticate, requireAdmin, gamificationController.setAegisHudNeed);
router.get('/aegis-hud/config', authenticate, requireUser, gamificationController.getAegisHudConfig);
router.get('/users/:userId/job-class', authenticate, authorizeResourceAccess('userId'), gamificationController.getJobClass);
router.put('/users/:userId/job-class', authenticate, authorizeResourceAccess('userId'), gamificationController.setJobClass);

// ===================== COMPANION PET ENDPOINTS =====================
router.get('/pet/config', authenticate, requireUser, gamificationController.getPetConfig);
router.get('/users/:userId/pet', authenticate, authorizeResourceAccess('userId'), gamificationController.getPet);
router.post('/users/:userId/pet/adopt', authenticate, authorizeResourceAccess('userId'), companionActionLimiter, gamificationController.adoptPet);
router.post('/users/:userId/pet/interact', authenticate, authorizeResourceAccess('userId'), companionActionLimiter, gamificationController.interactWithPet);
router.post('/users/:userId/pet/activity', authenticate, authorizeResourceAccess('userId'), pointActionLimiter, gamificationController.recordPetActivity);
router.put('/users/:userId/pet/rename', authenticate, authorizeResourceAccess('userId'), companionActionLimiter, gamificationController.renamePet);
router.delete('/users/:userId/pet', authenticate, authorizeResourceAccess('userId'), companionActionLimiter, gamificationController.releasePet);

export default router;
