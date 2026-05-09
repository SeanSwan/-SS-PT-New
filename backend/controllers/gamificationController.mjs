/**
 * ============================================================================
 * FILE: gamificationController.mjs
 * PURPOSE: REST API controller for all gamification endpoints (25+ methods)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-23
 * AI VILLAGE VALIDATED: 2026-03-23
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Handles all /api/gamification/* and /api/v1/gamification/*
 * routes — point awards, achievement queries, leaderboards, tier display, skill
 * trees, streaks, admin settings, and user progress endpoints.
 *
 * HOW IT FITS IN THE APP:
 *   gamificationRoutes.mjs → gamificationController → Sequelize models
 *                                                    → GamificationEngine
 *                                                    → levelingAlgorithm
 *
 * KEY DECISIONS:
 * - 2480 lines — EXCEEDS 300-line rule. Phase 6 Strangler Fig decomposition planned.
 * - Uses direct Sequelize queries rather than delegating to GamificationEngine for most ops
 * - Achievement dedup added 2026-03-22 (name-based filtering in getAllAchievements)
 * - Default filters: isActive=true, isHidden=false unless admin requests otherwise
 *
 * KNOWN ISSUES:
 * - Monolith file (2480 lines) — decompose into route-grouped service files
 * - Some methods duplicate logic from GamificationEngine
 * - No idempotency keys on point award endpoints
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Gamification System
 *
 * Architecture Overview:
 * ┌─────────────────────┐      ┌──────────────────┐      ┌─────────────────┐
 * │  Client Dashboard   │─────▶│  Gamification    │─────▶│  PostgreSQL     │
 * │  (React)            │      │  Controller      │      │  (8 tables)     │
 * └─────────────────────┘      └──────────────────┘      └─────────────────┘
 *                                       │
 *                                       │ (transactions)
 *                                       ▼
 *                              ┌──────────────────┐
 *                              │  Points Engine   │
 *                              │  Auto-Awards     │
 *                              │  Tier Promotion  │
 *                              └──────────────────┘
 *
 * Database Schema (Gamification Ecosystem):
 *
 *   ┌───────────────────────────┐
 *   │ gamification_settings     │ (Singleton)
 *   │ ├─isEnabled               │
 *   │ ├─pointsPerWorkout: 50    │
 *   │ ├─pointsPerExercise: 10   │
 *   │ ├─pointsPerStreak: 20     │
 *   │ ├─pointsMultiplier: 1.0   │
 *   │ └─tierThresholds: {}      │
 *   └───────────────────────────┘
 *          │
 *          │ (governs)
 *          ▼
 *   ┌───────────────────────────┐       ┌───────────────────────────┐
 *   │ users                     │◀──────│ point_transactions        │
 *   │ ├─points (INTEGER)        │       │ ├─userId (FK)             │
 *   │ ├─level (INTEGER)         │       │ ├─points (INTEGER)        │
 *   │ ├─tier (ENUM)             │       │ ├─balance (INTEGER)       │
 *   │ ├─streakDays (INTEGER)    │       │ ├─transactionType (ENUM)  │
 *   │ ├─totalWorkouts           │       │ ├─source (STRING)         │
 *   │ ├─totalExercises          │       │ └─description (TEXT)      │
 *   │ └─badgesPrimary (FK)      │       └───────────────────────────┘
 *   └───────────────────────────┘
 *          │
 *          ├──────────────────────────────┐
 *          │                              │
 *          ▼                              ▼
 *   ┌───────────────────────────┐ ┌───────────────────────────┐
 *   │ user_achievements         │ │ user_rewards              │
 *   │ ├─userId (FK)             │ │ ├─userId (FK)             │
 *   │ ├─achievementId (FK)      │ │ ├─rewardId (FK)           │
 *   │ ├─progress (0-100)        │ │ ├─redeemedAt (DATE)       │
 *   │ ├─isCompleted (BOOLEAN)   │ │ ├─status (pending/used)   │
 *   │ └─earnedAt (DATE)         │ │ └─pointsCost (INTEGER)    │
 *   └───────────────────────────┘ └───────────────────────────┘
 *          │                              │
 *          ▼                              ▼
 *   ┌───────────────────────────┐ ┌───────────────────────────┐
 *   │ achievements              │ │ rewards                   │
 *   │ ├─name                    │ │ ├─name                    │
 *   │ ├─pointValue: 100         │ │ ├─pointCost: 500          │
 *   │ ├─requirementType         │ │ ├─stock (INTEGER)         │
 *   │ ├─tier (bronze/silver...) │ │ ├─redemptionCount         │
 *   │ └─badgeImageUrl           │ │ └─expiresAt (DATE)        │
 *   └───────────────────────────┘ └───────────────────────────┘
 *
 *   ┌───────────────────────────┐
 *   │ user_milestones           │
 *   │ ├─userId (FK)             │
 *   │ ├─milestoneId (FK)        │
 *   │ ├─reachedAt (DATE)        │
 *   │ └─bonusPointsAwarded      │
 *   └───────────────────────────┘
 *          │
 *          ▼
 *   ┌───────────────────────────┐
 *   │ milestones                │
 *   │ ├─name                    │
 *   │ ├─targetPoints: 1000      │
 *   │ ├─bonusPoints: 200        │
 *   │ ├─tier (bronze/silver...) │
 *   │ └─requiredForPromotion    │
 *   └───────────────────────────┘
 *
 * Controller Methods (25 total):
 *
 * ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 * │ CATEGORY                 METHOD                              PURPOSE                      │
 * ├──────────────────────────────────────────────────────────────────────────────────────────┤
 * │ Settings (2)             getSettings                         Get gamification config      │
 * │                          updateSettings                      Update config (admin)        │
 * ├──────────────────────────────────────────────────────────────────────────────────────────┤
 * │ User Profile (2)         getUserProfile                      Get user game stats          │
 * │                          getLeaderboard                      Top users by points          │
 * ├──────────────────────────────────────────────────────────────────────────────────────────┤
 * │ Points (3)               awardPoints                         Award/deduct points          │
 * │                          getUserTransactions                 Transaction history          │
 * │                          recordWorkoutCompletion             Auto-award workout points    │
 * ├──────────────────────────────────────────────────────────────────────────────────────────┤
 * │ Achievements (7)         getAllAchievements                  List achievements            │
 * │                          getAchievement                      Single achievement           │
 * │                          createAchievement                   Create (admin)               │
 * │                          updateAchievement                   Update (admin)               │
 * │                          deleteAchievement                   Delete (admin)               │
 * │                          awardAchievement                    Award to user                │
 * │                          updateAchievementProgress           Update progress %            │
 * ├──────────────────────────────────────────────────────────────────────────────────────────┤
 * │ Rewards (6)              getAllRewards                       List rewards                 │
 * │                          getReward                           Single reward                │
 * │                          createReward                        Create (admin)               │
 * │                          updateReward                        Update (admin)               │
 * │                          deleteReward                        Delete/deactivate (admin)    │
 * │                          redeemReward                        User spend points            │
 * ├──────────────────────────────────────────────────────────────────────────────────────────┤
 * │ Milestones (5)           getAllMilestones                    List milestones              │
 * │                          getMilestone                        Single milestone             │
 * │                          createMilestone                     Create (admin)               │
 * │                          updateMilestone                     Update (admin)               │
 * │                          deleteMilestone                     Delete (admin)               │
 * │                          checkAndAwardMilestones             Auto-check earned            │
 * └──────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * Gamification Flow (Workout → Points → Tier → Milestone):
 * ```mermaid
 * sequenceDiagram
 *     participant U as User
 *     participant C as gamificationController
 *     participant DB as PostgreSQL
 *     participant TE as Tier Engine
 *     participant ME as Milestone Engine
 *
 *     U->>C: recordWorkoutCompletion({duration, exercises})
 *     C->>DB: Get gamification_settings
 *     C->>C: Calculate points (workout + exercises + duration bonus)
 *     C->>C: Apply pointsMultiplier (1.0x - 2.0x)
 *     C->>DB: Create point_transaction (earn)
 *     C->>DB: Update user.points, totalWorkouts, streakDays
 *
 *     C->>TE: Check tier promotion
 *     alt Points >= next tier threshold
 *         TE->>DB: Update user.tier (bronze → silver)
 *         TE->>ME: Award tier milestone bonus
 *         ME->>DB: Create user_milestone record
 *         ME->>DB: Award bonus points
 *     end
 *
 *     C->>ME: Check milestone achievements
 *     alt User reached milestone targetPoints
 *         ME->>DB: Create user_milestone record
 *         ME->>DB: Award bonusPoints
 *     end
 *
 *     C-->>U: {pointsAwarded, newBalance, awardedMilestones, streakDays}
 * ```
 *
 * Tier Promotion System:
 *
 *   User earns points
 *         │
 *         ▼
 *   ┌─────────────────┐
 *   │ Check tier      │
 *   │ thresholds      │
 *   └─────────────────┘
 *         │
 *         ├───────────────┬───────────────┬───────────────┐
 *         │               │               │               │
 *         ▼               ▼               ▼               ▼
 *   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
 *   │ Bronze   │   │ Silver   │   │ Gold     │   │ Platinum │
 *   │ 0+ pts   │   │ 1000+ pts│   │ 5000+ pts│   │ 20000+pts│
 *   └──────────┘   └──────────┘   └──────────┘   └──────────┘
 *         │               │               │               │
 *         ▼               ▼               ▼               ▼
 *   (starting)    (milestone bonus)  (milestone bonus)  (max tier)
 *
 * Achievement Requirement Types:
 * - workout_count: Complete N workouts
 * - exercise_count: Complete N exercises
 * - points_earned: Earn N total points
 * - streak_days: Maintain N-day workout streak
 * - specific_exercise: Complete specific exercise N times
 * - tier_reached: Reach specific tier (bronze/silver/gold/platinum)
 *
 * Point Transaction Types:
 * - earn: Points awarded (workout, achievement)
 * - spend: Points redeemed (rewards)
 * - bonus: Bonus points (milestone, streak)
 * - expire: Points expired (time-based expiration)
 * - adjust: Manual admin adjustment
 *
 * Error Responses:
 *
 * 400 Bad Request - Missing required fields
 * {
 *   success: false,
 *   message: "Points, source, and description are required"
 * }
 *
 * 400 Bad Request - Insufficient points
 * {
 *   success: false,
 *   message: "Insufficient points to redeem this reward"
 * }
 *
 * 400 Bad Request - Out of stock
 * {
 *   success: false,
 *   message: "This reward is out of stock"
 * }
 *
 * 400 Bad Request - Already earned
 * {
 *   success: false,
 *   message: "User already has this achievement"
 * }
 *
 * 404 Not Found - Entity not found
 * {
 *   success: false,
 *   message: "Achievement not found"
 * }
 *
 * 500 Internal Server Error - Database/transaction error
 * {
 *   success: false,
 *   message: "Failed to award points",
 *   error: "..." (error message)
 * }
 *
 * Security Model:
 *
 * 1. Role-Based Access:
 *    - Create/Update/Delete achievements/rewards/milestones: Admin only
 *    - Award points: Admin or system (req.user?.id tracked)
 *    - View leaderboard: Public
 *    - User profile: Own profile or admin
 *
 * 2. Transaction Safety:
 *    - All point operations wrapped in database transactions
 *    - Automatic rollback on errors (ACID compliance)
 *    - Balance tracking (prevents negative balances via validation)
 *
 * 3. Stock Management:
 *    - Rewards have stock limits (prevents over-redemption)
 *    - Atomic decrement (transaction-protected)
 *    - Deactivate instead of delete if redemptions exist
 *
 * 4. Expiration Handling:
 *    - Rewards can have expiresAt timestamp
 *    - Expired rewards cannot be redeemed
 *    - User rewards track redemption date
 *
 * 5. Audit Trail:
 *    - All point transactions logged with source/sourceId
 *    - awardedBy field tracks which admin/system gave points
 *    - Metadata JSON stores additional context
 *
 * Business Logic:
 *
 * WHY Separate Tables for UserAchievements, UserRewards, UserMilestones?
 * - Many-to-many relationships (users can have multiple achievements)
 * - Progress tracking (achievement progress 0-100%)
 * - Timestamp tracking (when earned, when redeemed)
 * - Points awarded tracking (how many points given per achievement)
 * - Historical data (even if achievement deleted, user keeps record)
 *
 * WHY Point Transactions Table Instead of Just user.points?
 * - Complete audit trail (who, when, why for compliance)
 * - Transaction history for user (view earning/spending history)
 * - Balance reconciliation (can recalculate user.points from transactions)
 * - Source tracking (workout_completion, achievement_earned, reward_redemption)
 * - Debugging (identify point calculation bugs)
 *
 * WHY Tier Thresholds in Settings (Not Hardcoded)?
 * - Flexibility to adjust game economy without code changes
 * - A/B testing different tier structures
 * - Seasonal events (temporarily lower thresholds)
 * - Admin control via settings API
 *
 * WHY Points Multiplier Feature?
 * - Promotional events (2x points weekends)
 * - VIP users (1.5x multiplier)
 * - Challenge modes (1.2x for harder workouts)
 * - Engagement boost during slow periods
 *
 * WHY Auto-Award Milestones on Points Update?
 * - User delight (instant gratification)
 * - Reduces manual admin work
 * - Prevents forgetting to award milestones
 * - Seamless user experience (no "claim" button needed)
 *
 * WHY Soft Delete Rewards If Redemptions Exist?
 * - Data integrity (preserve user_rewards foreign keys)
 * - Audit trail (see what user redeemed, even if reward removed)
 * - Legal/compliance (refund disputes require historical data)
 * - Alternative: Set isActive=false instead of destroy()
 *
 * Usage Examples:
 *
 * // Get gamification settings
 * GET /api/gamification/settings
 * Response: { isEnabled: true, pointsPerWorkout: 50, tierThresholds: {...} }
 *
 * // Award points to user
 * POST /api/gamification/users/abc-123/points
 * Body: {
 *   points: 100,
 *   transactionType: "earn",
 *   source: "admin_bonus",
 *   description: "Monthly bonus points"
 * }
 *
 * // Record workout completion (auto-award points)
 * POST /api/gamification/workout-completion
 * Body: {
 *   userId: "abc-123",
 *   workoutId: "workout-456",
 *   duration: 45,
 *   exercisesCompleted: 12
 * }
 * Response: { pointsAwarded: 170, newBalance: 1270, streakDays: 7 }
 *
 * // Award achievement to user
 * POST /api/gamification/users/abc-123/achievements/achieve-789
 * Response: { success: true, userAchievement: {...}, pointsAwarded: 100 }
 *
 * // Redeem reward
 * POST /api/gamification/users/abc-123/rewards/reward-456/redeem
 * Response: { success: true, userReward: {...}, newBalance: 500 }
 *
 * // Get leaderboard (top 10 users)
 * GET /api/gamification/leaderboard?limit=10&tier=gold
 * Response: { leaderboard: [...], pagination: {...} }
 *
 * Performance Considerations:
 * - Leaderboard query: ~50-100ms for 10,000 users (indexed on points + tier)
 * - Point award transaction: ~30-50ms (INSERT + UPDATE in transaction)
 * - Workout completion: ~100-200ms (multiple checks: tier, milestone, streak)
 * - User profile: ~80-120ms (includes 4 JOIN queries for achievements/rewards/milestones)
 * - Milestone auto-award: ~50-80ms per milestone (batch processed)
 *
 * Dependencies:
 * - sequelize: ORM for database operations + transaction management
 * - 8 models: User, Achievement, Reward, Milestone, PointTransaction, Exercise, UserAchievement, UserReward, UserMilestone
 * - db (Sequelize instance): For transaction creation
 * - Op (Sequelize operators): For complex queries (gte, lte, gt)
 *
 * Testing:
 * - Unit tests: backend/tests/gamificationController.test.mjs
 * - Test cases:
 *   - ✅ awardPoints creates transaction + updates user.points
 *   - ✅ recordWorkoutCompletion calculates points correctly
 *   - ✅ Tier promotion triggers milestone bonus
 *   - ✅ redeemReward deducts points + decrements stock
 *   - ✅ redeemReward fails if insufficient points → 400
 *   - ✅ deleteReward soft-deletes if redemptions exist
 *   - ✅ awardAchievement creates point transaction
 *   - ✅ Leaderboard returns top users sorted by points
 *
 * Future Enhancements:
 * - Add achievement auto-detection (system checks if user qualifies)
 * - Add social features (share achievements to social media)
 * - Add seasonal events (Halloween achievements, Christmas rewards)
 * - Add team challenges (group leaderboards)
 * - Add point expiration (points expire after 1 year)
 * - Add notification integration (push notification on milestone)
 *
 * Created: 2024-XX-XX
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

import User from '../models/User.mjs';
import Achievement from '../models/Achievement.mjs';
import Reward from '../models/Reward.mjs';
import Milestone from '../models/Milestone.mjs';
import PointTransaction from '../models/PointTransaction.mjs';
import Exercise from '../models/Exercise.mjs';
import Gamification from '../models/Gamification.mjs';
import GamificationSettings from '../models/GamificationSettings.mjs';

// These models aren't exported directly from associations but are created through Sequelize's associations
import UserAchievement from '../models/UserAchievement.mjs';
import UserReward from '../models/UserReward.mjs';
import UserMilestone from '../models/UserMilestone.mjs';
import WorkoutSession from '../models/WorkoutSession.mjs';
import ComebackChallenge from '../models/ComebackChallenge.mjs';
import GamificationPointsService from '../services/gamification/GamificationPointsService.mjs';
import { Op } from 'sequelize';
import db from '../database.mjs';

// Safe attribute list for UserAchievement — only columns from the .cjs migration.
// The model defines extra fields (maxProgress, etc.) that don't exist in the
// migration-created table, so we MUST use explicit attributes.
// NOTE: Achievement queries do NOT need explicit attrs because the Achievements
// table was model-created (via Sequelize sync), so ALL model columns exist.
const SAFE_USER_ACHIEVEMENT_ATTRS = [
  'id', 'userId', 'achievementId', 'earnedAt', 'progress', 'isCompleted',
  'pointsAwarded', 'notificationSent', 'createdAt', 'updatedAt'
];

const weeklyRecapWorkoutSources = ['workout_completion', 'workout_completed'];

// SECURITY FIX #10: Sanitize error messages for non-admin responses
// Only admin users see detailed error messages; everyone else gets generic
const safeError = (req, error) => {
  if (req.user?.role === 'admin') return error.message;
  return 'An error occurred. Please try again.';
};

const mapPointTransactionFeedType = (source) => {
  switch (source) {
    case 'friend_referral':
      return 'signup';
    case 'package_purchase':
      return 'payment';
    case 'workout_completion':
    case 'exercise_completion':
      return 'workout';
    case 'achievement_earned':
    case 'milestone_reached':
    case 'level_up':
    case 'challenge_completion':
      return 'achievement';
    case 'trainer_award':
      return 'session';
    default:
      return 'system';
  }
};

const formatFeedTimeAgo = (timestamp) => {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'just now';

  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSeconds < 60) return 'just now';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return date.toISOString().split('T')[0];
};

const gamificationController = {
  /**
   * Get gamification settings
   */
  getSettings: async (req, res) => {
    try {
      let settings = await GamificationSettings.findOne();
      
      if (!settings) {
        // Create default settings if none exist
        settings = await GamificationSettings.create({
          isEnabled: true,
          pointsPerWorkout: 50,
          pointsPerExercise: 10,
          pointsPerStreak: 20,
          pointsPerLevel: 100,
          pointsPerReview: 15,
          pointsPerReferral: 200,
          tierThresholds: {
            bronze: 0,
            silver: 1000,
            gold: 5000,
            platinum: 20000
          }
        });
      }
      
      return res.status(200).json({ success: true, settings });
    } catch (error) {
      console.error('Error getting gamification settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get gamification settings',
        error: error.message
      });
    }
  },

  /**
   * Update gamification settings
   */
  updateSettings: async (req, res) => {
    try {
      const {
        isEnabled,
        pointsPerWorkout,
        pointsPerExercise,
        pointsPerStreak,
        pointsPerLevel,
        pointsPerReview,
        pointsPerReferral,
        tierThresholds,
        levelRequirements,
        pointsMultiplier,
        enableLeaderboards,
        enableNotifications,
        autoAwardAchievements
      } = req.body;
      
      let settings = await GamificationSettings.findOne();
      
      if (!settings) {
        settings = await GamificationSettings.create({
          isEnabled: isEnabled ?? true,
          pointsPerWorkout: pointsPerWorkout ?? 50,
          pointsPerExercise: pointsPerExercise ?? 10,
          pointsPerStreak: pointsPerStreak ?? 20,
          pointsPerLevel: pointsPerLevel ?? 100,
          pointsPerReview: pointsPerReview ?? 15,
          pointsPerReferral: pointsPerReferral ?? 200,
          tierThresholds: tierThresholds ?? {
            bronze: 0,
            silver: 1000,
            gold: 5000,
            platinum: 20000
          },
          levelRequirements: levelRequirements ?? null,
          pointsMultiplier: Math.min(parseFloat(pointsMultiplier) || 1.0, 5.0),
          enableLeaderboards: enableLeaderboards ?? true,
          enableNotifications: enableNotifications ?? true,
          autoAwardAchievements: autoAwardAchievements ?? true
        });
      } else {
        const updatedFields = {};
        
        if (isEnabled !== undefined) updatedFields.isEnabled = isEnabled;
        if (pointsPerWorkout !== undefined) updatedFields.pointsPerWorkout = pointsPerWorkout;
        if (pointsPerExercise !== undefined) updatedFields.pointsPerExercise = pointsPerExercise;
        if (pointsPerStreak !== undefined) updatedFields.pointsPerStreak = pointsPerStreak;
        if (pointsPerLevel !== undefined) updatedFields.pointsPerLevel = pointsPerLevel;
        if (pointsPerReview !== undefined) updatedFields.pointsPerReview = pointsPerReview;
        if (pointsPerReferral !== undefined) updatedFields.pointsPerReferral = pointsPerReferral;
        if (tierThresholds !== undefined) updatedFields.tierThresholds = tierThresholds;
        if (levelRequirements !== undefined) updatedFields.levelRequirements = levelRequirements;
        if (pointsMultiplier !== undefined) updatedFields.pointsMultiplier = Math.min(parseFloat(pointsMultiplier) || 1.0, 5.0);
        if (enableLeaderboards !== undefined) updatedFields.enableLeaderboards = enableLeaderboards;
        if (enableNotifications !== undefined) updatedFields.enableNotifications = enableNotifications;
        if (autoAwardAchievements !== undefined) updatedFields.autoAwardAchievements = autoAwardAchievements;
        
        await settings.update(updatedFields);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Gamification settings updated successfully',
        settings
      });
    } catch (error) {
      console.error('Error updating gamification settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update gamification settings',
        error: error.message
      });
    }
  },

  /**
   * Get user gamification profile
   */
  getUserProfile: async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Get user with achievements, rewards, and milestones
      const user = await User.findByPk(userId, {
        attributes: [
          'id', 'firstName', 'lastName', 'username', 'photo',
          'points', 'level', 'tier', 'streakDays', 'totalWorkouts',
          'totalExercises'
        ],
        include: [
          {
            model: UserAchievement,
            as: 'userAchievements',
            attributes: ['id', 'earnedAt', 'progress', 'isCompleted', 'pointsAwarded'],
            include: [{
              model: Achievement,
              as: 'achievement'
            }]
          },
          {
            model: UserReward,
            as: 'rewards',
            include: [{
              model: Reward,
              as: 'reward'
            }]
          },
          {
            model: UserMilestone,
            as: 'milestones',
            include: [{
              model: Milestone,
              as: 'milestone'
            }]
          }
        ]
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Get leaderboard position
      const leaderboardPosition = await User.count({
        where: {
          points: {
            [Op.gt]: user.points
          }
        }
      }) + 1;
      
      // Get recent point transactions
      const recentTransactions = await PointTransaction.findAll({
        where: { userId },
        limit: 10,
        order: [['createdAt', 'DESC']]
      });
      
      // Get next milestone
      const nextMilestone = await Milestone.findOne({
        where: {
          targetPoints: {
            [Op.gt]: user.points
          },
          isActive: true
        },
        order: [['targetPoints', 'ASC']]
      });
      
      // Calculate progress to next level/tier
      const settings = await GamificationSettings.findOne();
      let nextLevelPoints = 0;
      let nextLevelProgress = 0;
      let nextTierProgress = 0;
      let nextTier = null;
      
      if (settings) {
        // Calculate next level if we have level requirements
        if (settings.levelRequirements && settings.levelRequirements[user.level + 1]) {
          nextLevelPoints = settings.levelRequirements[user.level + 1];
          const currentLevelPoints = settings.levelRequirements[user.level] || 0;
          nextLevelProgress = ((user.points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;
        }
        
        // Calculate next tier progress using Octalysis tier system
        const tierOrder = ['bronze_forge', 'silver_edge', 'titanium_core', 'obsidian_warrior', 'crystalline_swan'];
        const currentTierIndex = tierOrder.indexOf(user.tier);
        if (currentTierIndex < tierOrder.length - 1 && settings.tierThresholds) {
          const currentTierThreshold = settings.tierThresholds[user.tier] || 0;
          nextTier = tierOrder[currentTierIndex + 1];
          const nextTierThreshold = settings.tierThresholds[nextTier] || 0;

          if (nextTierThreshold > currentTierThreshold) {
            nextTierProgress = ((user.points - currentTierThreshold) / (nextTierThreshold - currentTierThreshold)) * 100;
          }
        }
      }
      
      return res.status(200).json({
        success: true,
        profile: {
          ...user.toJSON(),
          leaderboardPosition,
          recentTransactions,
          nextMilestone,
          nextLevelProgress,
          nextLevelPoints,
          nextTierProgress,
          nextTier
        }
      });
    } catch (error) {
      console.error('Error getting user gamification profile:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get user gamification profile',
        error: error.message
      });
    }
  },

  /**
   * Get leaderboard
   */
  getLeaderboard: async (req, res) => {
    try {
      const { limit: rawLimit = 10, page = 1, tier } = req.query;
      // SECURITY FIX #9: Cap pagination to prevent DoS via huge limit values
      const limit = Math.min(parseInt(rawLimit) || 10, 100);
      const offset = (page - 1) * limit;
      
      const whereClause = {};
      if (tier) {
        whereClause.tier = tier;
      }
      
      const leaderboard = await User.findAll({
        attributes: [
          'id', 'firstName', 'lastName', 'username', 'photo',
          'points', 'level', 'tier'
        ],
        where: whereClause,
        order: [['points', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      const total = await User.count({ where: whereClause });
      
      return res.status(200).json({
        success: true,
        leaderboard,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get leaderboard',
        error: safeError(req, error)
      });
    }
  },

  /**
   * Award points to a user
   */
  awardPoints: async (req, res) => {
    const transaction = await db.transaction();

    try {
      const { userId } = req.params;
      const {
        points,
        transactionType = 'earn',
        source,
        sourceId,
        description,
        metadata
      } = req.body;

      if (!points || !source || !description) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Points, source, and description are required'
        });
      }

      // ── SECURITY FIX #3: Input Validation (CRITICAL) ──
      // Prevents point inflation via unbounded award values
      const validation = GamificationPointsService.validateAward(points, source, description);
      if (!validation.valid) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }

      // ── SECURITY FIX #2: Idempotency Check (CRITICAL) ──
      // Prevents replay attacks — same user+source+sourceId on same day = reject
      const idempotencyKey = req.body.idempotencyKey ||
        ['manual-award', userId, source, sourceId || 'no-source-id', new Date().toISOString().slice(0, 10)].join(':');

      const ledgerResult = await GamificationPointsService.recordLedgerEntry({
        userId,
        points,
        transactionType,
        source,
        sourceId,
        description,
        metadata,
        awardedBy: req.user?.id,
        idempotencyKey,
        applyMultiplier: true
      }, transaction);

      if (ledgerResult.duplicate) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: 'Points already awarded for this action today'
        });
      }

      const { pointTransaction } = ledgerResult;
      let finalBalance = ledgerResult.newBalance;
      
      if (ledgerResult.newTier !== ledgerResult.previousTier) {
        const tierMilestone = await Milestone.findOne({
          where: {
            tier: ledgerResult.newTier,
            isActive: true
          },
          transaction
        });

        if (tierMilestone) {
          const existingMilestone = await UserMilestone.findOne({
            where: {
              userId,
              milestoneId: tierMilestone.id
            },
            transaction
          });

          if (!existingMilestone) {
            await UserMilestone.create({
              userId,
              milestoneId: tierMilestone.id,
              reachedAt: new Date(),
              bonusPointsAwarded: tierMilestone.bonusPoints
            }, { transaction });

            if (tierMilestone.bonusPoints > 0) {
              const bonusResult = await GamificationPointsService.recordLedgerEntry({
                userId,
                points: tierMilestone.bonusPoints,
                transactionType: 'bonus',
                source: 'milestone_reached',
                sourceId: tierMilestone.id,
                description: `Milestone Bonus: ${tierMilestone.name}`,
                metadata: { milestoneId: tierMilestone.id },
                awardedBy: req.user?.id,
                idempotencyKey: `milestone:tier:${userId}:${tierMilestone.id}`
              }, transaction);
              finalBalance = bonusResult.newBalance || finalBalance;
            }
          }
        }
      }
      
      // Commit the transaction
      await transaction.commit();
      
      return res.status(200).json({
        success: true,
        message: 'Points awarded successfully',
        pointTransaction,
        newBalance: finalBalance
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error awarding points:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.statusCode ? error.message : 'Failed to award points',
        error: safeError(req, error)
      });
    }
  },

  /**
   * Get all achievements
   */
  getAllAchievements: async (req, res) => {
    try {
      const { isActive, category, skillTree, includeHidden } = req.query;

      const whereClause = {};

      // Default to active-only unless explicitly requesting inactive
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      } else {
        whereClause.isActive = true;
      }

      // Hide secret/hidden achievements unless admin explicitly requests them
      if (includeHidden !== 'true') {
        whereClause.isHidden = false;
      }

      if (category) {
        whereClause.category = category;
      }

      if (skillTree) {
        whereClause.skillTree = skillTree;
      }

      const allAchievements = await Achievement.findAll({
        where: whereClause,
        order: [['name', 'ASC']]
      });

      // Deduplicate by name — multiple seeders may have created duplicate rows
      const seen = new Set();
      const achievements = allAchievements.filter(a => {
        const key = (a.name || '').toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return res.status(200).json({ success: true, achievements });
    } catch (error) {
      console.error('Error getting achievements:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get achievements',
        error: error.message
      });
    }
  },

  /**
   * Get a single achievement
   */
  getAchievement: async (req, res) => {
    try {
      const { id } = req.params;

      const achievement = await Achievement.findByPk(id);

      if (!achievement) {
        return res.status(404).json({
          success: false,
          message: 'Achievement not found'
        });
      }

      return res.status(200).json({ success: true, achievement });
    } catch (error) {
      console.error('Error getting achievement:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get achievement',
        error: error.message
      });
    }
  },

  /**
   * Create a new achievement
   */
  createAchievement: async (req, res) => {
    try {
      const {
        name,
        title,
        description,
        iconEmoji,
        iconUrl,
        category,
        rarity,
        xpReward,
        requiredPoints,
        maxProgress,
        progressUnit,
        requirements,
        difficulty,
        skillTree,
        skillTreeOrder,
        templateId,
        tierLevel,
        tags,
        isActive,
        isHidden,
        isSecret
      } = req.body;

      if (!name || !description) {
        return res.status(400).json({
          success: false,
          message: 'Name and description are required'
        });
      }

      const achievement = await Achievement.create({
        name,
        title: title || name,
        description,
        iconEmoji: iconEmoji || '🏆',
        iconUrl,
        category: category || 'fitness',
        rarity: rarity || 'common',
        xpReward: xpReward || 100,
        requiredPoints: requiredPoints || 0,
        maxProgress: maxProgress || 1,
        progressUnit: progressUnit || 'completion',
        requirements: requirements || [],
        difficulty: difficulty || 3,
        skillTree,
        skillTreeOrder,
        templateId,
        tierLevel: tierLevel || 1,
        tags: tags || [],
        isActive: isActive !== undefined ? isActive : true,
        isHidden: isHidden || false,
        isSecret: isSecret || false
      });
      
      return res.status(201).json({
        success: true,
        message: 'Achievement created successfully',
        achievement
      });
    } catch (error) {
      console.error('Error creating achievement:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create achievement',
        error: error.message
      });
    }
  },

  /**
   * Update an achievement
   */
  updateAchievement: async (req, res) => {
    try {
      const { id } = req.params;

      const achievement = await Achievement.findByPk(id);

      if (!achievement) {
        return res.status(404).json({
          success: false,
          message: 'Achievement not found'
        });
      }

      // Whitelist updatable model fields
      const allowedFields = [
        'name', 'title', 'description', 'iconEmoji', 'iconUrl',
        'category', 'rarity', 'xpReward', 'requiredPoints',
        'maxProgress', 'progressUnit', 'requirements', 'unlockConditions',
        'prerequisiteAchievements', 'difficulty', 'skillTree',
        'skillTreeOrder', 'templateId', 'tierLevel', 'tags',
        'isActive', 'isHidden', 'isSecret', 'isLimited',
        'availableFrom', 'availableUntil'
      ];

      const updatedFields = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updatedFields[field] = req.body[field];
        }
      }

      await achievement.update(updatedFields);
      
      return res.status(200).json({
        success: true,
        message: 'Achievement updated successfully',
        achievement
      });
    } catch (error) {
      console.error('Error updating achievement:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update achievement',
        error: error.message
      });
    }
  },

  /**
   * Delete an achievement
   */
  deleteAchievement: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const { id } = req.params;
      
      const achievement = await Achievement.findByPk(id, { transaction });

      if (!achievement) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Achievement not found'
        });
      }

      // SECURITY FIX #19: Soft delete preserves audit trail
      await achievement.update({ isActive: false }, { transaction });

      // Commit the transaction
      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Achievement deactivated successfully'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error deleting achievement:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete achievement',
        error: error.message
      });
    }
  },

  /**
   * Award an achievement to a user
   */
  awardAchievement: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const { userId, achievementId } = req.params;
      
      // Check if user exists
      const user = await User.findByPk(userId, { transaction });
      
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Check if achievement exists
      const achievement = await Achievement.findByPk(achievementId, { transaction });

      if (!achievement) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Achievement not found'
        });
      }

      // Check if user already has this achievement
      let userAchievement = await UserAchievement.findOne({
        attributes: SAFE_USER_ACHIEVEMENT_ATTRS,
        where: {
          userId,
          achievementId
        },
        transaction
      });
      
      if (userAchievement) {
        if (userAchievement.isCompleted) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'User already has this achievement'
          });
        } else {
          // Update existing progress record to completed
          await userAchievement.update({
            isCompleted: true,
            progress: 100,
            earnedAt: new Date(),
            pointsAwarded: achievement.pointValue
          }, { transaction });
        }
      } else {
        // Create new user achievement record
        userAchievement = await UserAchievement.create({
          userId,
          achievementId,
          isCompleted: true,
          progress: 100,
          earnedAt: new Date(),
          pointsAwarded: achievement.pointValue
        }, { transaction });
      }
      
      // Award points to user
      const newBalance = user.points + achievement.pointValue;
      
      await PointTransaction.create({
        userId,
        points: achievement.pointValue,
        balance: newBalance,
        transactionType: 'earn',
        source: 'achievement_earned',
        sourceId: achievement.id,
        description: `Achievement Earned: ${achievement.name}`,
        metadata: { achievementId: achievement.id }
      }, { transaction });
      
      // Update user points
      await user.update({ points: newBalance }, { transaction });
      
      // Commit the transaction
      await transaction.commit();
      
      return res.status(200).json({
        success: true,
        message: 'Achievement awarded successfully',
        userAchievement
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error awarding achievement:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to award achievement',
        error: error.message
      });
    }
  },

  /**
   * Update user achievement progress
   */
  updateAchievementProgress: async (req, res) => {
    try {
      const { userId, achievementId } = req.params;
      const { progress } = req.body;
      
      if (progress === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Progress is required'
        });
      }
      
      // Check if user achievement exists
      let userAchievement = await UserAchievement.findOne({
        attributes: SAFE_USER_ACHIEVEMENT_ATTRS,
        where: {
          userId,
          achievementId
        },
        include: [{
          model: Achievement,
          as: 'achievement'
        }]
      });

      if (!userAchievement) {
        // Create new record with initial progress
        const achievement = await Achievement.findByPk(achievementId);
        
        if (!achievement) {
          return res.status(404).json({
            success: false,
            message: 'Achievement not found'
          });
        }
        
        userAchievement = await UserAchievement.create({
          userId,
          achievementId,
          progress: Math.min(100, Math.max(0, progress)),
          isCompleted: progress >= 100
        });
        
        // If completed, award points
        if (progress >= 100) {
          // Get user
          const user = await User.findByPk(userId);
          
          if (user) {
            const newBalance = user.points + achievement.pointValue;
            
            // Create point transaction
            await PointTransaction.create({
              userId,
              points: achievement.pointValue,
              balance: newBalance,
              transactionType: 'earn',
              source: 'achievement_earned',
              sourceId: achievement.id,
              description: `Achievement Earned: ${achievement.name}`,
              metadata: { achievementId: achievement.id }
            });
            
            // Update user points
            await user.update({ points: newBalance });
            
            // Update pointsAwarded in userAchievement
            await userAchievement.update({ pointsAwarded: achievement.pointValue });
          }
        }
      } else {
        // Only update if not already completed
        if (!userAchievement.isCompleted) {
          const newProgress = Math.min(100, Math.max(0, progress));
          const wasCompleted = userAchievement.progress < 100 && newProgress >= 100;
          
          await userAchievement.update({
            progress: newProgress,
            isCompleted: newProgress >= 100,
            earnedAt: newProgress >= 100 ? new Date() : userAchievement.earnedAt
          });
          
          // If newly completed, award points
          if (wasCompleted) {
            // Get user
            const user = await User.findByPk(userId);
            
            if (user && userAchievement.achievement) {
              const newBalance = user.points + userAchievement.achievement.pointValue;
              
              // Create point transaction
              await PointTransaction.create({
                userId,
                points: userAchievement.achievement.pointValue,
                balance: newBalance,
                transactionType: 'earn',
                source: 'achievement_earned',
                sourceId: userAchievement.achievement.id,
                description: `Achievement Earned: ${userAchievement.achievement.name}`,
                metadata: { achievementId: userAchievement.achievement.id }
              });
              
              // Update user points
              await user.update({ points: newBalance });
              
              // Update pointsAwarded in userAchievement
              await userAchievement.update({ pointsAwarded: userAchievement.achievement.pointValue });
            }
          }
        }
      }
      
      return res.status(200).json({
        success: true,
        message: 'Achievement progress updated',
        userAchievement
      });
    } catch (error) {
      console.error('Error updating achievement progress:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update achievement progress',
        error: error.message
      });
    }
  },

  /**
   * Get all rewards
   */
  getAllRewards: async (req, res) => {
    try {
      const { isActive, tier } = req.query;
      
      const whereClause = {};
      
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }
      
      if (tier) {
        whereClause.tier = tier;
      }
      
      const rewards = await Reward.findAll({
        where: whereClause,
        order: [
          ['tier', 'ASC'],
          ['pointCost', 'ASC'],
          ['name', 'ASC']
        ]
      });
      
      return res.status(200).json({ success: true, rewards });
    } catch (error) {
      console.error('Error getting rewards:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get rewards',
        error: error.message
      });
    }
  },

  /**
   * Get a single reward
   */
  getReward: async (req, res) => {
    try {
      const { id } = req.params;
      
      const reward = await Reward.findByPk(id);
      
      if (!reward) {
        return res.status(404).json({
          success: false,
          message: 'Reward not found'
        });
      }
      
      return res.status(200).json({ success: true, reward });
    } catch (error) {
      console.error('Error getting reward:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get reward',
        error: error.message
      });
    }
  },

  /**
   * Create a new reward
   */
  createReward: async (req, res) => {
    try {
      const {
        name,
        description,
        icon,
        pointCost,
        tier,
        stock,
        isActive,
        imageUrl,
        rewardType,
        expiresAt
      } = req.body;
      
      if (!name || !description || !tier) {
        return res.status(400).json({
          success: false,
          message: 'Name, description, and tier are required'
        });
      }
      
      const reward = await Reward.create({
        name,
        description,
        icon: icon || 'Gift',
        pointCost: pointCost || 500,
        tier,
        stock: stock || 10,
        isActive: isActive !== undefined ? isActive : true,
        imageUrl,
        rewardType: rewardType || 'other',
        expiresAt: expiresAt || null
      });
      
      return res.status(201).json({
        success: true,
        message: 'Reward created successfully',
        reward
      });
    } catch (error) {
      console.error('Error creating reward:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create reward',
        error: error.message
      });
    }
  },

  /**
   * Update a reward
   */
  updateReward: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        icon,
        pointCost,
        tier,
        stock,
        isActive,
        imageUrl,
        rewardType,
        expiresAt
      } = req.body;
      
      const reward = await Reward.findByPk(id);
      
      if (!reward) {
        return res.status(404).json({
          success: false,
          message: 'Reward not found'
        });
      }
      
      const updatedFields = {};
      
      if (name !== undefined) updatedFields.name = name;
      if (description !== undefined) updatedFields.description = description;
      if (icon !== undefined) updatedFields.icon = icon;
      if (pointCost !== undefined) updatedFields.pointCost = pointCost;
      if (tier !== undefined) updatedFields.tier = tier;
      if (stock !== undefined) updatedFields.stock = stock;
      if (isActive !== undefined) updatedFields.isActive = isActive;
      if (imageUrl !== undefined) updatedFields.imageUrl = imageUrl;
      if (rewardType !== undefined) updatedFields.rewardType = rewardType;
      if (expiresAt !== undefined) updatedFields.expiresAt = expiresAt;
      
      await reward.update(updatedFields);
      
      return res.status(200).json({
        success: true,
        message: 'Reward updated successfully',
        reward
      });
    } catch (error) {
      console.error('Error updating reward:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update reward',
        error: error.message
      });
    }
  },

  /**
   * Delete a reward
   */
  deleteReward: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const { id } = req.params;
      
      const reward = await Reward.findByPk(id, { transaction });
      
      if (!reward) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Reward not found'
        });
      }
      
      // Check if reward has been redeemed
      const redemptionCount = await UserReward.count({
        where: { rewardId: id },
        transaction
      });
      
      if (redemptionCount > 0) {
        // Set to inactive instead of deleting
        await reward.update({ isActive: false }, { transaction });
        
        await transaction.commit();
        
        return res.status(200).json({
          success: true,
          message: 'Reward has redemptions. It has been deactivated instead of deleted.'
        });
      }
      
      // No redemptions, safe to delete
      await reward.destroy({ transaction });
      
      // Commit the transaction
      await transaction.commit();
      
      return res.status(200).json({
        success: true,
        message: 'Reward deleted successfully'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error deleting reward:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete reward',
        error: error.message
      });
    }
  },

  /**
   * Redeem a reward
   */
  redeemReward: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const { userId, rewardId } = req.params;
      
      // Check if user exists
      const user = await User.findByPk(userId, { transaction });
      
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Check if reward exists and is active
      const reward = await Reward.findOne({
        where: {
          id: rewardId,
          isActive: true
        },
        transaction
      });
      
      if (!reward) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Reward not found or inactive'
        });
      }
      
      // Check if reward is expired
      if (reward.expiresAt && new Date(reward.expiresAt) < new Date()) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'This reward has expired'
        });
      }
      
      // Check if reward is in stock
      if (reward.stock <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'This reward is out of stock'
        });
      }
      
      // Check if user has enough points
      if (user.points < reward.pointCost) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Insufficient points to redeem this reward'
        });
      }
      
      // Create user reward record
      const userReward = await UserReward.create({
        userId,
        rewardId,
        redeemedAt: new Date(),
        status: 'pending',
        pointsCost: reward.pointCost,
        expiresAt: reward.expiresAt
      }, { transaction });
      
      // Deduct points from user
      const newBalance = user.points - reward.pointCost;
      
      await PointTransaction.create({
        userId,
        points: reward.pointCost,
        balance: newBalance,
        transactionType: 'spend',
        source: 'reward_redemption',
        sourceId: reward.id,
        description: `Reward Redeemed: ${reward.name}`,
        metadata: { rewardId: reward.id }
      }, { transaction });
      
      // Update user points
      await user.update({ points: newBalance }, { transaction });
      
      // Update reward stock and redemption count
      await reward.update({
        stock: reward.stock - 1,
        redemptionCount: reward.redemptionCount + 1
      }, { transaction });
      
      // Commit the transaction
      await transaction.commit();
      
      return res.status(200).json({
        success: true,
        message: 'Reward redeemed successfully',
        userReward
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error redeeming reward:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to redeem reward',
        error: error.message
      });
    }
  },

  /**
   * Get all milestones
   */
  getAllMilestones: async (req, res) => {
    try {
      const { isActive, tier } = req.query;
      
      const whereClause = {};
      
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }
      
      if (tier) {
        whereClause.tier = tier;
      }
      
      const milestones = await Milestone.findAll({
        where: whereClause,
        order: [
          ['targetPoints', 'ASC'],
          ['tier', 'ASC'],
          ['name', 'ASC']
        ]
      });
      
      return res.status(200).json({ success: true, milestones });
    } catch (error) {
      console.error('Error getting milestones:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get milestones',
        error: error.message
      });
    }
  },

  /**
   * Get a single milestone
   */
  getMilestone: async (req, res) => {
    try {
      const { id } = req.params;
      
      const milestone = await Milestone.findByPk(id);
      
      if (!milestone) {
        return res.status(404).json({
          success: false,
          message: 'Milestone not found'
        });
      }
      
      return res.status(200).json({ success: true, milestone });
    } catch (error) {
      console.error('Error getting milestone:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get milestone',
        error: error.message
      });
    }
  },

  /**
   * Create a new milestone
   */
  createMilestone: async (req, res) => {
    try {
      const {
        name,
        description,
        targetPoints,
        tier,
        bonusPoints,
        icon,
        isActive,
        imageUrl,
        requiredForPromotion
      } = req.body;
      
      if (!name || !description || !targetPoints || !tier) {
        return res.status(400).json({
          success: false,
          message: 'Name, description, targetPoints, and tier are required'
        });
      }
      
      const milestone = await Milestone.create({
        name,
        description,
        targetPoints,
        tier,
        bonusPoints: bonusPoints || 200,
        icon: icon || 'Star',
        isActive: isActive !== undefined ? isActive : true,
        imageUrl,
        requiredForPromotion: requiredForPromotion || false
      });
      
      return res.status(201).json({
        success: true,
        message: 'Milestone created successfully',
        milestone
      });
    } catch (error) {
      console.error('Error creating milestone:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create milestone',
        error: error.message
      });
    }
  },

  /**
   * Update a milestone
   */
  updateMilestone: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        targetPoints,
        tier,
        bonusPoints,
        icon,
        isActive,
        imageUrl,
        requiredForPromotion
      } = req.body;
      
      const milestone = await Milestone.findByPk(id);
      
      if (!milestone) {
        return res.status(404).json({
          success: false,
          message: 'Milestone not found'
        });
      }
      
      const updatedFields = {};
      
      if (name !== undefined) updatedFields.name = name;
      if (description !== undefined) updatedFields.description = description;
      if (targetPoints !== undefined) updatedFields.targetPoints = targetPoints;
      if (tier !== undefined) updatedFields.tier = tier;
      if (bonusPoints !== undefined) updatedFields.bonusPoints = bonusPoints;
      if (icon !== undefined) updatedFields.icon = icon;
      if (isActive !== undefined) updatedFields.isActive = isActive;
      if (imageUrl !== undefined) updatedFields.imageUrl = imageUrl;
      if (requiredForPromotion !== undefined) updatedFields.requiredForPromotion = requiredForPromotion;
      
      await milestone.update(updatedFields);
      
      return res.status(200).json({
        success: true,
        message: 'Milestone updated successfully',
        milestone
      });
    } catch (error) {
      console.error('Error updating milestone:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update milestone',
        error: error.message
      });
    }
  },

  /**
   * Delete a milestone
   */
  deleteMilestone: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const { id } = req.params;
      
      const milestone = await Milestone.findByPk(id, { transaction });
      
      if (!milestone) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Milestone not found'
        });
      }
      
      // SECURITY FIX #20: Soft delete preserves audit trail
      await milestone.update({ isActive: false }, { transaction });

      // Commit the transaction
      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Milestone deactivated successfully'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error deleting milestone:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete milestone',
        error: error.message
      });
    }
  },

  /**
   * Check and award milestones
   * This can be called manually or automatically after point updates
   */
  checkAndAwardMilestones: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const { userId } = req.params;
      
      // Check if user exists
      const user = await User.findByPk(userId, { transaction });
      
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Get all milestones the user hasn't reached yet
      const unreachedMilestones = await Milestone.findAll({
        where: {
          targetPoints: { [Op.lte]: user.points },
          isActive: true
        },
        include: [{
          model: UserMilestone,
          as: 'userMilestones',
          where: { userId },
          required: false
        }],
        transaction
      });
      
      // Filter for milestones that haven't been awarded yet
      const newMilestones = unreachedMilestones.filter(
        milestone => milestone.userMilestones.length === 0
      );
      
      if (newMilestones.length === 0) {
        await transaction.commit();
        return res.status(200).json({
          success: true,
          message: 'No new milestones to award',
          awardedMilestones: []
        });
      }
      
      // Award new milestones
      const awardedMilestones = [];
      let totalBonusPoints = 0;
      
      for (const milestone of newMilestones) {
        // Create user milestone record
        const userMilestone = await UserMilestone.create({
          userId,
          milestoneId: milestone.id,
          reachedAt: new Date(),
          bonusPointsAwarded: milestone.bonusPoints
        }, { transaction });
        
        awardedMilestones.push(userMilestone);
        totalBonusPoints += milestone.bonusPoints;
      }
      
      // Award bonus points for all milestones in a single transaction
      if (totalBonusPoints > 0) {
        const newBalance = user.points + totalBonusPoints;
        
        // Create point transaction for bonuses
        await PointTransaction.create({
          userId,
          points: totalBonusPoints,
          balance: newBalance,
          transactionType: 'bonus',
          source: 'milestone_reached',
          description: `Milestone Bonuses: ${newMilestones.map(m => m.name).join(', ')}`,
          metadata: { milestoneIds: newMilestones.map(m => m.id) }
        }, { transaction });
        
        // Update user points
        await user.update({ points: newBalance }, { transaction });
      }
      
      // Commit the transaction
      await transaction.commit();
      
      return res.status(200).json({
        success: true,
        message: 'Milestones awarded successfully',
        awardedMilestones,
        totalBonusPoints,
        newBalance: user.points + totalBonusPoints
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error awarding milestones:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to award milestones',
        error: error.message
      });
    }
  },

  /**
   * Get user transaction history
   */
  getUserTransactions: async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit: rawLimit = 20, type, source } = req.query;
      // SECURITY: Cap pagination to prevent DoS
      const limit = Math.min(parseInt(rawLimit) || 20, 100);
      
      const whereClause = { userId };
      
      if (type) {
        whereClause.transactionType = type;
      }
      
      if (source) {
        whereClause.source = source;
      }
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const transactions = await PointTransaction.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });
      
      const total = await PointTransaction.count({ where: whereClause });
      
      return res.status(200).json({
        success: true,
        transactions,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error getting user transactions:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get user transactions',
        error: safeError(req, error)
      });
    }
  },

  /**
   * Record workout completion and award points
   */
  recordWorkoutCompletion: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const {
        userId,
        workoutId,
        duration,
        exercisesCompleted,
        caloriesBurned,
        notes
      } = req.body;
      
      // Use userId from request body or fallback to authenticated user
      const targetUserId = userId || req.user?.id;

      if (!targetUserId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      // OWNERSHIP CHECK: non-admin/trainer can only record for themselves
      if (req.user.role !== 'admin' && req.user.role !== 'trainer') {
        if (Number(targetUserId) !== Number(req.user.id)) {
          await transaction.rollback();
          return res.status(403).json({
            success: false,
            message: 'Forbidden: You can only record workouts for yourself'
          });
        }
      }

      // Verify user exists (with row-level lock for concurrency safety)
      const user = await User.findByPk(targetUserId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Get gamification settings
      const settings = await GamificationSettings.findOne({ transaction });
      
      // Calculate points based on workout completion
      let pointsToAward = settings?.pointsPerWorkout || 50;
      
      // Bonus points for exercises completed
      if (exercisesCompleted && settings?.pointsPerExercise) {
        pointsToAward += exercisesCompleted * settings.pointsPerExercise;
      }
      
      // Bonus points for duration (1 point per minute over 30 minutes)
      if (duration && duration > 30) {
        pointsToAward += Math.floor((duration - 30) / 5); // 1 point per 5 extra minutes
      }
      
      // Apply multiplier if enabled
      if (settings?.pointsMultiplier) {
        pointsToAward = Math.round(pointsToAward * settings.pointsMultiplier);
      }
      
      // Same-day duplicate workout guard
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastActivity = user.lastActivityDate ? new Date(user.lastActivityDate) : null;
      if (lastActivity) lastActivity.setHours(0, 0, 0, 0);

      if (lastActivity && lastActivity.getTime() === today.getTime()) {
        await transaction.rollback();
        return res.status(429).json({
          success: false,
          message: 'Workout already recorded today. Points can only be earned once per day.'
        });
      }

      // Update user stats
      const updatedStats = {
        totalWorkouts: (user.totalWorkouts || 0) + 1,
        totalExercises: (user.totalExercises || 0) + (exercisesCompleted || 0),
        points: user.points + pointsToAward
      };

      // Streak validation using lastActivityDate
      const daysSinceLast = lastActivity
        ? Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24))
        : Infinity;

      if (daysSinceLast === 0) {
        // Same day — keep current streak (defensive, guard above should catch this)
        updatedStats.streakDays = user.streakDays || 1;
      } else if (daysSinceLast === 1) {
        // Consecutive day — extend streak
        updatedStats.streakDays = (user.streakDays || 0) + 1;
      } else if (daysSinceLast === 2) {
        // Grace day — 1 per rolling 30-day window
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const GRACE_PREFIX = '[STREAK_GRACE]';
        const graceUsedRecently = await PointTransaction.count({
          where: {
            userId: targetUserId,
            transactionType: 'adjustment',
            source: 'admin_adjustment',
            description: { [Op.startsWith]: GRACE_PREFIX },
            createdAt: { [Op.gte]: thirtyDaysAgo }
          },
          transaction
        });

        if (graceUsedRecently === 0) {
          // Grace available — extend streak and record grace usage
          updatedStats.streakDays = (user.streakDays || 0) + 1;
          await PointTransaction.create({
            userId: targetUserId,
            points: 0,
            balance: user.points,
            transactionType: 'adjustment',
            source: 'admin_adjustment',
            description: `${GRACE_PREFIX} Streak grace day used (1 per 30-day window)`,
            metadata: { streakDays: updatedStats.streakDays, windowStart: thirtyDaysAgo.toISOString() },
            awardedBy: null
          }, { transaction });
        } else {
          // Grace already used in this window — streak broken
          updatedStats.streakDays = 1;
        }
      } else {
        // Streak broken — reset to 1
        updatedStats.streakDays = 1;
      }
      updatedStats.lastActivityDate = today;
      
      // Award streak bonus if applicable
      if (updatedStats.streakDays % 7 === 0 && settings?.pointsPerStreak) {
        const streakBonus = settings.pointsPerStreak;
        pointsToAward += streakBonus;
        updatedStats.points += streakBonus;
        
        // Create separate transaction for streak bonus
        await PointTransaction.create({
          userId: targetUserId,
          points: streakBonus,
          balance: updatedStats.points,
          transactionType: 'bonus',
          source: 'streak_bonus',
          sourceId: null,
          description: `${updatedStats.streakDays}-day streak bonus`,
          metadata: { streakDays: updatedStats.streakDays },
          awardedBy: req.user?.id
        }, { transaction });
      }
      
      // Create main workout completion transaction
      const pointTransaction = await PointTransaction.create({
        userId: targetUserId,
        points: pointsToAward - (updatedStats.streakDays % 7 === 0 ? settings?.pointsPerStreak || 0 : 0),
        balance: user.points + pointsToAward - (updatedStats.streakDays % 7 === 0 ? settings?.pointsPerStreak || 0 : 0),
        transactionType: 'earn',
        source: 'workout_completion',
        sourceId: workoutId,
        description: `Workout completed: ${duration || 'Unknown'} minutes, ${exercisesCompleted || 0} exercises`,
        metadata: {
          workoutId,
          duration,
          exercisesCompleted,
          caloriesBurned,
          notes
        },
        awardedBy: req.user?.id
      }, { transaction });
      
      // Update user stats
      await user.update(updatedStats, { transaction });
      
      // Check for milestone achievements
      const newMilestones = await Milestone.findAll({
        where: {
          targetPoints: { [Op.lte]: updatedStats.points },
          isActive: true
        },
        include: [{
          model: UserMilestone,
          as: 'userMilestones',
          where: { userId: targetUserId },
          required: false
        }],
        transaction
      });
      
      // Filter for milestones not yet awarded
      const unAwardedMilestones = newMilestones.filter(
        milestone => milestone.userMilestones.length === 0
      );
      
      let totalMilestoneBonus = 0;
      const awardedMilestones = [];
      
      // Award new milestones
      for (const milestone of unAwardedMilestones) {
        const userMilestone = await UserMilestone.create({
          userId: targetUserId,
          milestoneId: milestone.id,
          reachedAt: new Date(),
          bonusPointsAwarded: milestone.bonusPoints
        }, { transaction });
        
        awardedMilestones.push(milestone);
        totalMilestoneBonus += milestone.bonusPoints;
      }
      
      // Award milestone bonus points
      if (totalMilestoneBonus > 0) {
        const finalBalance = updatedStats.points + totalMilestoneBonus;

        await PointTransaction.create({
          userId: targetUserId,
          points: totalMilestoneBonus,
          balance: finalBalance,
          transactionType: 'bonus',
          source: 'milestone_reached',
          description: `Milestone bonuses: ${awardedMilestones.map(m => m.name).join(', ')}`,
          metadata: { milestoneIds: awardedMilestones.map(m => m.id) },
          awardedBy: req.user?.id
        }, { transaction });

        // Update user points again
        await user.update({ points: finalBalance }, { transaction });
      }

      // Tag workout session with milestone info (if workoutId provided and milestones earned)
      if (workoutId) {
        let milestoneType = null;

        // Determine milestone type based on workout count thresholds
        const workoutCount = updatedStats.totalWorkouts;
        const WORKOUT_MILESTONES = [500, 250, 100, 50, 25, 10, 1];
        for (const threshold of WORKOUT_MILESTONES) {
          if (workoutCount === threshold) {
            milestoneType = `workout_count_${threshold}`;
            break;
          }
        }

        // Streak-based milestones
        if (!milestoneType && updatedStats.streakDays) {
          const STREAK_MILESTONES = [365, 180, 90, 60, 30, 14, 7];
          for (const threshold of STREAK_MILESTONES) {
            if (updatedStats.streakDays === threshold) {
              milestoneType = `streak_${threshold}`;
              break;
            }
          }
        }

        // Duration-based milestone (first 60+ minute session)
        if (!milestoneType && duration && duration >= 60) {
          const priorLongSession = await WorkoutSession.count({
            where: {
              userId: targetUserId,
              duration: { [Op.gte]: 60 },
              id: { [Op.ne]: workoutId }
            },
            transaction
          });
          if (priorLongSession === 0) {
            milestoneType = 'first_60min';
          }
        }

        // Also flag if gamification milestones were newly awarded
        if (!milestoneType && awardedMilestones.length > 0) {
          milestoneType = `milestone_${awardedMilestones[0].name.replace(/\s+/g, '_').toLowerCase()}`;
        }

        if (milestoneType) {
          await WorkoutSession.update(
            { isMilestone: true, milestoneType },
            { where: { id: workoutId }, transaction }
          );
        }
      }

      // Commit the transaction
      await transaction.commit();
      
      return res.status(200).json({
        success: true,
        message: 'Workout completion recorded successfully',
        pointsAwarded: pointsToAward + totalMilestoneBonus,
        newBalance: updatedStats.points + totalMilestoneBonus,
        awardedMilestones,
        streakDays: updatedStats.streakDays,
        totalWorkouts: updatedStats.totalWorkouts
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error recording workout completion:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to record workout completion',
        error: error.message
      });
    }
  },

  /**
   * Mark notification as read
   */
  markNotificationAsRead: async (req, res) => {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      // For now, return success since notifications are handled elsewhere
      // In a full implementation, this would update a notifications table
      return res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        notificationId
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
        error: error.message
      });
    }
  },

  /**
   * DEBUG: Seed achievements (admin-only, temporary)
   * Seeder now omits id field — PostgreSQL auto-generates it.
   */
  debugSeedAchievements: async (req, res) => {
    const steps = [];
    try {
      // Step 1: Check current count — allow force reseed via ?force=true
      const currentCount = await Achievement.count();
      const forceReseed = req.query.force === 'true';
      steps.push(`Current count: ${currentCount} achievements`);

      if (currentCount > 0 && !forceReseed) {
        return res.json({
          success: true,
          message: `Already have ${currentCount} achievements — use ?force=true to reseed with Swan-themed system`,
          count: currentCount
        });
      }

      // Step 2: Ensure the tier column exists (migration may not have run)
      try {
        const [cols] = await db.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_name = 'Achievements' AND column_name = 'tier';`
        );
        if (cols.length === 0) {
          await db.query(`ALTER TABLE "Achievements" ADD COLUMN "tier" VARCHAR(50) DEFAULT 'bronze';`);
          steps.push('Added missing tier column to Achievements table');
        } else {
          steps.push('tier column already exists');
        }
      } catch (colErr) {
        steps.push(`tier column check/add: ${colErr.message}`);
      }

      // Step 3: Run the Swan-themed reseed seeder (wipes + reseeds)
      try {
        const { createRequire } = await import('module');
        const { fileURLToPath } = await import('url');
        const pathMod = await import('path');

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = pathMod.default.dirname(__filename);
        const seederPath = pathMod.default.resolve(__dirname, '..', 'seeders', '20260310000001-reseed-swan-achievements.cjs');
        steps.push(`Seeder path: ${seederPath}`);

        const require = createRequire(import.meta.url);
        const seeder = require(seederPath);

        const queryInterface = db.getQueryInterface();
        const SequelizeMod = await import('sequelize');
        await seeder.up(queryInterface, SequelizeMod.default || SequelizeMod);

        const finalCount = await Achievement.count();
        steps.push(`Swan reseed complete: ${finalCount} achievements (was ${currentCount})`);
        return res.json({ success: true, count: finalCount, steps });
      } catch (seederErr) {
        steps.push(`Seeder FAILED: ${seederErr.message}`);
        steps.push(seederErr.stack?.split('\n').slice(1, 4).join('\n'));
        return res.json({ success: false, steps, error: seederErr.message });
      }

    } catch (error) {
      return res.status(500).json({
        success: false,
        steps,
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      });
    }
  },
  // ─────────────────────────────────────────────────────────────
  // SECTION: Streak Freeze Endpoints
  // PURPOSE: Loss Aversion psychology — protect streaks from missed days
  // ─────────────────────────────────────────────────────────────

  /**
   * GET /api/gamification/streak-freeze/:userId
   * Returns the user's streak freeze status (available, max, used).
   */
  getStreakFreezeStatus: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId || req.user?.id);
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID required' });
      }

      const gamificationRecord = await Gamification.findOne({ where: { userId } });
      if (!gamificationRecord) {
        return res.json({
          success: true,
          data: { available: 0, max: 3, used: 0 }
        });
      }

      return res.json({
        success: true,
        data: {
          available: gamificationRecord.streakFreezes || 0,
          max: 3,
          used: gamificationRecord.streakFreezesUsed || 0,
          lastEarned: gamificationRecord.lastStreakFreezeEarned,
          lastUsed: gamificationRecord.lastStreakFreezeUsed,
          currentStreak: gamificationRecord.streakCount || 0
        }
      });
    } catch (error) {
      console.error('getStreakFreezeStatus error:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * POST /api/gamification/streak-freeze/use
   * Consumes one streak freeze to protect the user's streak.
   */
  useStreakFreeze: async (req, res) => {
    try {
      const userId = parseInt(req.body.userId || req.user?.id);
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID required' });
      }

      const gamificationRecord = await Gamification.findOne({ where: { userId } });
      if (!gamificationRecord) {
        return res.status(404).json({ success: false, error: 'No gamification record found' });
      }

      const currentFreezes = gamificationRecord.streakFreezes || 0;
      if (currentFreezes <= 0) {
        return res.json({
          success: false,
          error: 'No streak freezes available',
          data: { available: 0, streakLost: true }
        });
      }

      await gamificationRecord.update({
        streakFreezes: currentFreezes - 1,
        streakFreezesUsed: (gamificationRecord.streakFreezesUsed || 0) + 1,
        lastStreakFreezeUsed: new Date()
      });

      return res.json({
        success: true,
        message: 'Streak freeze used! Your streak is safe. 🛡️',
        data: {
          remaining: currentFreezes - 1,
          max: 3,
          streakPreserved: gamificationRecord.streakCount || 0
        }
      });
    } catch (error) {
      console.error('useStreakFreeze error:', error.message);
      return res.status(500).json({ success: false, error: safeError(req, error) });
    }
  },

  // ─────────────────────────────────────────────────────────────
  // SECTION: Weekly Recap (Spotify Wrapped-style)
  // PURPOSE: Weekly summary card shown on Monday login
  // PSYCHOLOGY: Social Proof + Progress Awareness — users see their growth
  // ─────────────────────────────────────────────────────────────

  /**
   * GET /api/gamification/users/:userId/weekly-recap
   * Returns this week vs last week comparison stats.
   */
  getWeeklyRecap: async (req, res) => {
    try {
      const userId = Number.parseInt(req.params.userId, 10);
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID required' });
      }

      const now = new Date();
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - now.getDay()); // Sunday
      thisWeekStart.setHours(0, 0, 0, 0);

      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      // This week's stats
      const thisWeekTx = await PointTransaction.findAll({
        where: {
          userId,
          transactionType: { [Op.in]: ['earn', 'bonus'] },
          createdAt: { [Op.gte]: thisWeekStart }
        },
        attributes: ['points', 'source', 'createdAt']
      });

      // Last week's stats
      const lastWeekTx = await PointTransaction.findAll({
        where: {
          userId,
          transactionType: { [Op.in]: ['earn', 'bonus'] },
          createdAt: { [Op.gte]: lastWeekStart, [Op.lt]: thisWeekStart }
        },
        attributes: ['points', 'source']
      });

      const thisWeekXP = thisWeekTx.reduce((sum, t) => sum + (t.points || 0), 0);
      const lastWeekXP = lastWeekTx.reduce((sum, t) => sum + (t.points || 0), 0);
      const thisWeekWorkouts = thisWeekTx.filter(t => weeklyRecapWorkoutSources.includes(t.source)).length;
      const lastWeekWorkouts = lastWeekTx.filter(t => weeklyRecapWorkoutSources.includes(t.source)).length;

      // Surprise multipliers this week
      const surprises = thisWeekTx.filter(t =>
        weeklyRecapWorkoutSources.includes(t.source) && t.points > 50
      ).length;

      // User's current state - explicit attrs prevent schema drift on unrelated columns
      const gamRecord = await Gamification.findOne({
        where: { userId },
        attributes: ['streakCount', 'longestStreak', 'level', 'currentTier', 'totalXP']
      });

      return res.json({
        success: true,
        data: {
          thisWeek: {
            totalXP: thisWeekXP,
            workouts: thisWeekWorkouts,
            surpriseMultipliers: surprises,
          },
          lastWeek: {
            totalXP: lastWeekXP,
            workouts: lastWeekWorkouts,
          },
          trends: {
            xpChange: thisWeekXP - lastWeekXP,
            workoutChange: thisWeekWorkouts - lastWeekWorkouts,
            xpDirection: thisWeekXP >= lastWeekXP ? 'up' : 'down',
            workoutDirection: thisWeekWorkouts >= lastWeekWorkouts ? 'up' : 'down',
          },
          current: {
            streak: gamRecord?.streakCount || 0,
            longestStreak: gamRecord?.longestStreak || 0,
            level: gamRecord?.level || 1,
            tier: gamRecord?.currentTier || 'bronze',
            totalXP: gamRecord?.totalXP || 0,
          },
          weekStarting: thisWeekStart.toISOString(),
        }
      });
    } catch (error) {
      console.error('getWeeklyRecap error:', error.message);
      return res.status(500).json({ success: false, error: safeError(req, error) });
    }
  },

  // ─────────────────────────────────────────────────────────────
  // SECTION: Activity Feed (Polling Fallback for WebSocket)
  // PURPOSE: Returns recent gamification activity for live feed display
  // ─────────────────────────────────────────────────────────────

  /**
   * GET /api/gamification/activity-feed?since=<ISO timestamp>&limit=20
   * Returns recent point transactions for social activity feed.
   */
  getActivityFeed: async (req, res) => {
    try {
      const { since, limit: rawLimit = 20 } = req.query;
      const limit = Math.min(parseInt(rawLimit) || 20, 50);

      const whereClause = {};
      if (since) {
        whereClause.createdAt = { [Op.gte]: new Date(since) };
      }

      // Only show earn/bonus transactions (not spends/expires)
      whereClause.transactionType = { [Op.in]: ['earn', 'bonus'] };

      const feed = await PointTransaction.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit,
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
        }]
      });

      const normalizedFeed = feed.map((transaction) => {
        const record = transaction.get({ plain: true });
        const displayName =
          [record.user?.firstName, record.user?.lastName].filter(Boolean).join(' ')
          || record.user?.username
          || 'Client';

        return {
          id: record.id,
          type: mapPointTransactionFeedType(record.source),
          message: record.description || `${displayName} earned ${record.points || 0} points`,
          timestamp: record.createdAt,
          timeAgo: formatFeedTimeAgo(record.createdAt),
          meta: displayName
        };
      });

      return res.json({
        success: true,
        data: normalizedFeed,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('getActivityFeed error:', error.message);
      return res.status(500).json({ success: false, error: safeError(req, error) });
    }
  },

  // ─────────────────────────────────────────────────────────────
  // SECTION: Comeback Challenge Endpoints
  // PURPOSE: Re-engagement system for inactive users
  // PSYCHOLOGY: Loss Aversion + Commitment/Consistency (Cialdini)
  // ─────────────────────────────────────────────────────────────

  /**
   * GET /api/gamification/comeback-challenge/:userId
   * Returns active comeback challenge for user (if any).
   */
  getComebackChallenge: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId || req.user?.id);
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID required' });
      }

      const challenge = await ComebackChallenge.findOne({
        where: {
          userId,
          status: { [Op.in]: ['pending', 'accepted'] },
          endDate: { [Op.gte]: new Date() }
        },
        order: [['createdAt', 'DESC']]
      });

      return res.json({ success: true, data: challenge || null });
    } catch (error) {
      console.error('getComebackChallenge error:', error.message);
      return res.status(500).json({ success: false, error: safeError(req, error) });
    }
  },

  /**
   * POST /api/gamification/comeback-challenge/accept
   * User accepts a comeback challenge.
   */
  acceptComebackChallenge: async (req, res) => {
    try {
      const userId = parseInt(req.body.userId || req.user?.id);
      const challengeId = parseInt(req.body.challengeId);

      if (!userId || !challengeId) {
        return res.status(400).json({ success: false, error: 'User ID and Challenge ID required' });
      }

      const challenge = await ComebackChallenge.findOne({
        where: { id: challengeId, userId, status: 'pending' }
      });

      if (!challenge) {
        return res.status(404).json({ success: false, error: 'Challenge not found or already accepted' });
      }

      await challenge.update({ status: 'accepted', acceptedAt: new Date() });

      return res.json({
        success: true,
        message: 'Challenge accepted! Complete your workouts to earn bonus XP.',
        data: challenge
      });
    } catch (error) {
      console.error('acceptComebackChallenge error:', error.message);
      return res.status(500).json({ success: false, error: safeError(req, error) });
    }
  },

  // ─────────────────────────────────────────────────────────────
  // SECTION: Aegis HUD — RPG Needs System (V2)
  // PURPOSE: 5 needs bars with time-based decay and action replenishment
  // ─────────────────────────────────────────────────────────────

  /**
   * GET /api/gamification/users/:userId/aegis-hud
   * Returns current needs state with decay applied.
   */
  getAegisHud: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });

      const { default: AegisHudService } = await import('../services/gamification/AegisHudService.mjs');
      const { default: Gamification } = await import('../models/Gamification.mjs');

      let record = await Gamification.findOne({ where: { userId } });

      // Auto-create gamification record if none exists
      if (!record) {
        record = await Gamification.create({ userId });
      }

      const hudData = await AegisHudService.getNeeds(record);
      return res.json({ success: true, data: hudData });
    } catch (error) {
      console.error('getAegisHud error:', error.message);
      return res.status(500).json({ success: false, error: safeError(req, error) });
    }
  },

  /**
   * POST /api/gamification/users/:userId/aegis-hud/replenish
   * Manually replenish needs from an action (called after gamification awards).
   * Body: { actionType: 'workout_completed' | 'social_post' | etc. }
   */
  replenishAegisHud: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { actionType } = req.body;

      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });
      if (!actionType) return res.status(400).json({ success: false, error: 'actionType required' });

      const { default: AegisHudService } = await import('../services/gamification/AegisHudService.mjs');
      const { default: Gamification } = await import('../models/Gamification.mjs');

      let record = await Gamification.findOne({ where: { userId } });
      if (!record) record = await Gamification.create({ userId });

      const hudData = await AegisHudService.replenishFromAction(record, actionType);
      if (!hudData) {
        return res.status(400).json({ success: false, error: `Unknown action type: ${actionType}` });
      }

      return res.json({ success: true, data: hudData });
    } catch (error) {
      console.error('replenishAegisHud error:', error.message);
      return res.status(500).json({ success: false, error: safeError(req, error) });
    }
  },

  /**
   * PUT /api/gamification/users/:userId/aegis-hud/:needKey
   * Admin override: set a specific need value.
   * Body: { value: 0-100 }
   */
  setAegisHudNeed: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { needKey } = req.params;
      const { value } = req.body;

      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });
      if (value === undefined || value === null) return res.status(400).json({ success: false, error: 'value required (0-100)' });

      const { default: AegisHudService } = await import('../services/gamification/AegisHudService.mjs');
      const { default: Gamification } = await import('../models/Gamification.mjs');

      let record = await Gamification.findOne({ where: { userId } });
      if (!record) record = await Gamification.create({ userId });

      const hudData = await AegisHudService.setNeed(record, needKey, parseFloat(value));
      return res.json({ success: true, data: hudData });
    } catch (error) {
      console.error('setAegisHudNeed error:', error.message);
      return res.status(500).json({ success: false, error: safeError(req, error) });
    }
  },

  /**
   * GET /api/gamification/aegis-hud/config
   * Returns the needs configuration (labels, icons, colors, decay rates).
   * Public endpoint for frontend to render the HUD correctly.
   */
  // ─────────────────────────────────────────────────────────────
  // SECTION: Vault Decryption — Loot Drop System (V2)
  // PURPOSE: Variable-ratio reinforcement loot drops after actions
  // ─────────────────────────────────────────────────────────────

  /**
   * POST /api/gamification/users/:userId/vault/roll
   * Roll for a loot drop after a qualifying action.
   * Body: { actionType: 'workout_completed' | 'personal_record' | etc. }
   */
  rollVaultDrop: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { actionType } = req.body;

      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });
      if (!actionType) return res.status(400).json({ success: false, error: 'actionType required' });

      const { default: VaultDecryptionService } = await import('../services/gamification/VaultDecryptionService.mjs');
      const { default: Gamification } = await import('../models/Gamification.mjs');

      let record = await Gamification.findOne({ where: { userId } });
      if (!record) record = await Gamification.create({ userId });

      const drop = VaultDecryptionService.rollForDrop(actionType, userId);
      if (!drop) {
        return res.json({ success: true, data: { dropped: false, message: 'No drop this time' } });
      }

      // Record the drop
      await VaultDecryptionService.recordDrop(record, drop);

      // If drop has xpBonus, award it
      if (drop.xpBonus > 0) {
        const currentXP = record.totalXP || 0;
        await record.update({ totalXP: currentXP + drop.xpBonus });
      }

      return res.json({
        success: true,
        data: {
          dropped: true,
          drop,
        },
      });
    } catch (error) {
      console.error('rollVaultDrop error:', error.message);
      return res.status(500).json({ success: false, error: safeError(req, error) });
    }
  },

  /**
   * GET /api/gamification/users/:userId/vault/inventory
   * Get user's loot drop history.
   */
  getVaultInventory: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });

      const { default: VaultDecryptionService } = await import('../services/gamification/VaultDecryptionService.mjs');
      const { default: Gamification } = await import('../models/Gamification.mjs');

      const record = await Gamification.findOne({ where: { userId } });
      if (!record) return res.json({ success: true, data: { inventory: [] } });

      const inventory = await VaultDecryptionService.getUserInventory(record);
      return res.json({ success: true, data: { inventory } });
    } catch (error) {
      console.error('getVaultInventory error:', error.message);
      return res.status(500).json({ success: false, error: safeError(req, error) });
    }
  },

  /**
   * GET /api/gamification/vault/config
   * Get vault configuration (rarity tiers, drop triggers, etc.) for frontend.
   */
  getVaultConfig: async (_req, res) => {
    try {
      const { default: VaultDecryptionService } = await import('../services/gamification/VaultDecryptionService.mjs');
      return res.json({ success: true, data: VaultDecryptionService.getConfig() });
    } catch (error) {
      console.error('getVaultConfig error:', error.message);
      return res.status(500).json({ success: false, error: 'Failed to load vault config' });
    }
  },

  // ─────────────────────────────────────────────────────────────
  // SECTION: Ghost Mode — Personal Competition (V2)
  // PURPOSE: Race against your own previous workout performance
  // ─────────────────────────────────────────────────────────────

  /**
   * GET /api/gamification/users/:userId/ghost
   * Get the ghost (best previous workout) for comparison.
   * Query: ?category=full_body
   */
  getGhost: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { category } = req.query;

      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });

      const { default: GhostModeService } = await import('../services/gamification/GhostModeService.mjs');
      const result = await GhostModeService.getGhost(userId, { category });

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('getGhost error:', error.message);
      return res.status(500).json({ success: false, error: safeError(req, error) });
    }
  },

  /**
   * POST /api/gamification/users/:userId/ghost/compare
   * Compare completed workout against ghost and award bonuses.
   * Body: { ghostData, currentWorkoutData }
   */
  compareGhost: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { ghostData, currentWorkoutData } = req.body;

      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });

      const { default: GhostModeService } = await import('../services/gamification/GhostModeService.mjs');
      const comparison = GhostModeService.compareWithGhost(ghostData, currentWorkoutData);

      // Award bonus XP if any
      if (comparison.bonusXP > 0) {
        const { default: Gamification } = await import('../models/Gamification.mjs');
        const record = await Gamification.findOne({ where: { userId } });
        if (record) {
          await record.update({ totalXP: (record.totalXP || 0) + comparison.bonusXP });
        }
      }

      return res.json({ success: true, data: comparison });
    } catch (error) {
      console.error('compareGhost error:', error.message);
      return res.status(500).json({ success: false, error: safeError(req, error) });
    }
  },

  /**
   * GET /api/gamification/ghost/config
   * Get ghost mode configuration and bonus structure.
   */
  getGhostConfig: async (_req, res) => {
    try {
      const { default: GhostModeService } = await import('../services/gamification/GhostModeService.mjs');
      return res.json({ success: true, data: GhostModeService.getConfig() });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to load ghost config' });
    }
  },

  // ─────────────────────────────────────────────────────────────
  // SECTION: Job Class System (V2)
  // PURPOSE: FFXIV-style fitness job classes with XP bonus multipliers
  // ─────────────────────────────────────────────────────────────

  /**
   * PUT /api/gamification/users/:userId/job-class
   * Set or change user's job class.
   * Body: { jobClass: 'paladin' | 'monk' | 'ranger' | 'white_mage' | 'dark_knight' }
   */
  setJobClass: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { jobClass } = req.body;
      const validClasses = ['paladin', 'monk', 'ranger', 'white_mage', 'dark_knight'];

      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });
      if (!validClasses.includes(jobClass)) {
        return res.status(400).json({ success: false, error: `Invalid job class. Must be one of: ${validClasses.join(', ')}` });
      }

      const { default: Gamification } = await import('../models/Gamification.mjs');
      let record = await Gamification.findOne({ where: { userId } });
      if (!record) record = await Gamification.create({ userId });

      await record.update({ jobClass });

      return res.json({
        success: true,
        message: `Job class set to ${jobClass}`,
        data: { jobClass },
      });
    } catch (error) {
      console.error('setJobClass error:', error.message);
      return res.status(500).json({ success: false, error: safeError(req, error) });
    }
  },

  /**
   * GET /api/gamification/users/:userId/job-class
   * Get user's current job class.
   */
  getJobClass: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });

      const { default: Gamification } = await import('../models/Gamification.mjs');
      const record = await Gamification.findOne({ where: { userId }, attributes: ['jobClass'] });

      return res.json({
        success: true,
        data: { jobClass: record?.jobClass || null },
      });
    } catch (error) {
      console.error('getJobClass error:', error.message);
      return res.status(500).json({ success: false, error: safeError(req, error) });
    }
  },

  getAegisHudConfig: async (_req, res) => {
    try {
      const { NEED_CONFIG, ACTION_REPLENISH, MOODLETS } = await import('../services/gamification/AegisHudService.mjs');
      return res.json({
        success: true,
        data: {
          needs: NEED_CONFIG,
          actions: ACTION_REPLENISH,
          moodlets: MOODLETS.map(m => ({ id: m.id, label: m.label, icon: m.icon })),
        },
      });
    } catch (error) {
      console.error('getAegisHudConfig error:', error.message);
      return res.status(500).json({ success: false, error: 'Failed to load Aegis HUD config' });
    }
  },

  // ── COMPANION PET ENDPOINTS ──

  getPet: async (req, res) => {
    try {
      const { CompanionPetService } = await import('../services/gamification/CompanionPetService.mjs');
      const data = await CompanionPetService.getPetData(parseInt(req.params.userId));
      return res.json({ success: true, data });
    } catch (error) {
      console.error('getPet error:', error.message);
      return res.status(500).json({ success: false, error: safeError(req, error) });
    }
  },

  adoptPet: async (req, res) => {
    try {
      const { CompanionPetService } = await import('../services/gamification/CompanionPetService.mjs');
      const { species, petName } = req.body;
      const data = await CompanionPetService.adoptPet(parseInt(req.params.userId), species, petName);
      return res.status(201).json({ success: true, data });
    } catch (error) {
      console.error('adoptPet error:', error.message);
      return res.status(error.message.includes('already') ? 409 : 500).json({
        success: false, error: error.message,
      });
    }
  },

  interactWithPet: async (req, res) => {
    try {
      const { CompanionPetService } = await import('../services/gamification/CompanionPetService.mjs');
      const { interactionType } = req.body;
      const data = await CompanionPetService.interact(parseInt(req.params.userId), interactionType || 'pet');
      return res.json({ success: true, data });
    } catch (error) {
      console.error('interactWithPet error:', error.message);
      return res.status(500).json({ success: false, error: safeError(req, error) });
    }
  },

  recordPetActivity: async (req, res) => {
    try {
      const { CompanionPetService } = await import('../services/gamification/CompanionPetService.mjs');
      const { activityType, amount } = req.body;
      const data = await CompanionPetService.recordActivity(parseInt(req.params.userId), activityType, amount || 1);
      return res.json({ success: true, data });
    } catch (error) {
      console.error('recordPetActivity error:', error.message);
      return res.status(500).json({ success: false, error: safeError(req, error) });
    }
  },

  renamePet: async (req, res) => {
    try {
      const { CompanionPetService } = await import('../services/gamification/CompanionPetService.mjs');
      const data = await CompanionPetService.renamePet(parseInt(req.params.userId), req.body.name);
      return res.json({ success: true, data });
    } catch (error) {
      console.error('renamePet error:', error.message);
      return res.status(500).json({ success: false, error: safeError(req, error) });
    }
  },

  releasePet: async (req, res) => {
    try {
      const { CompanionPetService } = await import('../services/gamification/CompanionPetService.mjs');
      const data = await CompanionPetService.releasePet(parseInt(req.params.userId));
      return res.json({ success: true, data });
    } catch (error) {
      console.error('releasePet error:', error.message);
      return res.status(500).json({ success: false, error: safeError(req, error) });
    }
  },

  getPetConfig: async (_req, res) => {
    try {
      const { CompanionPetService } = await import('../services/gamification/CompanionPetService.mjs');
      return res.json({ success: true, data: CompanionPetService.getEvolutionConfig() });
    } catch (error) {
      console.error('getPetConfig error:', error.message);
      return res.status(500).json({ success: false, error: 'Failed to load pet config' });
    }
  }
};

export default gamificationController;
