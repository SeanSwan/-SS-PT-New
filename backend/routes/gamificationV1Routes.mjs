/**
 * 🚀 GAMIFICATION API ROUTES - COMPLETE v1 API ENDPOINTS
 * =====================================================
 * Production-ready API routes that match frontend gamification components
 * expectations with proper versioning (/api/v1/gamification/*)
 */

import express from 'express';

// Import all controllers
import gamificationController from '../controllers/gamificationController.mjs';
import challengeController from '../controllers/challengeController.mjs';
import progressController from '../controllers/progressController.mjs';
import goalController from '../controllers/goalController.mjs';
import socialController from '../controllers/socialController.mjs';

// Import middleware
import { protect, adminOnly, trainerOnly, trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';

const router = express.Router();

// Middleware shortcuts
const authenticate = protect;
const requireAdmin = adminOnly;
const requireTrainer = trainerOrAdminOnly;
const requireUser = (req, res, next) => {
  if (req.user && (req.user.role === 'client' || req.user.role === 'trainer' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Authentication required'
    });
  }
};

// ============================================================================
// 📊 USER STATS & PROGRESS ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/gamification/users/:userId/stats
 * @desc    Get comprehensive user statistics (FRONTEND EXPECTED)
 * @access  Authenticated users
 */
router.get('/users/:userId/stats', authenticate, requireUser, progressController.getUserStats);

/**
 * @route   GET /api/v1/gamification/users/:userId/progress
 * @desc    Get user progress data with analytics (FRONTEND EXPECTED)
 * @access  Authenticated users
 */
router.get('/users/:userId/progress', authenticate, requireUser, progressController.getUserProgress);

/**
 * @route   POST /api/v1/gamification/users/:userId/progress
 * @desc    Record new progress entry
 * @access  Authenticated users
 */
router.post('/users/:userId/progress', authenticate, requireUser, progressController.recordProgressEntry);

/**
 * @route   GET /api/v1/gamification/users/:userId/insights
 * @desc    Get detailed progress insights and recommendations
 * @access  Authenticated users
 */
router.get('/users/:userId/insights', authenticate, requireUser, progressController.getProgressInsights);

// ============================================================================
// 🏆 LEADERBOARD ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/gamification/leaderboard
 * @desc    Get leaderboard with advanced filtering (FRONTEND EXPECTED)
 * @access  Public
 */
router.get('/leaderboard', progressController.getLeaderboard);

// ============================================================================
// 🎯 CHALLENGE SYSTEM ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/gamification/challenges
 * @desc    Get all challenges with filters (FRONTEND EXPECTED)
 * @access  Public
 */
router.get('/challenges', challengeController.getAllChallenges);

/**
 * @route   GET /api/v1/gamification/challenges/:id
 * @desc    Get single challenge with full details
 * @access  Public
 */
router.get('/challenges/:id', challengeController.getChallengeById);

/**
 * @route   POST /api/v1/gamification/challenges
 * @desc    Create new challenge (FRONTEND EXPECTED)
 * @access  Trainer/Admin
 */
router.post('/challenges', authenticate, requireTrainer, challengeController.createChallenge);

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
 * @access  Public
 */
router.get('/challenges/:id/leaderboard', challengeController.getChallengeLeaderboard);

/**
 * @route   GET /api/v1/gamification/users/:userId/challenges
 * @desc    Get user's challenges (active/completed)
 * @access  Authenticated users
 */
router.get('/users/:userId/challenges', authenticate, requireUser, challengeController.getUserChallenges);

// ============================================================================
// 🏅 ACHIEVEMENT SYSTEM ENDPOINTS
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
router.get('/users/:userId/achievements', authenticate, requireUser, async (req, res) => {
  try {
    // This is a wrapper to get user-specific achievements
    req.params.userId = req.params.userId;
    return await gamificationController.getUserProfile(req, res);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user achievements',
      error: error.message
    });
  }
});

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
 * @route   POST /api/v1/gamification/users/:userId/achievements/:achievementId
 * @desc    Award achievement to user
 * @access  Trainer/Admin
 */
