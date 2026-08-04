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
 *   gamificationV1Routes.mjs → gamificationController → Sequelize models
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
 *   │ Cygnus   │   │ Frostwing│   │ Gilded  │   │ Amethyst │
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
 * - tier_reached: Reach a configured Swan arc or legacy tier alias
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
import { checkBadgesForGamificationEvent } from '../services/badgeGamificationBridge.mjs';
import { Op } from 'sequelize';
import db from '../database.mjs';
import {
  buildRankTitleSelectionPayload,
  validateSelectedRankTitleKey,
} from '../utils/gamificationRankTitles.mjs';

// Explicit attribute list for UserAchievement — the real "UserAchievements" columns.
//
// HISTORY (rule 79): this list existed because the model declared ~45 attributes (maxProgress,
// progressPercentage, …) that are not columns, so any unscoped SELECT threw. That was a
// workaround for a KNOWN, DOCUMENTED drift left live for months — this comment was the fossil
// recording it. The model was fixed to schema truth in SWA-87 and now declares exactly these
// columns, so the list is no longer load-bearing.
//
// Kept deliberately: it pins the query shape, so a future re-widening of the model cannot
// silently change what these endpoints select. It must stay in sync with the model's real
// attributes — `audit-model-health` / `audit-write-paths` catch it if it drifts again.
//
// NOTE: Achievement queries do NOT need explicit attrs because the Achievements
// table was model-created (via Sequelize sync), so ALL model columns exist.
const SAFE_USER_ACHIEVEMENT_ATTRS = [
  'id', 'userId', 'achievementId', 'earnedAt', 'progress', 'isCompleted',
  'pointsAwarded', 'notificationSent', 'createdAt', 'updatedAt'
];

const POINT_TRANSACTION_PUBLIC_ATTRIBUTES = Object.freeze([
  'id',
  'userId',
  'points',
  'balance',
  'transactionType',
  'source',
  'sourceId',
  'description',
  'metadata',
  'awardedBy',
  'createdAt',
  'updatedAt'
]);

const POINT_TRANSACTION_FEED_ATTRIBUTES = Object.freeze([
  'id',
  'points',
  'source',
  'description',
  'createdAt'
]);
const weeklyRecapWorkoutSources = ['workout_completion', 'workout_completed'];

const getAchievementPointValue = (achievement) => {
  const parsed = parseNonNegativeInteger(achievement?.xpReward, 0);
  return parsed ?? 0;
};

// SECURITY FIX #10: Sanitize error messages for non-admin responses
// Only admin users see detailed error messages; everyone else gets generic
const safeError = (req, error) => {
  if (req.user?.role === 'admin') return error.message;
  return 'An error occurred. Please try again.';
};

const INTERNAL_ERROR = 'Internal server error';

const sendGamificationError = (res, message) => res.status(500).json({
  success: false,
  message,
  error: INTERNAL_ERROR
});

const DECIMAL_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;

const parsePrimitiveNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!DECIMAL_NUMBER_PATTERN.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const parsePositiveInteger = (value, fallback = null) => {
  const parsed = parsePrimitiveNumber(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoundedPositiveInteger = (value, fallback, max) => {
  const parsed = parsePositiveInteger(value, fallback);
  return Math.min(parsed, max);
};

const parseNonNegativeInteger = (value, fallback = null) => {
  const parsed = parsePrimitiveNumber(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

const parseBoundedNumber = (value, min, max) => {
  const parsed = parsePrimitiveNumber(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;

  return parsed;
};

const parseOptionalIsoDate = (value) => {
  if (value === undefined) return null;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(trimmed);
  if (!match) return null;

  const [, yearRaw, monthRaw, dayRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (
    utcDate.getUTCFullYear() !== year
    || utcDate.getUTCMonth() !== month - 1
    || utcDate.getUTCDate() !== day
  ) {
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeBoundedString = (value, maxLength) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
};

const VALID_GAMIFICATION_TIERS = new Set(['bronze', 'silver', 'gold', 'platinum']);
const VALID_REWARD_TYPES = new Set(['session', 'product', 'discount', 'service', 'other']);
const VALID_PET_INTERACTIONS = new Set(['pet', 'feed', 'play']);
const MAX_PUBLIC_GAMIFICATION_LEVEL = 1000;

const DEFAULT_GAMIFICATION_TIER_THRESHOLDS = Object.freeze({
  bronze: 0,
  silver: 1000,
  gold: 5000,
  platinum: 20000
});

const DEFAULT_GAMIFICATION_LEVEL_REQUIREMENTS = Object.freeze({
  levelCap: MAX_PUBLIC_GAMIFICATION_LEVEL,
  enableLevelCap: true,
  streakExpirationDays: 3,
  pointsExpiration: { enabled: false, expirationDays: 365 }
});

const DEFAULT_GAMIFICATION_SETTINGS = Object.freeze({
  isEnabled: true,
  pointsPerWorkout: 50,
  pointsPerExercise: 10,
  pointsPerStreak: 20,
  pointsPerLevel: 100,
  pointsPerReview: 15,
  pointsPerReferral: 200,
  tierThresholds: DEFAULT_GAMIFICATION_TIER_THRESHOLDS,
  levelRequirements: DEFAULT_GAMIFICATION_LEVEL_REQUIREMENTS,
  pointsMultiplier: 1.0,
  enableLeaderboards: true,
  enableNotifications: true,
  autoAwardAchievements: true
});

const SETTINGS_POINT_VALUE_DEFINITIONS = Object.freeze([
  { id: 'workout_complete', name: 'Workout Complete', description: 'Complete a workout', field: 'pointsPerWorkout' },
  { id: 'exercise_complete', name: 'Exercise Complete', description: 'Log an exercise', field: 'pointsPerExercise' },
  { id: 'streak_day', name: 'Streak Day', description: 'Maintain a training streak', field: 'pointsPerStreak' },
  { id: 'review_complete', name: 'Review Complete', description: 'Complete a review prompt', field: 'pointsPerReview' },
  { id: 'friend_referral', name: 'Friend Referral', description: 'Refer a new member', field: 'pointsPerReferral' }
]);

const normalizeSettingsRecord = (settings) => (
  typeof settings?.get === 'function' ? settings.get({ plain: true }) : settings
) || {};

const buildGamificationSettingsPayload = (settings) => {
  const raw = normalizeSettingsRecord(settings);
  const tierThresholds = raw.tierThresholds && typeof raw.tierThresholds === 'object'
    ? raw.tierThresholds
    : DEFAULT_GAMIFICATION_TIER_THRESHOLDS;
  const levelRequirements = {
    ...DEFAULT_GAMIFICATION_LEVEL_REQUIREMENTS,
    ...(raw.levelRequirements && typeof raw.levelRequirements === 'object' ? raw.levelRequirements : {})
  };
  const notificationsEnabled = raw.enableNotifications !== false;

  return {
    ...raw,
    pointValues: SETTINGS_POINT_VALUE_DEFINITIONS.map(({ field, ...definition }) => ({
      ...definition,
      pointValue: parseNonNegativeInteger(raw[field], 0)
    })),
    tierThresholds: Object.entries(tierThresholds).map(([tier, pointsRequired]) => ({
      tier,
      pointsRequired: parseNonNegativeInteger(pointsRequired, 0)
    })),
    levelSettings: {
      pointsPerLevel: parsePositiveInteger(raw.pointsPerLevel, 100),
      levelCap: Math.min(parsePositiveInteger(levelRequirements.levelCap, MAX_PUBLIC_GAMIFICATION_LEVEL), MAX_PUBLIC_GAMIFICATION_LEVEL),
      enableLevelCap: Boolean(levelRequirements.enableLevelCap)
    },
    systemSettings: {
      enableGamification: raw.isEnabled !== false,
      enableAchievements: raw.autoAwardAchievements !== false,
      enableRewards: true,
      enableLeaderboard: raw.enableLeaderboards !== false,
      enableLevels: true,
      enableTiers: true,
      enableStreaks: true,
      notifyOnAchievement: notificationsEnabled,
      notifyOnLevelUp: notificationsEnabled,
      notifyOnReward: notificationsEnabled,
      streakExpirationDays: parsePositiveInteger(levelRequirements.streakExpirationDays, 3),
      pointsExpiration: {
        enabled: Boolean(levelRequirements.pointsExpiration?.enabled),
        expirationDays: parsePositiveInteger(levelRequirements.pointsExpiration?.expirationDays, 365)
      }
    }
  };
};

const setNonNegativeIntegerField = (target, field, value) => {
  if (value === undefined) return null;
  const parsed = parseNonNegativeInteger(value);
  if (parsed === null) return `${field} must be a non-negative integer`;
  target[field] = parsed;
  return null;
};

const setBooleanField = (target, field, value) => {
  if (value === undefined) return null;
  if (typeof value !== 'boolean') return `${field} must be a boolean`;
  target[field] = value;
  return null;
};

const applyPointValueDraftFields = (target, pointValues) => {
  if (pointValues === undefined) return null;
  if (!Array.isArray(pointValues)) return 'pointValues must be an array';

  for (const pointValue of pointValues) {
    const definition = SETTINGS_POINT_VALUE_DEFINITIONS.find((item) => item.id === pointValue?.id);
    if (!definition) continue;

    const error = setNonNegativeIntegerField(target, definition.field, pointValue.pointValue);
    if (error) return error;
  }

  return null;
};

const applyTierThresholdDraftFields = (target, tierThresholds) => {
  if (tierThresholds === undefined) return null;
  const nextThresholds = {};

  if (Array.isArray(tierThresholds)) {
    for (const item of tierThresholds) {
      if (!item?.tier) continue;
      const pointsRequired = parseNonNegativeInteger(item.pointsRequired);
      if (pointsRequired === null) return `${item.tier} threshold must be a non-negative integer`;
      nextThresholds[item.tier] = pointsRequired;
    }
  } else if (typeof tierThresholds === 'object' && tierThresholds !== null) {
    for (const [tier, pointsRequired] of Object.entries(tierThresholds)) {
      const parsed = parseNonNegativeInteger(pointsRequired);
      if (parsed === null) return `${tier} threshold must be a non-negative integer`;
      nextThresholds[tier] = parsed;
    }
  } else {
    return 'tierThresholds must be an array or object';
  }

  target.tierThresholds = Object.keys(nextThresholds).length > 0 ? nextThresholds : DEFAULT_GAMIFICATION_TIER_THRESHOLDS;
  return null;
};

const applyLevelSettingsDraftFields = (target, levelSettings) => {
  if (levelSettings === undefined) return null;
  if (typeof levelSettings !== 'object' || levelSettings === null) return 'levelSettings must be an object';

  const pointsError = setNonNegativeIntegerField(target, 'pointsPerLevel', levelSettings.pointsPerLevel);
  if (pointsError) return pointsError;

  const nextRequirements = {};
  if (levelSettings.levelCap !== undefined) {
    const levelCap = parsePositiveInteger(levelSettings.levelCap);
    if (levelCap === null || levelCap > MAX_PUBLIC_GAMIFICATION_LEVEL) {
      return 'levelCap must be a positive integer up to 1000';
    }
    nextRequirements.levelCap = levelCap;
  }

  if (levelSettings.enableLevelCap !== undefined) {
    if (typeof levelSettings.enableLevelCap !== 'boolean') return 'enableLevelCap must be a boolean';
    nextRequirements.enableLevelCap = levelSettings.enableLevelCap;
  }

  if (Object.keys(nextRequirements).length > 0) {
    target.levelRequirements = {
      ...(target.levelRequirements && typeof target.levelRequirements === 'object' ? target.levelRequirements : {}),
      ...nextRequirements
    };
  }

  return null;
};

const applySystemSettingsDraftFields = (target, systemSettings) => {
  if (systemSettings === undefined) return null;
  if (typeof systemSettings !== 'object' || systemSettings === null) return 'systemSettings must be an object';

  const fieldErrors = [
    setBooleanField(target, 'isEnabled', systemSettings.enableGamification),
    setBooleanField(target, 'autoAwardAchievements', systemSettings.enableAchievements),
    setBooleanField(target, 'enableLeaderboards', systemSettings.enableLeaderboard)
  ].filter(Boolean);
  if (fieldErrors.length > 0) return fieldErrors[0];

  const notificationFlags = [
    systemSettings.notifyOnAchievement,
    systemSettings.notifyOnLevelUp,
    systemSettings.notifyOnReward
  ].filter((value) => value !== undefined);
  if (notificationFlags.some((value) => typeof value !== 'boolean')) {
    return 'notification settings must be booleans';
  }
  if (notificationFlags.length > 0) {
    target.enableNotifications = notificationFlags.some(Boolean);
  }

  const nextRequirements = {};
  if (systemSettings.streakExpirationDays !== undefined) {
    const streakExpirationDays = parsePositiveInteger(systemSettings.streakExpirationDays);
    if (streakExpirationDays === null) return 'streakExpirationDays must be a positive integer';
    nextRequirements.streakExpirationDays = streakExpirationDays;
  }

  if (systemSettings.pointsExpiration !== undefined) {
    if (typeof systemSettings.pointsExpiration !== 'object' || systemSettings.pointsExpiration === null) {
      return 'pointsExpiration must be an object';
    }
    const expirationDays = parsePositiveInteger(systemSettings.pointsExpiration.expirationDays, 365);
    nextRequirements.pointsExpiration = {
      enabled: Boolean(systemSettings.pointsExpiration.enabled),
      expirationDays
    };
  }

  if (Object.keys(nextRequirements).length > 0) {
    target.levelRequirements = {
      ...(target.levelRequirements && typeof target.levelRequirements === 'object' ? target.levelRequirements : {}),
      ...nextRequirements
    };
  }

  return null;
};

const applyFlatGamificationSettingsFields = (target, body) => {
  const errors = [
    setBooleanField(target, 'isEnabled', body.isEnabled),
    setNonNegativeIntegerField(target, 'pointsPerWorkout', body.pointsPerWorkout),
    setNonNegativeIntegerField(target, 'pointsPerExercise', body.pointsPerExercise),
    setNonNegativeIntegerField(target, 'pointsPerStreak', body.pointsPerStreak),
    setNonNegativeIntegerField(target, 'pointsPerLevel', body.pointsPerLevel),
    setNonNegativeIntegerField(target, 'pointsPerReview', body.pointsPerReview),
    setNonNegativeIntegerField(target, 'pointsPerReferral', body.pointsPerReferral),
    setBooleanField(target, 'enableLeaderboards', body.enableLeaderboards),
    setBooleanField(target, 'enableNotifications', body.enableNotifications),
    setBooleanField(target, 'autoAwardAchievements', body.autoAwardAchievements)
  ].filter(Boolean);

  if (errors.length > 0) return errors[0];

  if (body.levelRequirements !== undefined) {
    if (typeof body.levelRequirements !== 'object' || body.levelRequirements === null || Array.isArray(body.levelRequirements)) {
      return 'levelRequirements must be an object';
    }
    const levelCap = body.levelRequirements.levelCap;
    if (levelCap !== undefined) {
      const parsedLevelCap = parsePositiveInteger(levelCap);
      if (parsedLevelCap === null || parsedLevelCap > MAX_PUBLIC_GAMIFICATION_LEVEL) {
        return 'levelCap must be a positive integer up to 1000';
      }
    }
    target.levelRequirements = body.levelRequirements;
  }
  return null;
};

const applyGamificationSettingsDraft = (target, body) => {
  const errors = [
    applyPointValueDraftFields(target, body.pointValues),
    applyTierThresholdDraftFields(target, body.tierThresholds),
    applyLevelSettingsDraftFields(target, body.levelSettings),
    applySystemSettingsDraftFields(target, body.systemSettings)
  ].filter(Boolean);

  return errors[0] || null;
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

const buildAchievementBadgeActivity = (achievement, ledgerResult = {}) => ({
  achievementId: achievement?.id,
  achievementIds: [achievement?.id].filter(Boolean),
  achievementName: achievement?.name,
  achievementNames: [achievement?.name].filter(Boolean),
  points: ledgerResult?.pointsAwarded,
  totalPoints: ledgerResult?.newBalance,
  completed: true,
  status: 'completed'
});
const gamificationController = {
  /**
   * Get gamification settings
   */
  getSettings: async (req, res) => {
    try {
      let settings = await GamificationSettings.findOne();
      
      if (!settings) {
        settings = await GamificationSettings.create(DEFAULT_GAMIFICATION_SETTINGS);
      }
      
      return res.status(200).json({
        success: true,
        settings: buildGamificationSettingsPayload(settings)
      });
    } catch (error) {
      console.error('Error getting gamification settings:', error);
      return sendGamificationError(res, 'Failed to get gamification settings');
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
      const normalizedPointsMultiplier = pointsMultiplier === undefined ? undefined : parseBoundedNumber(pointsMultiplier, 0, 5);
      if (pointsMultiplier !== undefined && normalizedPointsMultiplier === null) {
        return res.status(400).json({ success: false, message: 'pointsMultiplier must be a number from 0 to 5' });
      }

      const updatedFields = {};
      const validationError = applyGamificationSettingsDraft(updatedFields, req.body);
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }

      const flatValidationError = applyFlatGamificationSettingsFields(updatedFields, {
        isEnabled,
        pointsPerWorkout,
        pointsPerExercise,
        pointsPerStreak,
        pointsPerLevel,
        pointsPerReview,
        pointsPerReferral,
        levelRequirements,
        enableLeaderboards,
        enableNotifications,
        autoAwardAchievements
      });
      if (flatValidationError) {
        return res.status(400).json({ success: false, message: flatValidationError });
      }

      if (pointsMultiplier !== undefined) updatedFields.pointsMultiplier = normalizedPointsMultiplier;
      
      let settings = await GamificationSettings.findOne();
      
      if (!settings) {
        settings = await GamificationSettings.create({
          ...DEFAULT_GAMIFICATION_SETTINGS,
          ...updatedFields,
          pointsMultiplier: pointsMultiplier === undefined ? 1.0 : normalizedPointsMultiplier,
        });
      } else {
        await settings.update(updatedFields);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Gamification settings updated successfully',
        settings: buildGamificationSettingsPayload(settings)
      });
    } catch (error) {
      console.error('Error updating gamification settings:', error);
      return sendGamificationError(res, 'Failed to update gamification settings');
    }
  },

  /**
   * Get user gamification profile
   */
  getUserProfile: async (req, res) => {
    try {
      const { userId } = req.params;
      const normalizedUserId = parsePositiveInteger(userId);

      if (!normalizedUserId) {
        return res.status(400).json({
          success: false,
          message: 'Valid user id is required'
        });
      }
      
      // Get user with achievements, rewards, and milestones
      const user = await User.findByPk(normalizedUserId, {
        attributes: [
          'id', 'firstName', 'lastName', 'username', 'photo',
          'points', 'lifetimePointsEarned', 'level', 'tier', 'streakDays', 'totalWorkouts',
          'totalExercises', 'selectedRankTitleKey'
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
      const progressionPoints = parseNonNegativeInteger(user.lifetimePointsEarned, 0);
      
      // Get leaderboard position
      const leaderboardPosition = await User.count({
        where: {
          lifetimePointsEarned: {
            [Op.gt]: progressionPoints
          }
        }
      }) + 1;
      
      // Get recent point transactions
      const recentTransactions = await PointTransaction.findAll({
        where: { userId: normalizedUserId },
        attributes: POINT_TRANSACTION_PUBLIC_ATTRIBUTES,
        limit: 10,
        order: [['createdAt', 'DESC']]
      });
      
      // Get next milestone
      const nextMilestone = await Milestone.findOne({
        where: {
          targetPoints: {
            [Op.gt]: progressionPoints
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
          nextLevelProgress = ((progressionPoints - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;
        }
        
        // Calculate next tier progress using Octalysis tier system
        const tierOrder = ['bronze_forge', 'silver_edge', 'titanium_core', 'obsidian_warrior', 'crystalline_swan'];
        const currentTierIndex = tierOrder.indexOf(user.tier);
        if (currentTierIndex < tierOrder.length - 1 && settings.tierThresholds) {
          const currentTierThreshold = settings.tierThresholds[user.tier] || 0;
          nextTier = tierOrder[currentTierIndex + 1];
          const nextTierThreshold = settings.tierThresholds[nextTier] || 0;

          if (nextTierThreshold > currentTierThreshold) {
            nextTierProgress = ((progressionPoints - currentTierThreshold) / (nextTierThreshold - currentTierThreshold)) * 100;
          }
        }
      }

      const rankTitlePayload = buildRankTitleSelectionPayload({
        points: progressionPoints,
        level: user.level,
        selectedRankTitleKey: user.selectedRankTitleKey
      });
      
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
          nextTier,
          ...rankTitlePayload
        }
      });
    } catch (error) {
      console.error('Error getting user gamification profile:', error);
      return sendGamificationError(res, 'Failed to get user gamification profile');
    }
  },

  /**
   * Get leaderboard
   */
  getLeaderboard: async (req, res) => {
    try {
      const { limit: rawLimit = 10, page = 1, tier } = req.query;
      const normalizedPage = parsePositiveInteger(page, 1);
      const normalizedLimit = parseBoundedPositiveInteger(rawLimit, 10, 100);
      const offset = (normalizedPage - 1) * normalizedLimit;
      
      // Respect the privacy opt-out — a user who set leaderboardOptIn=false
      // must not appear on the public leaderboard (defaults true, so existing
      // users stay visible).
      const whereClause = { leaderboardOptIn: true };
      if (tier && VALID_GAMIFICATION_TIERS.has(tier)) {
        whereClause.tier = tier;
      }

      const leaderboard = await User.findAll({
        attributes: [
          'id', 'firstName', 'lastName', 'username', 'photo',
          'points', 'lifetimePointsEarned', 'level', 'tier'
        ],
        where: whereClause,
        order: [['lifetimePointsEarned', 'DESC']],
        limit: normalizedLimit,
        offset
      });
      
      const total = await User.count({ where: whereClause });
      
      return res.status(200).json({
        success: true,
        leaderboard,
        pagination: {
          total,
          page: normalizedPage,
          limit: normalizedLimit,
          pages: Math.ceil(total / normalizedLimit)
        }
      });
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return sendGamificationError(res, 'Failed to get leaderboard');
    }
  },

  /**
   * Select one earned public rank title for profile display.
   */
  setSelectedRankTitle: async (req, res) => {
    try {
      const { userId } = req.params;
      const normalizedUserId = parsePositiveInteger(userId);

      if (!normalizedUserId) {
        return res.status(400).json({
          success: false,
          message: 'Valid user id is required'
        });
      }

      const user = await User.findByPk(normalizedUserId, {
        attributes: ['id', 'points', 'lifetimePointsEarned', 'level', 'selectedRankTitleKey']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      const progressionPoints = parseNonNegativeInteger(user.lifetimePointsEarned, 0);

      const requestedKey = req.body?.rankTitleKey ?? req.body?.selectedRankTitleKey;
      const validation = validateSelectedRankTitleKey(requestedKey, {
        points: progressionPoints,
        level: user.level
      });

      if (!validation.ok) {
        return res.status(validation.status).json({
          success: false,
          message: validation.message,
          rankTitleDisplay: validation.rankTitleDisplay || null
        });
      }

      await user.update({ selectedRankTitleKey: validation.rankTitleKey });

      const rankTitlePayload = buildRankTitleSelectionPayload({
        points: progressionPoints,
        level: user.level,
        selectedRankTitleKey: validation.rankTitleKey
      });

      return res.status(200).json({
        success: true,
        message: 'Rank title updated successfully',
        ...rankTitlePayload
      });
    } catch (error) {
      console.error('Error updating selected rank title:', error);
      return sendGamificationError(res, 'Failed to update rank title');
    }
  },

  /**
   * Award points to a user
   */
  awardPoints: async (req, res) => {
    const transaction = await db.transaction();

    try {
      const { userId } = req.params;
      const normalizedUserId = parsePositiveInteger(userId);
      const {
        points,
        transactionType = 'earn',
        source,
        sourceId,
        description,
        metadata
      } = req.body;

      if (!normalizedUserId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Valid user id is required'
        });
      }

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
        ['manual-award', normalizedUserId, source, sourceId || 'no-source-id', new Date().toISOString().slice(0, 10)].join(':');

      const ledgerResult = await GamificationPointsService.recordLedgerEntry({
        userId: normalizedUserId,
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
              userId: normalizedUserId,
              milestoneId: tierMilestone.id
            },
            transaction
          });

          if (!existingMilestone) {
            await UserMilestone.create({
              userId: normalizedUserId,
              milestoneId: tierMilestone.id,
              reachedAt: new Date(),
              bonusPointsAwarded: tierMilestone.bonusPoints
            }, { transaction });

            if (tierMilestone.bonusPoints > 0) {
              const bonusResult = await GamificationPointsService.recordLedgerEntry({
                userId: normalizedUserId,
                points: tierMilestone.bonusPoints,
                transactionType: 'bonus',
                source: 'milestone_reached',
                sourceId: tierMilestone.id,
                description: `Milestone Bonus: ${tierMilestone.name}`,
                metadata: { milestoneId: tierMilestone.id },
                awardedBy: req.user?.id,
                idempotencyKey: `milestone:tier:${normalizedUserId}:${tierMilestone.id}`
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
      if (error.statusCode && error.statusCode < 500) {
        const clientMessage = error.statusCode === 404 ? 'User not found' : 'Invalid point award request';
        return res.status(error.statusCode).json({ success: false, message: clientMessage });
      }
      return sendGamificationError(res, 'Failed to award points');
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
      return sendGamificationError(res, 'Failed to get achievements');
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
      return sendGamificationError(res, 'Failed to get achievement');
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
      return sendGamificationError(res, 'Failed to create achievement');
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
      return sendGamificationError(res, 'Failed to update achievement');
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
      return sendGamificationError(res, 'Failed to delete achievement');
    }
  },

  /**
   * Award an achievement to a user
   */
  awardAchievement: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const { userId, achievementId } = req.params;
      const normalizedUserId = parsePositiveInteger(userId);

      if (!normalizedUserId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Valid user id is required'
        });
      }
      
      // Check if user exists and serialize point writes for this user.
      const user = await User.findByPk(normalizedUserId, {
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
          userId: normalizedUserId,
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
            pointsAwarded: getAchievementPointValue(achievement)
          }, { transaction });
        }
      } else {
        // Create new user achievement record. Same-user awards serialize on the Users row
        // lock above, but any OTHER write path racing us now hits the DB unique on
        // (userId, achievementId) — added 2026-08-04 — so catch the constraint instead of
        // 500ing (Kimi review: the index alone converts double-award into a crash; this
        // catch converts the crash into the same "already has" answer the lock path gives).
        try {
          userAchievement = await UserAchievement.create({
            userId: normalizedUserId,
            achievementId,
            isCompleted: true,
            progress: 100,
            earnedAt: new Date(),
            pointsAwarded: getAchievementPointValue(achievement)
          }, { transaction });
        } catch (createErr) {
          if (createErr?.name === 'SequelizeUniqueConstraintError') {
            await transaction.rollback();
            return res.status(409).json({
              success: false,
              message: 'User already has this achievement'
            });
          }
          throw createErr;
        }
      }
      
      // Award points to user
      const achievementPoints = getAchievementPointValue(achievement);
      const ledgerResult = await GamificationPointsService.recordLedgerEntry({
        userId: normalizedUserId,
        points: achievementPoints,
        transactionType: 'earn',
        source: 'achievement_earned',
        sourceId: null,
        description: `Achievement Earned: ${achievement.name}`,
        metadata: { achievementId: achievement.id },
        awardedBy: req.user?.id,
        idempotencyKey: `achievement:${normalizedUserId}:${achievement.id}`
      }, transaction);
      
      // Commit the transaction
      await transaction.commit();

      const badgesEarned = await checkBadgesForGamificationEvent({
        userId: normalizedUserId,
        type: 'achievement_earned',
        activityData: buildAchievementBadgeActivity(achievement, ledgerResult)
      });
      
      return res.status(200).json({
        success: true,
        message: 'Achievement awarded successfully',
        userAchievement,
        pointsAwarded: ledgerResult.pointsAwarded,
        newBalance: ledgerResult.newBalance,
        badgesEarned
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error awarding achievement:', error);
      return sendGamificationError(res, 'Failed to award achievement');
    }
  },

  /**
   * Update user achievement progress
   */
  updateAchievementProgress: async (req, res) => {
    const { userId, achievementId } = req.params;
    const { progress } = req.body;
    const normalizedUserId = parsePositiveInteger(userId);
    const normalizedProgress = parseBoundedNumber(progress, 0, 100);

    if (!normalizedUserId) {
      return res.status(400).json({
        success: false,
        message: 'Valid user id is required'
      });
    }

    if (normalizedProgress === null) {
      return res.status(400).json({
        success: false,
        message: 'Progress must be a number from 0 to 100'
      });
    }

    const transaction = await db.transaction();
    let completedAchievement = null;
    let completedLedgerResult = null;

    try {
      const user = await User.findByPk(normalizedUserId, {
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

      let userAchievement = await UserAchievement.findOne({
        attributes: SAFE_USER_ACHIEVEMENT_ATTRS,
        where: {
          userId: normalizedUserId,
          achievementId
        },
        include: [{
          model: Achievement,
          as: 'achievement'
        }],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!userAchievement) {
        const achievement = await Achievement.findByPk(achievementId, { transaction });

        if (!achievement) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: 'Achievement not found'
          });
        }

        userAchievement = await UserAchievement.create({
          userId: normalizedUserId,
          achievementId,
          progress: normalizedProgress,
          isCompleted: normalizedProgress >= 100,
          earnedAt: normalizedProgress >= 100 ? new Date() : null
        }, { transaction });

        if (normalizedProgress >= 100) {
          const achievementPoints = getAchievementPointValue(achievement);
          completedLedgerResult = await GamificationPointsService.recordLedgerEntry({
            userId: normalizedUserId,
            points: achievementPoints,
            transactionType: 'earn',
            source: 'achievement_earned',
            sourceId: null,
            description: `Achievement Earned: ${achievement.name}`,
            metadata: { achievementId: achievement.id },
            awardedBy: req.user?.id,
            idempotencyKey: `achievement:${normalizedUserId}:${achievement.id}`
          }, transaction);
          completedAchievement = achievement;

          await userAchievement.update({ pointsAwarded: completedLedgerResult.pointsAwarded }, { transaction });
        }
      } else if (!userAchievement.isCompleted) {
        const newProgress = normalizedProgress;
        const wasCompleted = userAchievement.progress < 100 && newProgress >= 100;

        await userAchievement.update({
          progress: newProgress,
          isCompleted: newProgress >= 100,
          earnedAt: newProgress >= 100 ? new Date() : userAchievement.earnedAt
        }, { transaction });

        if (wasCompleted && userAchievement.achievement) {
          const achievementPoints = getAchievementPointValue(userAchievement.achievement);
          completedLedgerResult = await GamificationPointsService.recordLedgerEntry({
            userId: normalizedUserId,
            points: achievementPoints,
            transactionType: 'earn',
            source: 'achievement_earned',
            sourceId: null,
            description: `Achievement Earned: ${userAchievement.achievement.name}`,
            metadata: { achievementId: userAchievement.achievement.id },
            awardedBy: req.user?.id,
            idempotencyKey: `achievement:${normalizedUserId}:${userAchievement.achievement.id}`
          }, transaction);
          completedAchievement = userAchievement.achievement;

          await userAchievement.update({ pointsAwarded: completedLedgerResult.pointsAwarded }, { transaction });
        }
      }

      await transaction.commit();

      const badgesEarned = completedAchievement
        ? await checkBadgesForGamificationEvent({
          userId: normalizedUserId,
          type: 'achievement_earned',
          activityData: buildAchievementBadgeActivity(completedAchievement, completedLedgerResult)
        })
        : [];

      return res.status(200).json({
        success: true,
        message: 'Achievement progress updated',
        userAchievement,
        badgesEarned
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error updating achievement progress:', error);
      return sendGamificationError(res, 'Failed to update achievement progress');
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
      return sendGamificationError(res, 'Failed to get rewards');
    }
  },

  /**
   * Get a single reward
   */
  getReward: async (req, res) => {
    try {
      const { id } = req.params;
      const normalizedId = parsePositiveInteger(id);

      if (!normalizedId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reward ID'
        });
      }
      
      const reward = await Reward.findByPk(normalizedId);
      
      if (!reward) {
        return res.status(404).json({
          success: false,
          message: 'Reward not found'
        });
      }
      
      return res.status(200).json({ success: true, reward });
    } catch (error) {
      console.error('Error getting reward:', error);
      return sendGamificationError(res, 'Failed to get reward');
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

      const normalizedPointCost = pointCost === undefined ? 500 : parseNonNegativeInteger(pointCost);
      const normalizedStock = stock === undefined ? 10 : parseNonNegativeInteger(stock);
      const normalizedRewardType = rewardType === undefined ? 'other' : rewardType;

      if (normalizedPointCost === null || normalizedStock === null) {
        return res.status(400).json({
          success: false,
          message: 'Point cost and stock must be non-negative integers'
        });
      }

      if (!VALID_GAMIFICATION_TIERS.has(tier)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reward tier'
        });
      }

      if (!VALID_REWARD_TYPES.has(normalizedRewardType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reward type'
        });
      }
      
      const reward = await Reward.create({
        name,
        description,
        icon: icon || 'Gift',
        pointCost: normalizedPointCost,
        tier,
        stock: normalizedStock,
        isActive: isActive !== undefined ? isActive : true,
        imageUrl,
        rewardType: normalizedRewardType,
        expiresAt: expiresAt || null
      });
      
      return res.status(201).json({
        success: true,
        message: 'Reward created successfully',
        reward
      });
    } catch (error) {
      console.error('Error creating reward:', error);
      return sendGamificationError(res, 'Failed to create reward');
    }
  },

  /**
   * Update a reward
   */
  updateReward: async (req, res) => {
    try {
      const { id } = req.params;
      const normalizedId = parsePositiveInteger(id);
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

      if (!normalizedId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reward ID'
        });
      }
      
      const reward = await Reward.findByPk(normalizedId);
      
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
      if (pointCost !== undefined) {
        const normalizedPointCost = parseNonNegativeInteger(pointCost);
        if (normalizedPointCost === null) {
          return res.status(400).json({
            success: false,
            message: 'Point cost must be a non-negative integer'
          });
        }
        updatedFields.pointCost = normalizedPointCost;
      }
      if (tier !== undefined) {
        if (!VALID_GAMIFICATION_TIERS.has(tier)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid reward tier'
          });
        }
        updatedFields.tier = tier;
      }
      if (stock !== undefined) {
        const normalizedStock = parseNonNegativeInteger(stock);
        if (normalizedStock === null) {
          return res.status(400).json({
            success: false,
            message: 'Stock must be a non-negative integer'
          });
        }
        updatedFields.stock = normalizedStock;
      }
      if (isActive !== undefined) updatedFields.isActive = isActive;
      if (imageUrl !== undefined) updatedFields.imageUrl = imageUrl;
      if (rewardType !== undefined) {
        if (!VALID_REWARD_TYPES.has(rewardType)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid reward type'
          });
        }
        updatedFields.rewardType = rewardType;
      }
      if (expiresAt !== undefined) updatedFields.expiresAt = expiresAt;
      
      await reward.update(updatedFields);
      
      return res.status(200).json({
        success: true,
        message: 'Reward updated successfully',
        reward
      });
    } catch (error) {
      console.error('Error updating reward:', error);
      return sendGamificationError(res, 'Failed to update reward');
    }
  },

  /**
   * Delete a reward
   */
  deleteReward: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const { id } = req.params;
      const normalizedId = parsePositiveInteger(id);

      if (!normalizedId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid reward ID'
        });
      }
      
      const reward = await Reward.findByPk(normalizedId, { transaction });
      
      if (!reward) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Reward not found'
        });
      }
      
      // Check if reward has been redeemed
      const redemptionCount = await UserReward.count({
        where: { rewardId: normalizedId },
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
      return sendGamificationError(res, 'Failed to delete reward');
    }
  },

  /**
   * Redeem a reward
   */
  redeemReward: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const { userId, rewardId } = req.params;
      const normalizedUserId = parsePositiveInteger(userId);
      const normalizedRewardId = parsePositiveInteger(rewardId);

      if (!normalizedUserId || !normalizedRewardId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid user or reward ID'
        });
      }
      
      // Check if user exists
      const user = await User.findByPk(normalizedUserId, {
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
      
      // Check if reward exists and is active
      const reward = await Reward.findOne({
        where: {
          id: normalizedRewardId,
          isActive: true
        },
        transaction,
        lock: transaction.LOCK.UPDATE
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
      
      const rewardPointCost = parseNonNegativeInteger(reward.pointCost);
      if (rewardPointCost === null) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Reward configuration is invalid'
        });
      }

      // Check if user has enough points
      if (user.points < rewardPointCost) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Insufficient points to redeem this reward'
        });
      }
      
      // Create user reward record
      const userReward = await UserReward.create({
        userId: normalizedUserId,
        rewardId: normalizedRewardId,
        redeemedAt: new Date(),
        status: 'pending',
        pointsCost: rewardPointCost,
        expiresAt: reward.expiresAt
      }, { transaction });
      
      if (rewardPointCost > 0) {
        await GamificationPointsService.recordLedgerEntry({
          userId: normalizedUserId,
          points: rewardPointCost,
          transactionType: 'spend',
          source: 'reward_redemption',
          sourceId: reward.id,
          description: `Reward Redeemed: ${reward.name}`,
          metadata: { rewardId: reward.id, userRewardId: userReward.id },
          awardedBy: req.user?.id ?? null,
          idempotencyKey: `reward:${normalizedUserId}:${reward.id}:${userReward.id}`,
          maxPoints: Number.MAX_SAFE_INTEGER
        }, transaction);
      }
      
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
      return sendGamificationError(res, 'Failed to redeem reward');
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
      return sendGamificationError(res, 'Failed to get milestones');
    }
  },

  /**
   * Get a single milestone
   */
  getMilestone: async (req, res) => {
    try {
      const { id } = req.params;
      const normalizedId = parsePositiveInteger(id);

      if (!normalizedId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid milestone ID'
        });
      }
      
      const milestone = await Milestone.findByPk(normalizedId);
      
      if (!milestone) {
        return res.status(404).json({
          success: false,
          message: 'Milestone not found'
        });
      }
      
      return res.status(200).json({ success: true, milestone });
    } catch (error) {
      console.error('Error getting milestone:', error);
      return sendGamificationError(res, 'Failed to get milestone');
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
      
      if (!name || !description || targetPoints === undefined || !tier) {
        return res.status(400).json({
          success: false,
          message: 'Name, description, targetPoints, and tier are required'
        });
      }

      const normalizedTargetPoints = parseNonNegativeInteger(targetPoints);
      const normalizedBonusPoints = bonusPoints === undefined ? 200 : parseNonNegativeInteger(bonusPoints);

      if (normalizedTargetPoints === null || normalizedBonusPoints === null) {
        return res.status(400).json({
          success: false,
          message: 'Target points and bonus points must be non-negative integers'
        });
      }

      if (!VALID_GAMIFICATION_TIERS.has(tier)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid milestone tier'
        });
      }
      
      const milestone = await Milestone.create({
        name,
        description,
        targetPoints: normalizedTargetPoints,
        tier,
        bonusPoints: normalizedBonusPoints,
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
      return sendGamificationError(res, 'Failed to create milestone');
    }
  },

  /**
   * Update a milestone
   */
  updateMilestone: async (req, res) => {
    try {
      const { id } = req.params;
      const normalizedId = parsePositiveInteger(id);
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

      if (!normalizedId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid milestone ID'
        });
      }
      
      const milestone = await Milestone.findByPk(normalizedId);
      
      if (!milestone) {
        return res.status(404).json({
          success: false,
          message: 'Milestone not found'
        });
      }
      
      const updatedFields = {};
      
      if (name !== undefined) updatedFields.name = name;
      if (description !== undefined) updatedFields.description = description;
      if (targetPoints !== undefined) {
        const normalizedTargetPoints = parseNonNegativeInteger(targetPoints);
        if (normalizedTargetPoints === null) {
          return res.status(400).json({
            success: false,
            message: 'Target points must be a non-negative integer'
          });
        }
        updatedFields.targetPoints = normalizedTargetPoints;
      }
      if (tier !== undefined) {
        if (!VALID_GAMIFICATION_TIERS.has(tier)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid milestone tier'
          });
        }
        updatedFields.tier = tier;
      }
      if (bonusPoints !== undefined) {
        const normalizedBonusPoints = parseNonNegativeInteger(bonusPoints);
        if (normalizedBonusPoints === null) {
          return res.status(400).json({
            success: false,
            message: 'Bonus points must be a non-negative integer'
          });
        }
        updatedFields.bonusPoints = normalizedBonusPoints;
      }
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
      return sendGamificationError(res, 'Failed to update milestone');
    }
  },

  /**
   * Delete a milestone
   */
  deleteMilestone: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const { id } = req.params;
      const normalizedId = parsePositiveInteger(id);

      if (!normalizedId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid milestone ID'
        });
      }
      
      const milestone = await Milestone.findByPk(normalizedId, { transaction });
      
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
      return sendGamificationError(res, 'Failed to delete milestone');
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
      const normalizedUserId = parsePositiveInteger(userId);

      if (!normalizedUserId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
      }
      
      // Check if user exists and serialize balance changes for milestone bonuses.
      const user = await User.findByPk(normalizedUserId, {
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
      
      // Get all milestones the user hasn't reached yet
      const unreachedMilestones = await Milestone.findAll({
        where: {
          targetPoints: { [Op.lte]: user.points },
          isActive: true
        },
        include: [{
          model: UserMilestone,
          as: 'userMilestones',
          where: { userId: normalizedUserId },
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
      
      // Award bonus points once before writing milestone rows so idempotency can
      // stop concurrent duplicate milestone awards.
      let awardedMilestones = [];
      const milestoneIds = newMilestones.map(milestone => milestone.id);
      const milestoneKey = milestoneIds.slice().sort().join(',');
      const intendedBonusPoints = newMilestones.reduce(
        (sum, milestone) => sum + parseNonNegativeInteger(milestone.bonusPoints, 0),
        0
      );
      let finalBalance = user.points;
      let totalBonusPoints = 0;
      let shouldCreateMilestoneRows = true;

      if (intendedBonusPoints > 0) {
        const ledgerResult = await GamificationPointsService.recordLedgerEntry({
          userId: normalizedUserId,
          points: intendedBonusPoints,
          transactionType: 'bonus',
          source: 'milestone_reached',
          sourceId: null,
          description: `Milestone Bonuses: ${newMilestones.map(m => m.name).join(', ')}`,
          metadata: { milestoneIds },
          awardedBy: req.user?.id ?? null,
          idempotencyKey: `milestone:check:${normalizedUserId}:${milestoneKey}`,
          maxPoints: Number.MAX_SAFE_INTEGER
        }, transaction);

        totalBonusPoints = ledgerResult.pointsAwarded;
        finalBalance = ledgerResult.newBalance ?? user.points;
        shouldCreateMilestoneRows = !ledgerResult.duplicate;
      }

      if (shouldCreateMilestoneRows) {
        awardedMilestones = await Promise.all(newMilestones.map(milestone => UserMilestone.create({
          userId: normalizedUserId,
          milestoneId: milestone.id,
          reachedAt: new Date(),
          bonusPointsAwarded: parseNonNegativeInteger(milestone.bonusPoints, 0)
        }, { transaction })));
      }
      
      // Commit the transaction
      await transaction.commit();
      
      return res.status(200).json({
        success: true,
        message: 'Milestones awarded successfully',
        awardedMilestones,
        totalBonusPoints,
        newBalance: finalBalance
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error awarding milestones:', error);
      return sendGamificationError(res, 'Failed to award milestones');
    }
  },

  /**
   * Get user transaction history
   */
  getUserTransactions: async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit: rawLimit = 20, type, source } = req.query;
      const normalizedUserId = parsePositiveInteger(userId);
      const normalizedPage = parsePositiveInteger(page, 1);
      const normalizedLimit = parseBoundedPositiveInteger(rawLimit, 20, 100);

      if (!normalizedUserId) {
        return res.status(400).json({
          success: false,
          message: 'Valid user id is required'
        });
      }
      
      const whereClause = { userId: normalizedUserId };
      
      if (type) {
        whereClause.transactionType = type;
      }
      
      if (source) {
        whereClause.source = source;
      }
      
      const offset = (normalizedPage - 1) * normalizedLimit;
      
      const transactions = await PointTransaction.findAll({
        where: whereClause,
        attributes: POINT_TRANSACTION_PUBLIC_ATTRIBUTES,
        order: [['createdAt', 'DESC']],
        limit: normalizedLimit,
        offset
      });
      
      const total = await PointTransaction.count({ where: whereClause });
      
      return res.status(200).json({
        success: true,
        transactions,
        pagination: {
          total,
          page: normalizedPage,
          limit: normalizedLimit,
          pages: Math.ceil(total / normalizedLimit)
        }
      });
    } catch (error) {
      console.error('Error getting user transactions:', error);
      return sendGamificationError(res, 'Failed to get user transactions');
    }
  },

  /**
   * Record workout completion and award points
   */
  recordWorkoutCompletion: async (req, res) => {
    const transaction = await db.transaction();
    let transactionCommitted = false;
    
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
      const normalizedUserId = parsePositiveInteger(targetUserId);
      const normalizedDuration = duration === undefined ? 0 : parseBoundedNumber(duration, 0, 1440);
      // Clamp exercisesCompleted to a sane max — it multiplies into the point
      // award with no per-award cap, so an unbounded client value minted a huge
      // award. Keep the non-negative-integer contract, then cap at 100.
      const normalizedExercisesCompleted = exercisesCompleted === undefined
        ? 0
        : Math.min(parseNonNegativeInteger(exercisesCompleted, 0), 100);
      const normalizedCaloriesBurned = caloriesBurned === undefined ? undefined : parseNonNegativeInteger(caloriesBurned);
      const normalizedNotes = normalizeBoundedString(notes, 500);

      if (!normalizedUserId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      if (
        normalizedDuration === null ||
        normalizedExercisesCompleted === null ||
        normalizedCaloriesBurned === null
      ) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Workout duration, exercise count, and calories must be valid non-negative numbers'
        });
      }

      // Verify user exists (with row-level lock for concurrency safety)
      const user = await User.findByPk(normalizedUserId, {
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
      let pointsToAward = parseNonNegativeInteger(settings?.pointsPerWorkout, 50);
      const normalizedPointsPerExercise = parseNonNegativeInteger(settings?.pointsPerExercise, 0);
      
      // Bonus points for exercises completed
      if (normalizedExercisesCompleted > 0 && normalizedPointsPerExercise > 0) {
        pointsToAward += normalizedExercisesCompleted * normalizedPointsPerExercise;
      }
      
      // Bonus points for duration (1 point per minute over 30 minutes)
      if (normalizedDuration > 30) {
        pointsToAward += Math.floor((normalizedDuration - 30) / 5); // 1 point per 5 extra minutes
      }
      
      // Apply multiplier if enabled
      const normalizedPointsMultiplier = parseBoundedNumber(settings?.pointsMultiplier, 0, 5);
      if (normalizedPointsMultiplier !== null && normalizedPointsMultiplier > 0) {
        pointsToAward = Math.round(pointsToAward * normalizedPointsMultiplier);
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
        totalExercises: (user.totalExercises || 0) + normalizedExercisesCompleted,
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
            userId: normalizedUserId,
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
            userId: normalizedUserId,
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
      const baseWorkoutPoints = pointsToAward;
      const earnedStreakBonus = updatedStats.streakDays % 7 === 0 && settings?.pointsPerStreak
        ? settings.pointsPerStreak
        : 0;
      if (earnedStreakBonus > 0) {
        pointsToAward += earnedStreakBonus;
        updatedStats.points += earnedStreakBonus;
      }

      // Create main workout completion transaction
      let pointTransaction;
      const workoutCompletionKey = workoutId ?? today.toISOString().slice(0, 10);
      const workoutLedgerResult = await GamificationPointsService.recordLedgerEntry({
        userId: normalizedUserId,
        points: baseWorkoutPoints,
        transactionType: 'earn',
        source: 'workout_completion',
        sourceId: workoutId,
        description: `Workout completed: ${normalizedDuration || 'Unknown'} minutes, ${normalizedExercisesCompleted} exercises`,
        metadata: {
          workoutId,
          duration: normalizedDuration,
          exercisesCompleted: normalizedExercisesCompleted,
          caloriesBurned: normalizedCaloriesBurned,
          notes: normalizedNotes
        },
        awardedBy: req.user?.id,
        idempotencyKey: `workout:${normalizedUserId}:${workoutCompletionKey}`,
        maxPoints: Number.MAX_SAFE_INTEGER
      }, transaction);
      pointTransaction = workoutLedgerResult.pointTransaction;
      updatedStats.points = workoutLedgerResult.newBalance ?? (user.points + baseWorkoutPoints);

      // recordLedgerEntry is the single authority for level/tier (derived from lifetime XP).
      // Track the latest ledger result so level/tier are NEVER re-derived from the spendable balance.
      let latestLedger = workoutLedgerResult;
      if (earnedStreakBonus > 0) {
        const streakLedgerResult = await GamificationPointsService.recordLedgerEntry({
          userId: normalizedUserId,
          points: earnedStreakBonus,
          transactionType: 'bonus',
          source: 'streak_bonus',
          sourceId: null,
          description: `${updatedStats.streakDays}-day streak bonus`,
          metadata: { streakDays: updatedStats.streakDays },
          awardedBy: req.user?.id,
          idempotencyKey: `streak:${normalizedUserId}:${updatedStats.streakDays}:${today.toISOString().slice(0, 10)}`,
          maxPoints: Number.MAX_SAFE_INTEGER
        }, transaction);
        updatedStats.points = streakLedgerResult.newBalance ?? updatedStats.points;
        latestLedger = streakLedgerResult;
      }

      // Level/tier come from the ledger authority (lifetime XP), NOT the spendable balance,
      // so a spend/redeem recorded elsewhere never retro-lowers the level on the next award.
      updatedStats.level = latestLedger.newLevel ?? updatedStats.level;
      updatedStats.tier = latestLedger.newTier ?? updatedStats.tier;
      
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
          where: { userId: normalizedUserId },
          required: false
        }],
        transaction
      });
      
      // Filter for milestones not yet awarded
      const unAwardedMilestones = newMilestones.filter(
        milestone => milestone.userMilestones.length === 0
      );
      
      let totalMilestoneBonus = 0;
      let awardedMilestones = [];
      let finalBalance = updatedStats.points;
      const workoutMilestoneIds = unAwardedMilestones.map(milestone => milestone.id);
      const workoutMilestoneKey = workoutMilestoneIds.slice().sort().join(',');
      const intendedWorkoutMilestoneBonus = unAwardedMilestones.reduce(
        (sum, milestone) => sum + parseNonNegativeInteger(milestone.bonusPoints, 0),
        0
      );
      let shouldCreateWorkoutMilestones = true;

      if (intendedWorkoutMilestoneBonus > 0) {
        const ledgerResult = await GamificationPointsService.recordLedgerEntry({
          userId: normalizedUserId,
          points: intendedWorkoutMilestoneBonus,
          transactionType: 'bonus',
          source: 'milestone_reached',
          sourceId: null,
          description: `Workout milestone bonuses: ${unAwardedMilestones.map(m => m.name).join(', ')}`,
          metadata: { milestoneIds: workoutMilestoneIds, workoutId },
          awardedBy: req.user?.id ?? null,
          idempotencyKey: `milestone:workout:${normalizedUserId}:${workoutMilestoneKey}`,
          maxPoints: Number.MAX_SAFE_INTEGER
        }, transaction);

        totalMilestoneBonus = ledgerResult.pointsAwarded;
        finalBalance = ledgerResult.newBalance ?? updatedStats.points;
        shouldCreateWorkoutMilestones = !ledgerResult.duplicate;
      }

      if (shouldCreateWorkoutMilestones) {
        await Promise.all(unAwardedMilestones.map(milestone => UserMilestone.create({
          userId: normalizedUserId,
          milestoneId: milestone.id,
          reachedAt: new Date(),
          bonusPointsAwarded: parseNonNegativeInteger(milestone.bonusPoints, 0)
        }, { transaction })));
        awardedMilestones = unAwardedMilestones;
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
        if (!milestoneType && normalizedDuration >= 60) {
          const priorLongSession = await WorkoutSession.count({
            where: {
              userId: normalizedUserId,
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
      transactionCommitted = true;

      const badgeActivity = {
        workoutId,
        duration: normalizedDuration,
        exercisesCompleted: normalizedExercisesCompleted,
        completedExercises: normalizedExercisesCompleted,
        exerciseCount: normalizedExercisesCompleted,
        count: normalizedExercisesCompleted,
        caloriesBurned: normalizedCaloriesBurned,
        streakDays: updatedStats.streakDays,
        currentStreak: updatedStats.streakDays,
        totalWorkouts: updatedStats.totalWorkouts,
        totalExercises: updatedStats.totalExercises,
        milestoneIds: workoutMilestoneIds,
        milestoneNames: awardedMilestones.map((milestone) => milestone.name),
        points: finalBalance,
        totalPoints: finalBalance,
        completed: true
      };
      const badgeChecks = [
        checkBadgesForGamificationEvent({
          userId: normalizedUserId,
          type: 'workout_completion',
          activityData: badgeActivity
        }),
        checkBadgesForGamificationEvent({
          userId: normalizedUserId,
          type: 'streak_update',
          activityData: badgeActivity
        })
      ];
      if (awardedMilestones.length > 0) {
        badgeChecks.push(checkBadgesForGamificationEvent({
          userId: normalizedUserId,
          type: 'milestone_reached',
          activityData: badgeActivity
        }));
      }
      const badgesEarned = (await Promise.all(badgeChecks)).flat();
      
      return res.status(200).json({
        success: true,
        message: 'Workout completion recorded successfully',
        pointsAwarded: pointsToAward + totalMilestoneBonus,
        newBalance: finalBalance,
        awardedMilestones,
        badgesEarned,
        streakDays: updatedStats.streakDays,
        totalWorkouts: updatedStats.totalWorkouts
      });
    } catch (error) {
      if (!transactionCommitted) await transaction.rollback();
      console.error('Error recording workout completion:', error);
      return sendGamificationError(res, 'Failed to record workout completion');
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
      return sendGamificationError(res, 'Failed to mark notification as read');
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
        console.error('Error ensuring achievement tier column:', colErr);
        steps.push('tier column check/add failed; see server logs');
      }

      // Step 3: Run the Swan-themed reseed seeder (wipes + reseeds)
      try {
        const { createRequire } = await import('module');
        const { fileURLToPath } = await import('url');
        const pathMod = await import('path');

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = pathMod.default.dirname(__filename);
        const seederPath = pathMod.default.resolve(__dirname, '..', 'seeders', '20260310000001-reseed-swan-achievements.cjs');
        steps.push('Swan-themed seeder located');

        const require = createRequire(import.meta.url);
        const seeder = require(seederPath);

        const queryInterface = db.getQueryInterface();
        const SequelizeMod = await import('sequelize');
        await seeder.up(queryInterface, SequelizeMod.default || SequelizeMod);

        const finalCount = await Achievement.count();
        steps.push(`Swan reseed complete: ${finalCount} achievements (was ${currentCount})`);
        return res.json({ success: true, count: finalCount, steps });
      } catch (seederErr) {
        console.error('Error running achievement seeder:', seederErr);
        steps.push('Seeder failed; see server logs');
        return res.status(500).json({
          success: false,
          message: 'Failed to seed achievements',
          steps,
          error: INTERNAL_ERROR
        });
      }

    } catch (error) {
      console.error('Error preparing achievement seeder:', error);
      return sendGamificationError(res, 'Failed to seed achievements');
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
      const userId = parsePositiveInteger(req.params.userId ?? req.user?.id);
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
            available: parseNonNegativeInteger(gamificationRecord.streakFreezes, 0),
            max: 3,
            used: parseNonNegativeInteger(gamificationRecord.streakFreezesUsed, 0),
            lastEarned: gamificationRecord.lastStreakFreezeEarned,
            lastUsed: gamificationRecord.lastStreakFreezeUsed,
            currentStreak: parseNonNegativeInteger(gamificationRecord.streakCount, 0)
          }
        });
    } catch (error) {
      console.error('getStreakFreezeStatus error:', error.message);
      return sendGamificationError(res, 'Failed to get streak freeze status');
    }
  },

  /**
   * POST /api/gamification/streak-freeze/use
   * Consumes one streak freeze to protect the user's streak.
   */
  useStreakFreeze: async (req, res) => {
    let transaction;
    try {
      const userId = parsePositiveInteger(req.user?.id);
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID required' });
      }

      transaction = await db.transaction();

      const gamificationRecord = await Gamification.findOne({
        where: { userId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!gamificationRecord) {
        await transaction.rollback();
        transaction = null;
        return res.status(404).json({ success: false, error: 'No gamification record found' });
      }

      const currentFreezes = parseNonNegativeInteger(gamificationRecord.streakFreezes, 0);
      if (currentFreezes <= 0) {
        await transaction.rollback();
        transaction = null;
        return res.json({
          success: false,
          error: 'No streak freezes available',
          data: { available: 0, streakLost: true }
        });
      }

      await gamificationRecord.update({
        streakFreezes: currentFreezes - 1,
        streakFreezesUsed: parseNonNegativeInteger(gamificationRecord.streakFreezesUsed, 0) + 1,
        lastStreakFreezeUsed: new Date()
      }, { transaction });

      await transaction.commit();
      transaction = null;

      return res.json({
        success: true,
        message: 'Streak freeze used. Your streak is safe.',
        data: {
          remaining: currentFreezes - 1,
          max: 3,
          streakPreserved: parseNonNegativeInteger(gamificationRecord.streakCount, 0)
        }
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('useStreakFreeze error:', error.message);
      return sendGamificationError(res, 'Failed to use streak freeze');
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
      const userId = parsePositiveInteger(req.params.userId);
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
        attributes: ['streakCount', 'longestStreak', 'level', 'currentTier']
      });
      const latestPointBalance = await PointTransaction.findOne({
        where: { userId },
        attributes: ['balance'],
        order: [['createdAt', 'DESC'], ['id', 'DESC']]
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
            totalXP: latestPointBalance?.balance || 0,
          },
          weekStarting: thisWeekStart.toISOString(),
        }
      });
    } catch (error) {
      console.error('getWeeklyRecap error:', error.message);
      return sendGamificationError(res, 'Failed to get weekly recap');
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
      const normalizedLimit = parseBoundedPositiveInteger(rawLimit, 20, 50);

      const whereClause = {};
      const normalizedSince = parseOptionalIsoDate(since);
      if (since !== undefined && !normalizedSince) {
        return res.status(400).json({
          success: false,
          message: 'Valid since timestamp is required'
        });
      }

      if (normalizedSince) {
        whereClause.createdAt = { [Op.gte]: normalizedSince };
      }

      // Only show earn/bonus transactions (not spends/expires)
      whereClause.transactionType = { [Op.in]: ['earn', 'bonus'] };

      const feed = await PointTransaction.findAll({
        where: whereClause,
        attributes: POINT_TRANSACTION_FEED_ATTRIBUTES,
        order: [['createdAt', 'DESC']],
        limit: normalizedLimit,
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
      return sendGamificationError(res, 'Failed to get activity feed');
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
      const userId = parsePositiveInteger(req.params.userId ?? req.user?.id);
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
      return sendGamificationError(res, 'Failed to get comeback challenge');
    }
  },

  /**
   * POST /api/gamification/comeback-challenge/accept
   * User accepts a comeback challenge.
   */
  acceptComebackChallenge: async (req, res) => {
    try {
      const userId = parsePositiveInteger(req.user?.id);
      const challengeId = parsePositiveInteger(req.body.challengeId);

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
      return sendGamificationError(res, 'Failed to accept comeback challenge');
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
    let transaction;
    try {
      const userId = parsePositiveInteger(req.params.userId);
      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });

      const { default: AegisHudService } = await import('../services/gamification/AegisHudService.mjs');
      const { default: Gamification } = await import('../models/Gamification.mjs');

      transaction = await db.transaction();
      let record = await Gamification.findOne({
        where: { userId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      // Auto-create gamification record if none exists
      if (!record) {
        record = await Gamification.create({ userId }, { transaction });
      }

      const hudData = await AegisHudService.getNeeds(record, { transaction });
      await transaction.commit();
      transaction = null;
      return res.json({ success: true, data: hudData });
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('getAegisHud error:', error.message);
      return sendGamificationError(res, 'Failed to get Aegis HUD');
    }
  },

  /**
   * POST /api/gamification/users/:userId/aegis-hud/replenish
   * Manually replenish needs from an action (called after gamification awards).
   * Body: { actionType: 'workout_completed' | 'social_post' | etc. }
   */
  replenishAegisHud: async (req, res) => {
    let transaction;
    try {
      const userId = parsePositiveInteger(req.params.userId);
      const { actionType } = req.body ?? {};
      const requestedActionType = normalizeBoundedString(actionType, 80);

      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });
      if (!requestedActionType) return res.status(400).json({ success: false, error: 'actionType required' });

      const { default: AegisHudService } = await import('../services/gamification/AegisHudService.mjs');
      const { default: Gamification } = await import('../models/Gamification.mjs');

      transaction = await db.transaction();
      let record = await Gamification.findOne({
        where: { userId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!record) record = await Gamification.create({ userId }, { transaction });

      const hudData = await AegisHudService.replenishFromAction(record, requestedActionType, { transaction });
      if (!hudData) {
        await transaction.rollback();
        transaction = null;
        return res.status(400).json({ success: false, error: 'Unknown action type' });
      }

      await transaction.commit();
      transaction = null;
      return res.json({ success: true, data: hudData });
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('replenishAegisHud error:', error.message);
      return sendGamificationError(res, 'Failed to replenish Aegis HUD');
    }
  },

  /**
   * PUT /api/gamification/users/:userId/aegis-hud/:needKey
   * Admin override: set a specific need value.
   * Body: { value: 0-100 }
   */
  setAegisHudNeed: async (req, res) => {
    let transaction;
    try {
      const userId = parsePositiveInteger(req.params.userId);
      const { needKey } = req.params;
      const { value } = req.body ?? {};
      const normalizedValue = parseBoundedNumber(value, 0, 100);

      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });
      if (normalizedValue === null) return res.status(400).json({ success: false, error: 'value must be a number from 0 to 100' });

      const { default: AegisHudService } = await import('../services/gamification/AegisHudService.mjs');
      const { default: Gamification } = await import('../models/Gamification.mjs');

      transaction = await db.transaction();
      let record = await Gamification.findOne({
        where: { userId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!record) record = await Gamification.create({ userId }, { transaction });

      const hudData = await AegisHudService.setNeed(record, needKey, normalizedValue, { transaction });
      await transaction.commit();
      transaction = null;
      return res.json({ success: true, data: hudData });
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('setAegisHudNeed error:', error.message);
      return sendGamificationError(res, 'Failed to set Aegis HUD need');
    }
  },

  /**
   * GET /api/gamification/aegis-hud/config
   * Returns the needs configuration (labels, icons, colors, decay rates).
   * Public endpoint for frontend to render the HUD correctly.
   */
  // ─────────────────────────────────────────────────────────────
  // SECTION: Vault Decryption - Cosmetic Reward Reveal (V2)
  // PURPOSE: Cosmetic-only vault drops after qualifying actions
  // ─────────────────────────────────────────────────────────────

  /**
   * POST /api/gamification/users/:userId/vault/roll
   * Roll for a loot drop after a qualifying action.
   * Body: { actionType: 'workout_completed' | 'personal_record' | etc. }
   */
  rollVaultDrop: async (req, res) => {
    let transaction;
    try {
      const userId = parsePositiveInteger(req.params.userId);
      const { actionType } = req.body ?? {};
      const requestedActionType = normalizeBoundedString(actionType, 80);

      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });
      if (!requestedActionType) return res.status(400).json({ success: false, error: 'actionType required' });

      const { default: VaultDecryptionService, DROP_TRIGGERS } = await import('../services/gamification/VaultDecryptionService.mjs');
      const { default: Gamification } = await import('../models/Gamification.mjs');

      if (!DROP_TRIGGERS[requestedActionType]) {
        return res.status(400).json({ success: false, error: 'Unknown action type' });
      }

      transaction = await db.transaction();
      let record = await Gamification.findOne({
        where: { userId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!record) record = await Gamification.create({ userId }, { transaction });

      const idempotencyKey = `vault_${userId}_${requestedActionType}_${new Date().toISOString().slice(0, 13)}`;
      const activityLog = Array.isArray(record.activityLog) ? record.activityLog : [];
      const existingDrop = activityLog.find((entry) =>
        entry?.type === 'vault_drop' && entry?.drop?.idempotencyKey === idempotencyKey
      );

      if (existingDrop) {
        await transaction.rollback();
        transaction = null;
        return res.json({
          success: true,
          data: {
            dropped: false,
            duplicate: true,
            message: 'Vault roll already processed for this action window'
          }
        });
      }

      const drop = VaultDecryptionService.rollForDrop(requestedActionType, userId);
      if (!drop) {
        await transaction.commit();
        transaction = null;
        return res.json({ success: true, data: { dropped: false, message: 'No drop this time' } });
      }

      Object.assign(drop, {
        xpBonus: 0,
        rewardMode: 'cosmetic_only'
      });

      await VaultDecryptionService.recordDrop(record, drop, { transaction });

      await transaction.commit();
      transaction = null;

      return res.json({
        success: true,
        data: {
          dropped: true,
          drop,
        },
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('rollVaultDrop error:', error.message);
      return sendGamificationError(res, 'Failed to roll vault drop');
    }
  },

  /**
   * GET /api/gamification/users/:userId/vault/inventory
   * Get user's loot drop history.
   */
  getVaultInventory: async (req, res) => {
    try {
      const userId = parsePositiveInteger(req.params.userId);
      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });

      const { default: VaultDecryptionService } = await import('../services/gamification/VaultDecryptionService.mjs');
      const { default: Gamification } = await import('../models/Gamification.mjs');

      const record = await Gamification.findOne({ where: { userId } });
      if (!record) return res.json({ success: true, data: { inventory: [] } });

      const inventory = await VaultDecryptionService.getUserInventory(record);
      return res.json({ success: true, data: { inventory } });
    } catch (error) {
      console.error('getVaultInventory error:', error.message);
      return sendGamificationError(res, 'Failed to get vault inventory');
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
      const userId = parsePositiveInteger(req.params.userId);
      const { category } = req.query;

      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });

      const { default: GhostModeService } = await import('../services/gamification/GhostModeService.mjs');
      const result = await GhostModeService.getGhost(userId, { category });

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('getGhost error:', error.message);
      return sendGamificationError(res, 'Failed to get ghost mode data');
    }
  },

  /**
   * POST /api/gamification/users/:userId/ghost/compare
   * Compare completed workout against ghost for cosmetic feedback.
   * Body: { ghostData, currentWorkoutData }
   */
  compareGhost: async (req, res) => {
    try {
      const userId = parsePositiveInteger(req.params.userId);
      const { ghostData, currentWorkoutData } = req.body;

      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });

      const { default: GhostModeService } = await import('../services/gamification/GhostModeService.mjs');
      const comparison = GhostModeService.compareWithGhost(ghostData, currentWorkoutData);

      comparison.rewardMode = 'cosmetic_only';
      comparison.trustStatus = 'client_submitted_comparison';
      comparison.bonusXP = 0;
      comparison.bonuses = Array.isArray(comparison.bonuses)
        ? comparison.bonuses.map((bonus) => ({ ...bonus, xp: 0 }))
        : [];

      return res.json({ success: true, data: comparison });
    } catch (error) {
      console.error('compareGhost error:', error.message);
      return sendGamificationError(res, 'Failed to compare ghost mode data');
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
    let transaction;
    try {
      const userId = parsePositiveInteger(req.params.userId);
      const { jobClass } = req.body ?? {};
      const validClasses = ['paladin', 'monk', 'ranger', 'white_mage', 'dark_knight'];

      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });
      if (!validClasses.includes(jobClass)) {
        return res.status(400).json({ success: false, error: `Invalid job class. Must be one of: ${validClasses.join(', ')}` });
      }

      const { default: Gamification } = await import('../models/Gamification.mjs');
      transaction = await db.transaction();
      let record = await Gamification.findOne({
        where: { userId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!record) record = await Gamification.create({ userId }, { transaction });

      await record.update({ jobClass }, { transaction });
      await transaction.commit();
      transaction = null;

      return res.json({
        success: true,
        message: `Job class set to ${jobClass}`,
        data: { jobClass },
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('setJobClass error:', error.message);
      return sendGamificationError(res, 'Failed to set job class');
    }
  },

  /**
   * GET /api/gamification/users/:userId/job-class
   * Get user's current job class.
   */
  getJobClass: async (req, res) => {
    try {
      const userId = parsePositiveInteger(req.params.userId);
      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });

      const { default: Gamification } = await import('../models/Gamification.mjs');
      const record = await Gamification.findOne({ where: { userId }, attributes: ['jobClass'] });

      return res.json({
        success: true,
        data: { jobClass: record?.jobClass || null },
      });
    } catch (error) {
      console.error('getJobClass error:', error.message);
      return sendGamificationError(res, 'Failed to get job class');
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
      const userId = parsePositiveInteger(req.params.userId);
      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });

      const { CompanionPetService } = await import('../services/gamification/CompanionPetService.mjs');
      const data = await CompanionPetService.getPetData(userId);
      return res.json({ success: true, data });
    } catch (error) {
      console.error('getPet error:', error.message);
      return sendGamificationError(res, 'Failed to get companion pet');
    }
  },

  adoptPet: async (req, res) => {
    try {
      const userId = parsePositiveInteger(req.params.userId);
      const { species, petName } = req.body;
      const sanitizedPetName = normalizeBoundedString(petName, 50);

      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });
      if (!sanitizedPetName) return res.status(400).json({ success: false, error: 'Pet name required' });

      const { CompanionPetService, PET_SPECIES } = await import('../services/gamification/CompanionPetService.mjs');
      if (!PET_SPECIES[species]) {
        return res.status(400).json({ success: false, error: 'Invalid pet species' });
      }

      const data = await CompanionPetService.adoptPet(userId, species, sanitizedPetName);
      return res.status(201).json({ success: true, data });
    } catch (error) {
      console.error('adoptPet error:', error.message);
      if (error.message.includes('already')) {
        return res.status(409).json({ success: false, error: 'Pet already exists' });
      }
      return sendGamificationError(res, 'Failed to adopt companion pet');
    }
  },

  interactWithPet: async (req, res) => {
    try {
      const userId = parsePositiveInteger(req.params.userId);
      const { interactionType } = req.body;
      const requestedInteraction = typeof interactionType === 'string' ? interactionType : 'pet';

      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });
      if (!VALID_PET_INTERACTIONS.has(requestedInteraction)) {
        return res.status(400).json({ success: false, error: 'Invalid interaction type' });
      }

      const { CompanionPetService } = await import('../services/gamification/CompanionPetService.mjs');
      const data = await CompanionPetService.interact(userId, requestedInteraction);
      return res.json({ success: true, data });
    } catch (error) {
      console.error('interactWithPet error:', error.message);
      return sendGamificationError(res, 'Failed to interact with companion pet');
    }
  },

  recordPetActivity: async (req, res) => {
    try {
      const userId = parsePositiveInteger(req.params.userId);
      const { activityType, amount } = req.body;
      const normalizedAmount = parseBoundedPositiveInteger(amount, 1, 100);

      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });
      if (typeof activityType !== 'string' || activityType.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'activityType required' });
      }

      const { CompanionPetService } = await import('../services/gamification/CompanionPetService.mjs');
      const data = await CompanionPetService.recordActivity(userId, activityType.trim(), normalizedAmount);
      return res.json({ success: true, data });
    } catch (error) {
      console.error('recordPetActivity error:', error.message);
      return sendGamificationError(res, 'Failed to record companion pet activity');
    }
  },

  renamePet: async (req, res) => {
    try {
      const userId = parsePositiveInteger(req.params.userId);
      const { name } = req.body;
      const sanitizedName = normalizeBoundedString(name, 50);

      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });
      if (!sanitizedName) return res.status(400).json({ success: false, error: 'Pet name required' });

      const { CompanionPetService } = await import('../services/gamification/CompanionPetService.mjs');
      const data = await CompanionPetService.renamePet(userId, sanitizedName);
      return res.json({ success: true, data });
    } catch (error) {
      console.error('renamePet error:', error.message);
      return sendGamificationError(res, 'Failed to rename companion pet');
    }
  },

  releasePet: async (req, res) => {
    try {
      const userId = parsePositiveInteger(req.params.userId);
      if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });

      const { CompanionPetService } = await import('../services/gamification/CompanionPetService.mjs');
      const data = await CompanionPetService.releasePet(userId);
      return res.json({ success: true, data });
    } catch (error) {
      console.error('releasePet error:', error.message);
      if (error.message === 'No pet found') {
        return res.status(404).json({ success: false, error: 'Pet not found' });
      }
      return sendGamificationError(res, 'Failed to release companion pet');
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