router.post('/users/:userId/achievements/:achievementId', authenticate, requireTrainer, gamificationController.awardAchievement);

/**
 * @route   PUT /api/v1/gamification/users/:userId/achievements/:achievementId/progress
 * @desc    Update user achievement progress
 * @access  Trainer/Admin
 */
router.put('/users/:userId/achievements/:achievementId/progress', authenticate, requireTrainer, gamificationController.updateAchievementProgress);

// ============================================================================
// 💰 POINTS & REWARDS SYSTEM
// ============================================================================

/**
 * @route   POST /api/v1/gamification/users/:userId/points
 * @desc    Award points to user
 * @access  Trainer/Admin
 */
router.post('/users/:userId/points', authenticate, requireTrainer, gamificationController.awardPoints);

/**
 * @route   GET /api/v1/gamification/users/:userId/transactions
 * @desc    Get user point transaction history
 * @access  Authenticated users
 */
router.get('/users/:userId/transactions', authenticate, requireUser, gamificationController.getUserTransactions);

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
router.post('/users/:userId/rewards/:rewardId/redeem', authenticate, requireUser, gamificationController.redeemReward);

// ============================================================================
// 🎖️ MILESTONES SYSTEM
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
router.post('/users/:userId/check-milestones', authenticate, requireTrainer, gamificationController.checkAndAwardMilestones);

// ============================================================================
// 🎯 GOAL MANAGEMENT SYSTEM
// ============================================================================

/**
 * @route   GET /api/v1/gamification/users/:userId/goals
 * @desc    Get user's goals with filtering (FRONTEND EXPECTED)
 * @access  Authenticated users
 */
router.get('/users/:userId/goals', authenticate, requireUser, goalController.getUserGoals);

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
router.get('/users/:userId/goals/categories', authenticate, requireUser, goalController.getGoalCategoriesStats);

// ============================================================================
// 👥 SOCIAL FEATURES & USER INTERACTIONS
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
 * @access  Public
 */
router.get('/users/:userId/followers', socialController.getUserFollowers);

/**
 * @route   GET /api/v1/gamification/users/:userId/following
 * @desc    Get users that user is following
 * @access  Public
 */
router.get('/users/:userId/following', socialController.getUserFollowing);

/**
 * @route   GET /api/v1/gamification/users/:userId/follow-status
 * @desc    Check follow status between users
 * @access  Authenticated users
 */
router.get('/users/:userId/follow-status', authenticate, requireUser, socialController.getFollowStatus);

/**
 * @route   GET /api/v1/gamification/users/:userId/social-stats
 * @desc    Get user's social statistics
 * @access  Public
 */
router.get('/users/:userId/social-stats', socialController.getUserSocialStats);

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
// ⚙️ SETTINGS & CONFIGURATION
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
// 🔥 WORKOUT INTEGRATION
// ============================================================================

/**
 * @route   POST /api/v1/gamification/record-workout
 * @desc    Record workout completion and award points
 * @access  Authenticated users
 */
router.post('/record-workout', authenticate, requireUser, gamificationController.recordWorkoutCompletion);

// ============================================================================
// 🔔 NOTIFICATIONS
// ============================================================================

/**
 * @route   PATCH /api/v1/gamification/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Authenticated users
 */
router.patch('/notifications/:notificationId/read', authenticate, requireUser, gamificationController.markNotificationAsRead);

// ============================================================================
// 📱 USER PROFILE ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/gamification/users/:userId/profile
 * @desc    Get user gamification profile
 * @access  Authenticated users
 */
router.get('/users/:userId/profile', authenticate, requireUser, gamificationController.getUserProfile);

// ============================================================================
// 🎯 ADDITIONAL ENDPOINTS FOR FRONTEND COMPATIBILITY
// ============================================================================

/**
 * @route   GET /api/v1/gamification/dashboard
 * @desc    Get comprehensive dashboard data
 * @access  Authenticated users
 */
router.get('/dashboard', authenticate, requireUser, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Fetch data from multiple endpoints
    const [statsRes, progressRes, challengesRes] = await Promise.allSettled([
      // Get user stats
      new Promise((resolve, reject) => {
        req.params.userId = userId;
        progressController.getUserStats(req, { 
          status: (code) => ({ json: (data) => code === 200 ? resolve(data) : reject(data) }) 
        });
      }),
      // Get recent progress
      new Promise((resolve, reject) => {
        req.params.userId = userId;
        req.query = { timeframe: 'weekly', limit: 7 };
        progressController.getUserProgress(req, {
          status: (code) => ({ json: (data) => code === 200 ? resolve(data) : reject(data) })
        });
      }),
      // Get user challenges
      new Promise((resolve, reject) => {
        req.params.userId = userId;
        req.query = { status: 'active', limit: 5 };
        challengeController.getUserChallenges(req, {
          status: (code) => ({ json: (data) => code === 200 ? resolve(data) : reject(data) })
        });
      })
    ]);

    return res.status(200).json({
      success: true,
      dashboard: {
        stats: statsRes.status === 'fulfilled' ? statsRes.value.stats : null,
        progress: progressRes.status === 'fulfilled' ? progressRes.value : null,
        challenges: challengesRes.status === 'fulfilled' ? challengesRes.value.challenges : []
      }
    });
  } catch (error) {
    console.error('❌ Error fetching dashboard data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/gamification/featured
 * @desc    Get featured challenges and achievements
 * @access  Public
 */
router.get('/featured', async (req, res) => {
  try {
    const featuredChallenges = await challengeController.getAllChallenges({
      query: { featured: 'true', limit: 6, status: 'active' }
    }, { 
      status: (code) => ({ json: (data) => data }),
      json: (data) => data
    });

    const featuredAchievements = await gamificationController.getAllAchievements({
      query: { limit: 8 }
    }, {
      status: (code) => ({ json: (data) => data }),
      json: (data) => data
    });

    return res.status(200).json({
      success: true,
      featured: {
        challenges: featuredChallenges.challenges || [],
        achievements: featuredAchievements.achievements || []
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch featured content',
      error: error.message
    });
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
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const results = {
      challenges: [],
      achievements: [],
      rewards: []
    };

    if (type === 'all' || type === 'challenges') {
      const challengeResults = await challengeController.getAllChallenges({
        query: { search: q, limit: Math.floor(limit / 3) }
      }, {
        status: (code) => ({ json: (data) => data }),
        json: (data) => data
      });
      results.challenges = challengeResults.challenges || [];
    }

    if (type === 'all' || type === 'achievements') {
      const achievementResults = await gamificationController.getAllAchievements({
        query: { limit: Math.floor(limit / 3) }
      }, {
        status: (code) => ({ json: (data) => data }),
        json: (data) => data
      });
      // Filter achievements by search query
      results.achievements = (achievementResults.achievements || [])
        .filter(a => 
          a.name.toLowerCase().includes(q.toLowerCase()) || 
          a.description.toLowerCase().includes(q.toLowerCase())
        );
    }

    if (type === 'all' || type === 'rewards') {
      const rewardResults = await gamificationController.getAllRewards({
        query: { limit: Math.floor(limit / 3) }
      }, {
        status: (code) => ({ json: (data) => data }),
        json: (data) => data
      });
      // Filter rewards by search query
      results.rewards = (rewardResults.rewards || [])
        .filter(r => 
          r.name.toLowerCase().includes(q.toLowerCase()) || 
          r.description.toLowerCase().includes(q.toLowerCase())
        );
    }

    return res.status(200).json({
      success: true,
      query: q,
      results,
      total: results.challenges.length + results.achievements.length + results.rewards.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
});

export default router;
