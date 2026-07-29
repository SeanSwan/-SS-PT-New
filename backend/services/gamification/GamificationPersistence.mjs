/**
 * ============================================================================
 * FILE: GamificationPersistence.mjs
 * PURPOSE: Data persistence layer for gamification (PostgreSQL + optional Redis)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-23
 * AI VILLAGE VALIDATED: 2026-03-23
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Manages all gamification data storage — user points,
 * achievements, streaks, leaderboards. Designed as Redis-first with PostgreSQL
 * fallback, but Redis is DISABLED in production (P0 fix). Most Redis methods
 * are stubs that fall through to PostgreSQL.
 *
 * HOW IT FITS IN THE APP:
 *   GamificationEngine → GamificationPersistence → PostgreSQL (sequelize)
 *                                                 → Redis (disabled in prod)
 *
 * KEY DECISIONS:
 * - Redis disabled in production (was causing crashes) — FORCE_REDIS=true to enable
 * - PostgreSQL-only architecture (MongoDB removed)
 * - Has its own achievement definitions (duplicates GamificationEngine — tech debt)
 * - calculateStatsFromDatabase() is a stub that returns zeroes (Phase 1 fix target)
 *
 * KNOWN ISSUES (Phase 1 Fix Targets):
 * - calculateStatsFromDatabase() returns hardcoded zeroes
 * - Many methods have Redis-only paths with no PostgreSQL fallback
 * - Achievement definitions here duplicate GamificationEngine definitions
 * - 967 lines — exceeds 300-line rule, needs decomposition in Phase 6
 *
 * ARCHITECTURE:
 * graph TD
 *   A[GamificationEngine] --> B[GamificationPersistence]
 *   B --> C{Redis Enabled?}
 *   C -->|Yes| D[Redis Cache]
 *   C -->|No| E[PostgreSQL Fallback]
 *   D --> E
 *   E --> F[Sequelize Models]
 *   F --> G[Gamification Model]
 *   F --> H[Achievement Model]
 *   F --> I[UserAchievement Model]
 */

// 🎯 P0 PRODUCTION FIX: Conditional Redis import to prevent crashes
// import Redis from 'ioredis'; // REMOVED - causing production crashes
// PostgreSQL-only architecture - MongoDB removed
import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';
import sequelize from '../../database.mjs';
import GamificationPointsService from './GamificationPointsService.mjs';
import PointTransaction from '../../models/PointTransaction.mjs';
import {
  countActiveUsersSince,
  getAchievementCompletionRateFromDatabase,
  getAverageSessionLengthFromDatabase,
  getAverageStreakFromDatabase,
  getEngagementMetricsFromDatabase,
  getEngagementRateFromDatabase,
  getTotalPointsAwardedFromLedger
} from './gamificationPersistenceMetrics.mjs';

function normalizePointMetadata(metadata) {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata
    : {};
}

function getPointIdempotencyKey(metadata) {
  const normalized = normalizePointMetadata(metadata);
  return normalized.idempotencyKey ? String(normalized.idempotencyKey).slice(0, 128) : null;
}

function stringifyPointMetadata(metadata) {
  return JSON.stringify(normalizePointMetadata(metadata));
}

const VALID_POINT_SOURCES = new Set([
  'workout_completion',
  'exercise_completion',
  'streak_bonus',
  'level_up',
  'achievement_earned',
  'milestone_reached',
  'reward_redemption',
  'package_purchase',
  'friend_referral',
  'social_engagement',
  'goal_milestone',
  'goal_completed',
  'admin_adjustment',
  'trainer_award',
  'challenge_completion'
]);

const LEGACY_REASON_SOURCE_MAP = {
  workout_completed: 'workout_completion',
  workout_completion: 'workout_completion',
  workout_streak_3: 'streak_bonus',
  workout_streak_7: 'streak_bonus',
  workout_streak_14: 'streak_bonus',
  goal_achieved: 'goal_completed',
  form_improvement: 'exercise_completion',
  helped_community: 'social_engagement',
  profile_updated: 'social_engagement',
  check_in_logged: 'social_engagement',
  challenge_completion: 'challenge_completion'
};

function toPointSource(reason, metadata) {
  if (VALID_POINT_SOURCES.has(metadata?.source)) return metadata.source;
  const normalizedReason = String(reason || '');
  if (VALID_POINT_SOURCES.has(normalizedReason)) return normalizedReason;
  if (normalizedReason.startsWith('achievement_')) return 'achievement_earned';
  return LEGACY_REASON_SOURCE_MAP[normalizedReason] || 'social_engagement';
}

function toPointSourceId(metadata) {
  for (const field of ['sourceId', 'workoutId', 'postId', 'commentId', 'challengeId', 'goalId', 'sessionId']) {
    const parsed = normalizeInteger(metadata?.[field]);
    if (parsed !== null) return parsed;
  }
  return null;
}

function toPointDescription(reason) {
  const label = String(reason || 'gamification_award')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  return `Gamification: ${label}`;
}

const MAX_LEDGER_LEADERBOARD_LIMIT = 100;

function normalizeInteger(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) ? value : null;
  }
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  if (!/^-?\d+$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function normalizeLeaderboardLimit(limit) {
  const parsed = normalizeInteger(limit);
  if (parsed === null || parsed < 1) return 10;
  return Math.min(parsed, MAX_LEDGER_LEADERBOARD_LIMIT);
}

function normalizeLedgerLeaderboardUserId(userId) {
  const parsed = normalizeInteger(userId);
  return parsed !== null ? parsed : userId;
}

function normalizeNonNegativeInteger(value) {
  const parsed = normalizeInteger(value);
  return parsed !== null && parsed >= 0 ? parsed : 0;
}

function normalizeLedgerPoints(points) {
  return normalizeNonNegativeInteger(points);
}

class GamificationPersistence {
  constructor() {
    // 🎯 P0 PRODUCTION FIX: Initialize Redis conditionally
    this.redis = null;
    this.redisEnabled = false;
    
    // Initialize Redis only in development or when explicitly enabled
    const isProduction = process.env.NODE_ENV === 'production';
    const redisForced = process.env.FORCE_REDIS === 'true';
    
    if (!isProduction || redisForced) {
      this.initializeRedis();
    } else {
      console.log('🎯 PRODUCTION SAFE: Redis disabled for gamification - using PostgreSQL fallback');
    }

    // Fallback storage options - PostgreSQL-only architecture
    this.usePostgreSQL = true;
    // MongoDB removed - PostgreSQL-only architecture

    // Achievement definitions
    this.achievements = {
      'first_workout': {
        name: 'Getting Started',
        description: 'Complete your first workout',
        points: 50,
        icon: '🏋️',
        category: 'beginner'
      },
      'streak_7': {
        name: '7-Day Warrior',
        description: 'Complete workouts for 7 consecutive days',
        points: 200,
        icon: '🔥',
        category: 'consistency'
      },
      'form_perfect': {
        name: 'Perfect Form',
        description: 'Achieve perfect form score on 10 exercises',
        points: 150,
        icon: '⭐',
        category: 'technique'
      },
      'social_butterfly': {
        name: 'Social Butterfly',
        description: 'Share 5 workouts with the community',
        points: 100,
        icon: '🦋',
        category: 'social'
      },
      'accessibility_champion': {
        name: 'Accessibility Champion',
        description: 'Use accessibility features regularly',
        points: 75,
        icon: '♿',
        category: 'inclusive'
      }
    };

    // Point categories with multipliers
    this.pointCategories = {
      'workout_completion': { base: 20, multiplier: 1.0 },
      'perfect_form': { base: 15, multiplier: 1.2 },
      'social_interaction': { base: 5, multiplier: 1.0 },
      'accessibility_use': { base: 10, multiplier: 1.1 },
      'streak_bonus': { base: 50, multiplier: 1.5 },
      'challenge_completion': { base: 100, multiplier: 1.3 }
    };

    // Connect to Redis conditionally
    if (this.redisEnabled) {
      this.connectRedis();
    }
  }

  /**
   * 🎯 P0 PRODUCTION FIX: Initialize Redis with conditional import
   */
  async initializeRedis() {
    try {
      // Dynamically import Redis only when needed
      const { default: Redis } = await import('ioredis');
      
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryAttempts: 3,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        lazyConnect: true,
        maxLoadingTimeout: 1000
      });
      
      this.redisEnabled = true;
      console.log('✅ Redis initialized for gamification');
      
    } catch (error) {
      console.log('🎯 Redis not available for gamification, using PostgreSQL fallback');
      this.redis = null;
      this.redisEnabled = false;
    }
  }

  /**
   * Connect to Redis with error handling
   * 🎯 P0 PRODUCTION FIX: Handle Redis not being available
   */
  async connectRedis() {
    if (!this.redis || !this.redisEnabled) {
      console.log('🎯 Redis not initialized, skipping connection');
      return;
    }
    
    try {
      await this.redis.connect();
      piiSafeLogger.info('Gamification Redis connected successfully');
    } catch (error) {
      piiSafeLogger.error('Redis connection failed, using fallback storage', {
        error: error.message
      });
      this.redisEnabled = false;
      this.redis = null;
    }
  }

  // MongoDB connection removed - PostgreSQL-only architecture

  /**
   * Award points to user with atomic operations
   * 🎯 P0 PRODUCTION FIX: Handle Redis not being available
   * @param {string} userId - User ID
   * @param {number} points - Points to award
   * @param {string} reason - Reason for points
   * @param {Object} metadata - Additional metadata
   */
  async awardPoints(userId, points, reason, metadata = {}) {
    try {
      // Validate input
      if (!userId || points <= 0) {
        throw new Error('Invalid user ID or points value');
      }

      // Calculate final points with category multiplier
      const category = this.pointCategories[reason] || this.pointCategories['workout_completion'];
      const finalPoints = Math.round(points * category.multiplier);
      const ledgerResult = await GamificationPointsService.recordLedgerEntry({
        userId,
        points: finalPoints,
        transactionType: 'earn',
        source: toPointSource(reason, metadata),
        sourceId: toPointSourceId(metadata),
        description: toPointDescription(reason),
        metadata: {
          ...normalizePointMetadata(metadata),
          legacyReason: reason
        },
        awardedBy: metadata?.awardedBy || null,
        idempotencyKey: getPointIdempotencyKey(metadata)
      });

      if (ledgerResult.duplicate) {
        return {
          success: true,
          duplicate: true,
          pointsAwarded: 0,
          totalPoints: ledgerResult.newBalance ?? await this.getTotalPoints(userId),
          reason,
          timestamp: Date.now()
        };
      }

      // 🎯 P0 FIX: Use Redis only if available, otherwise go straight to database
      if (this.redisEnabled && this.redis) {
        try {
          // Redis atomic operations
          const redisOps = this.redis.multi()
            .hincrby(`user:${userId}:points`, 'total', finalPoints)
            .zadd('leaderboard:daily', finalPoints, userId)
            .zadd('leaderboard:weekly', finalPoints, userId)
            .zadd('leaderboard:monthly', finalPoints, userId)
            .lpush(`user:${userId}:point_history`, JSON.stringify({
              points: finalPoints,
              reason,
              timestamp: Date.now(),
              metadata
            }))
            .ltrim(`user:${userId}:point_history`, 0, 99) // Keep last 100 entries
            .expire(`user:${userId}:points`, 86400 * 30) // 30 days expiry
            .expire(`user:${userId}:point_history`, 86400 * 30);

          await redisOps.exec();
        } catch (redisError) {
          console.log('🎯 Redis operation failed, using database fallback:', redisError.message);
          this.redisEnabled = false;
        }
      }

      // Check for achievements
      await this.checkAchievements(userId, reason, metadata);

      // Track gamification event
      piiSafeLogger.trackGamificationEvent('points_awarded', userId, {
        points: finalPoints,
        reason,
        category: category,
        metadata
      });

      return {
        success: true,
        duplicate: false,
        pointsAwarded: ledgerResult.pointsAwarded,
        totalPoints: ledgerResult.newBalance ?? await this.getTotalPoints(userId),
        reason,
        timestamp: Date.now()
      };
    } catch (error) {
      // P1: Never lose gamification data - use fallback
      piiSafeLogger.error('Points award failed, using fallback', {
        error: error.message,
        userId,
        points,
        reason
      });
      
      return await this.fallbackPointStorage(userId, points, reason, metadata);
    }
  }

  /**
   * Persist point transaction to database
   * @param {string} userId - User ID
   * @param {number} points - Points awarded
   * @param {string} reason - Reason for points
   * @param {Object} metadata - Additional metadata
   */
  async persistPointTransaction(userId, points, reason, metadata) {
    const pointRecord = {
      userId,
      points,
      reason,
      metadata: stringifyPointMetadata(metadata),
      timestamp: new Date(),
      backedUp: false
    };

    try {
      // PostgreSQL-only persistence
      if (this.usePostgreSQL) {
        await sequelize.models.UserPointsLedger.create(pointRecord);
      }
      // MongoDB removed - PostgreSQL-only architecture
    } catch (error) {
      // Log error but don't fail the operation
      piiSafeLogger.error('Failed to persist point transaction', {
        error: error.message,
        pointRecord
      });
    }
  }

  /**
   * Fallback point storage when Redis fails
   * @param {string} userId - User ID
   * @param {number} points - Points to award
   * @param {string} reason - Reason for points
   * @param {Object} metadata - Additional metadata
   */
  async fallbackPointStorage(userId, points, reason, metadata) {
    try {
      const result = await GamificationPointsService.recordLedgerEntry({
        userId,
        points,
        transactionType: 'earn',
        source: toPointSource(reason, metadata),
        sourceId: toPointSourceId(metadata),
        description: toPointDescription(reason),
        metadata: {
          ...normalizePointMetadata(metadata),
          legacyReason: reason,
          fallbackUsed: 'postgresql'
        },
        awardedBy: metadata?.awardedBy || null,
        idempotencyKey: getPointIdempotencyKey(metadata)
      });

      return {
        success: true,
        duplicate: !!result.duplicate,
        pointsAwarded: result.pointsAwarded,
        totalPoints: result.newBalance,
        fallbackUsed: 'postgresql',
        reason,
        timestamp: Date.now()
      };
    } catch (error) {
      piiSafeLogger.error('All storage methods failed', {
        error: error.message,
        userId,
        points,
        reason
      });
      
      return {
        success: false,
        error: 'Failed to store points',
        reason,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Check and unlock achievements
   * 🎯 P0 PRODUCTION FIX: Handle Redis not being available
   * @param {string} userId - User ID
   * @param {string} reason - Action that triggered check
   * @param {Object} metadata - Additional context
   */
  async checkAchievements(userId, reason, metadata) {
    try {
      const userStats = await this.getUserStatistics(userId);
      const unlockedAchievements = [];

      // Check each achievement
      for (const [achievementId, achievement] of Object.entries(this.achievements)) {
        let hasAchievement = false;
        
        // Check if user has achievement (Redis or database fallback)
        if (this.redisEnabled && this.redis) {
          try {
            hasAchievement = await this.redis.sismember(`user:${userId}:achievements`, achievementId);
          } catch (redisError) {
            console.log('🎯 Redis achievement check failed, using database fallback');
            this.redisEnabled = false;
            // Fall through to database check
          }
        }
        
        // Database fallback for achievement check.
        // Registry name is UserAchievement (singular) — the previous UserAchievements lookup was
        // undefined and threw on every call. KNOWN GAP (rule 58, 2026-07-29): this engine's
        // catalog uses string keys ('first_workout') while UserAchievements.achievementId is an
        // integer FK to the Achievements table, so this query cannot match engine achievements
        // until an ID mapping exists (SWA-87). The catch keeps the check fail-safe either way.
        if (!this.redisEnabled) {
          try {
            const dbAchievement = await sequelize.models.UserAchievement.findOne({
              where: { userId, achievementId }
            });
            hasAchievement = !!dbAchievement;
          } catch (dbError) {
            console.log('🎯 Database achievement check failed, assuming no achievement');
            hasAchievement = false;
          }
        }
        
        if (!hasAchievement && await this.checkAchievementCondition(achievementId, userStats, reason, metadata)) {
          await this.unlockAchievement(userId, achievementId);
          unlockedAchievements.push({
            id: achievementId,
            ...achievement
          });
        }
      }

      return unlockedAchievements;
    } catch (error) {
      piiSafeLogger.error('Achievement check failed', {
        error: error.message,
        userId,
        reason
      });
      return [];
    }
  }

  /**
   * Check specific achievement condition
   * @param {string} achievementId - Achievement ID
   * @param {Object} userStats - User statistics
   * @param {string} reason - Action reason
   * @param {Object} metadata - Additional context
   */
  async checkAchievementCondition(achievementId, userStats, reason, metadata) {
    switch (achievementId) {
      case 'first_workout':
        return reason === 'workout_completion' && userStats.totalWorkouts === 1;
      
      case 'streak_7':
        return userStats.currentStreak >= 7;
      
      case 'form_perfect':
        return userStats.perfectFormCount >= 10;
      
      case 'social_butterfly':
        return userStats.sharedWorkouts >= 5;
      
      case 'accessibility_champion':
        return userStats.accessibilityUsage >= 10;
      
      default:
        return false;
    }
  }

  /**
   * Unlock achievement for user
   * 🎯 P0 PRODUCTION FIX: Handle Redis not being available
   * @param {string} userId - User ID
   * @param {string} achievementId - Achievement ID
   */
  async unlockAchievement(userId, achievementId) {
    try {
      const achievement = this.achievements[achievementId];
      if (!achievement) return false;

      // Add to Redis if available
      if (this.redisEnabled && this.redis) {
        try {
          await this.redis.sadd(`user:${userId}:achievements`, achievementId);
          await this.redis.zadd('achievement_leaderboard', Date.now(), `${userId}:${achievementId}`);
        } catch (redisError) {
          console.log('🎯 Redis unlock achievement failed, continuing with database');
          this.redisEnabled = false;
        }
      }

      // Award achievement points
      await this.awardPoints(userId, achievement.points, `achievement_${achievementId}`, {
        achievementName: achievement.name,
        category: achievement.category
      });

      // Persist to database (always do this).
      // Registry name is UserAchievement (singular); achievementName/unlockedAt were phantom
      // columns — real columns are earnedAt/isCompleted/progress (rule 58, 2026-07-29).
      // KNOWN GAP: this engine's string achievement keys cannot satisfy the integer
      // achievementId FK, so this insert fails (caught below) until an ID mapping lands
      // (SWA-87) — the write shape is now column-correct for when it does.
      if (this.usePostgreSQL) {
        try {
          await sequelize.models.UserAchievement.create({
            userId,
            achievementId,
            isCompleted: true,
            progress: 100,
            earnedAt: new Date(),
            pointsAwarded: achievement.points
          });
        } catch (dbError) {
          console.log('🎯 Database achievement persist failed:', dbError.message);
        }
      }

      // Track achievement unlock
      piiSafeLogger.trackGamificationEvent('achievement_unlocked', userId, {
        achievementId,
        achievementName: achievement.name,
        pointsAwarded: achievement.points,
        category: achievement.category
      });

      return true;
    } catch (error) {
      piiSafeLogger.error('Achievement unlock failed', {
        error: error.message,
        userId,
        achievementId
      });
      return false;
    }
  }

  /**
   * Get user's total points
   * 🎯 P0 PRODUCTION FIX: Handle Redis not being available
   * @param {string} userId - User ID
   */
  async getTotalPoints(userId) {
    try {
      // Try Redis first if available
      if (this.redisEnabled && this.redis) {
        try {
          const points = await this.redis.hget(`user:${userId}:points`, 'total');
          if (points !== null) {
            return normalizeLedgerPoints(points);
          }
        } catch (redisError) {
          console.log('🎯 Redis getTotalPoints failed, using database fallback');
          this.redisEnabled = false;
        }
      }
      
      // Fallback to database
      try {
        const latestTransaction = await PointTransaction.findOne({
          where: { userId },
          order: [['createdAt', 'DESC'], ['id', 'DESC']]
        });
        return normalizeLedgerPoints(latestTransaction?.balance);
      } catch (dbError) {
        piiSafeLogger.error('Failed to get total points', {
          error: dbError.message,
          userId
        });
        return 0;
      }
    } catch (error) {
      piiSafeLogger.error('Failed to get total points', {
        error: error.message,
        userId
      });
      return 0;
    }
  }

  async getUserTotalPoints(userId) {
    return this.getTotalPoints(userId);
  }

  /**
   * Get user statistics for achievement checking
   * 🎯 P0 PRODUCTION FIX: Handle Redis not being available
   * @param {string} userId - User ID
   */
  async getUserStatistics(userId) {
    try {
      // Try to get from Redis first if available
      if (this.redisEnabled && this.redis) {
        try {
          const stats = await this.redis.hmget(`user:${userId}:stats`,
            'totalWorkouts', 'currentStreak', 'perfectFormCount', 'sharedWorkouts', 'accessibilityUsage'
          );

          return {
            totalWorkouts: normalizeNonNegativeInteger(stats[0]),
            currentStreak: normalizeNonNegativeInteger(stats[1]),
            perfectFormCount: normalizeNonNegativeInteger(stats[2]),
            sharedWorkouts: normalizeNonNegativeInteger(stats[3]),
            accessibilityUsage: normalizeNonNegativeInteger(stats[4])
          };
        } catch (redisError) {
          console.log('🎯 Redis getUserStatistics failed, using database fallback');
          this.redisEnabled = false;
        }
      }
      
      // Fallback to calculating from database
      return await this.calculateStatsFromDatabase(userId);
    } catch (error) {
      // Fallback to calculating from database
      return await this.calculateStatsFromDatabase(userId);
    }
  }

  /**
   * Calculate statistics from database
   * @param {string} userId - User ID
   */
  async calculateStatsFromDatabase(userId) {
    // This would query the actual workout/progress tables.
    // For now, return default values while keeping the signature for future DB work.
    void userId;
    return {
      totalWorkouts: 0,
      currentStreak: 0,
      perfectFormCount: 0,
      sharedWorkouts: 0,
      accessibilityUsage: 0
    };
  }

  /**
   * Get leaderboard
   * @param {string} period - daily, weekly, monthly
   * @param {number} limit - Number of top users
   */
  async getLeaderboard(period = 'weekly', limit = 10) {
    try {
      const normalizedLimit = normalizeLeaderboardLimit(limit);

      if (this.redisEnabled && this.redis) {
        try {
          const leaderboard = await this.redis.zrevrange(
            `leaderboard:${period}`,
            0,
            normalizedLimit - 1,
            'WITHSCORES'
          );

          const result = [];
          for (let i = 0; i < leaderboard.length; i += 2) {
            const userId = leaderboard[i];
            const points = normalizeLedgerPoints(leaderboard[i + 1]);

            // Get user info (would normally fetch from user table)
            result.push({
              userId,
              points,
              rank: Math.floor(i / 2) + 1
            });
          }

          if (result.length > 0) return result;
        } catch (redisError) {
          piiSafeLogger.info('Redis leaderboard unavailable; using PostgreSQL fallback', {
            period,
            error: redisError.message
          });
        }
      }

      // PostgreSQL fallback: rank by the canonical latest point-ledger balance.
      const rows = await sequelize.query(
        `WITH latest_balances AS (
          SELECT DISTINCT ON ("userId") "userId", "balance"
          FROM "PointTransactions"
          ORDER BY "userId", "createdAt" DESC, "id" DESC
        )
        SELECT "userId", "balance"
        FROM latest_balances
        ORDER BY "balance" DESC, "userId" ASC
        LIMIT :limit`,
        {
          replacements: { limit: normalizedLimit },
          type: sequelize.QueryTypes.SELECT
        }
      );

      return rows.map((row, index) => ({
        userId: normalizeLedgerLeaderboardUserId(row.userId),
        points: normalizeLedgerPoints(row.balance),
        rank: index + 1
      }));
    } catch (error) {
      piiSafeLogger.error('Failed to get leaderboard', {
        error: error.message,
        period
      });
      return [];
    }
  }

  /**
   * Get user's achievements
   * @param {string} userId - User ID
   */
  async getUserAchievements(userId) {
    try {
      const achievementIds = await this.redis.smembers(`user:${userId}:achievements`);
      const achievements = achievementIds.map(id => ({
        id,
        ...this.achievements[id]
      }));

      return achievements;
    } catch (error) {
      piiSafeLogger.error('Failed to get user achievements', {
        error: error.message,
        userId
      });
      return [];
    }
  }

  /**
   * Update user statistics
   * @param {string} userId - User ID
   * @param {Object} stats - Statistics to update
   */
  async updateUserStatistics(userId, stats) {
    try {
      const pipeline = this.redis.multi();
      
      for (const [key, value] of Object.entries(stats)) {
        if (typeof value === 'number') {
          pipeline.hincrby(`user:${userId}:stats`, key, value);
        } else {
          pipeline.hset(`user:${userId}:stats`, key, value);
        }
      }
      
      pipeline.expire(`user:${userId}:stats`, 86400 * 30); // 30 days
      await pipeline.exec();

      // Track statistics update
      piiSafeLogger.trackGamificationEvent('stats_updated', userId, {
        updatedStats: Object.keys(stats),
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      piiSafeLogger.error('Failed to update user statistics', {
        error: error.message,
        userId,
        stats
      });
      return false;
    }
  }

  /**
   * Get user's current streak
   * @param {string} userId - User ID
   */
  async getCurrentStreak(userId) {
    try {
      // SECURITY FIX #10: PostgreSQL fallback when Redis disabled
      if (this.redisEnabled && this.redis) {
        const streak = await this.redis.hget(`user:${userId}:stats`, 'currentStreak');
        return normalizeNonNegativeInteger(streak);
      }
      // PostgreSQL fallback: query Gamification model
      const [rows] = await sequelize.query(
        'SELECT "streakCount" FROM "Gamifications" WHERE "userId" = :userId LIMIT 1',
        { replacements: { userId }, type: sequelize.QueryTypes.SELECT }
      );
      return normalizeNonNegativeInteger(rows?.streakCount);
    } catch (error) {
      piiSafeLogger.error('Failed to get current streak', {
        error: error.message,
        userId
      });
      return 0;
    }
  }

  /**
   * Get user's leaderboard rank
   * @param {string} userId - User ID
   * @param {string} period - daily, weekly, monthly
   */
  async getUserLeaderboardRank(userId, period = 'weekly') {
    try {
      // SECURITY FIX #10: PostgreSQL fallback when Redis disabled
      if (this.redisEnabled && this.redis) {
        const rank = await this.redis.zrevrank(`leaderboard:${period}`, userId);
        return rank !== null ? rank + 1 : null;
      }
      // PostgreSQL fallback: rank by the canonical point ledger balance.
      const [result] = await sequelize.query(
        `WITH latest_balances AS (
          SELECT DISTINCT ON ("userId") "userId", "balance"
          FROM "PointTransactions"
          ORDER BY "userId", "createdAt" DESC, "id" DESC
        ),
        target_balance AS (
          SELECT "balance"
          FROM latest_balances
          WHERE "userId" = :userId
        )
        SELECT CASE
          WHEN NOT EXISTS (SELECT 1 FROM target_balance) THEN NULL
          ELSE (
            SELECT COUNT(*) + 1
            FROM latest_balances lb
            CROSS JOIN target_balance tb
            WHERE lb."balance" > tb."balance"
              OR (lb."balance" = tb."balance" AND lb."userId" < :userId)
          )
        END AS rank`,
        { replacements: { userId }, type: sequelize.QueryTypes.SELECT }
      );
      const rank = normalizeInteger(result?.rank);
      return rank !== null && rank > 0 ? rank : null;
    } catch (error) {
      piiSafeLogger.error('Failed to get user leaderboard rank', {
        error: error.message,
        userId,
        period
      });
      return null;
    }
  }

  /**
   * Check if user has achievement
   * @param {string} userId - User ID
   * @param {string} achievementId - Achievement ID
   */
  async hasAchievement(userId, achievementId) {
    try {
      // SECURITY FIX #10: PostgreSQL fallback when Redis disabled
      if (this.redisEnabled && this.redis) {
        return await this.redis.sismember(`user:${userId}:achievements`, achievementId);
      }
      // PostgreSQL fallback: query UserAchievements table
      const [result] = await sequelize.query(
        'SELECT COUNT(*) AS cnt FROM "UserAchievements" WHERE "userId" = :userId AND "achievementId" = :achievementId',
        { replacements: { userId, achievementId }, type: sequelize.QueryTypes.SELECT }
      );
      return normalizeNonNegativeInteger(result?.cnt) > 0;
    } catch (error) {
      piiSafeLogger.error('Failed to check achievement', {
        error: error.message,
        userId,
        achievementId
      });
      return false;
    }
  }

  /**
   * Award achievement to user
   * @param {string} userId - User ID
   * @param {string} achievementId - Achievement ID
   */
  async awardAchievement(userId, achievementId) {
    try {
      await this.redis.sadd(`user:${userId}:achievements`, achievementId);
      
      // Also store in database. Registry name is UserAchievement (singular); unlockedAt was a
      // phantom column — earnedAt is the real one (rule 58, 2026-07-29). Same string-key vs
      // integer-FK gap as the sites above (SWA-87).
      if (this.usePostgreSQL) {
        await sequelize.models.UserAchievement.create({
          userId,
          achievementId,
          isCompleted: true,
          progress: 100,
          earnedAt: new Date()
        });
      }
      
      return true;
    } catch (error) {
      piiSafeLogger.error('Failed to award achievement', {
        error: error.message,
        userId,
        achievementId
      });
      return false;
    }
  }

  /**
   * Get user workout count
   * @param {string} userId - User ID
   */
  async getUserWorkoutCount(userId) {
    try {
      if (this.redisEnabled && this.redis) {
        const count = await this.redis.hget(`user:${userId}:stats`, 'totalWorkouts');
        return normalizeNonNegativeInteger(count);
      }
      // PostgreSQL fallback
      const [result] = await sequelize.query(
        'SELECT "totalWorkouts" FROM "Gamifications" WHERE "userId" = :userId LIMIT 1',
        { replacements: { userId }, type: sequelize.QueryTypes.SELECT }
      );
      return normalizeNonNegativeInteger(result?.totalWorkouts);
    } catch (error) {
      piiSafeLogger.error('Failed to get workout count', {
        error: error.message,
        userId
      });
      return 0;
    }
  }

  /**
   * Get action count for today
   * @param {string} userId - User ID
   * @param {string} action - Action type
   */
  async getActionCountToday(userId, action) {
    try {
      if (this.redisEnabled && this.redis) {
        const today = new Date().toISOString().split('T')[0];
        const key = `user:${userId}:actions:${today}:${action}`;
        const count = await this.redis.get(key);
        return normalizeNonNegativeInteger(count);
      }
      // PostgreSQL fallback: query PointTransaction for today's count
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const pointSource = toPointSource(action, {});
      const shouldMatchLegacyReason = pointSource !== action || !VALID_POINT_SOURCES.has(action);
      const legacyReasonClause = shouldMatchLegacyReason
        ? ' AND "metadata"->>\'legacyReason\' = :legacyReason'
        : '';
      const replacements = {
        userId,
        action: pointSource,
        startOfToday: startOfToday.toISOString()
      };
      if (shouldMatchLegacyReason) replacements.legacyReason = action;
      const [result] = await sequelize.query(
        `SELECT COUNT(*) AS cnt FROM "PointTransactions" WHERE "userId" = :userId AND "source" = :action AND "createdAt" >= :startOfToday${legacyReasonClause}`,
        { replacements, type: sequelize.QueryTypes.SELECT }
      );
      return normalizeNonNegativeInteger(result?.cnt);
    } catch (error) {
      piiSafeLogger.error('Failed to get action count today', {
        error: error.message,
        userId,
        action
      });
      return 0;
    }
  }

  /**
   * Get community help count
   * @param {string} userId - User ID
   */
  async getCommunityHelpCount(userId) {
    try {
      if (this.redisEnabled && this.redis) {
        const count = await this.redis.hget(`user:${userId}:stats`, 'sharedWorkouts');
        return normalizeNonNegativeInteger(count);
      }
      // PostgreSQL fallback
      const source = toPointSource('helped_community', {});
      const [result] = await sequelize.query(
        'SELECT COUNT(*) AS cnt FROM "PointTransactions" WHERE "userId" = :userId AND "source" = :source AND "metadata"->>\'legacyReason\' = :legacyReason',
        {
          replacements: {
            userId,
            source,
            legacyReason: 'helped_community'
          },
          type: sequelize.QueryTypes.SELECT
        }
      );
      return normalizeNonNegativeInteger(result?.cnt);
    } catch (error) {
      piiSafeLogger.error('Failed to get community help count', {
        error: error.message,
        userId
      });
      return 0;
    }
  }

  /**
   * Get active users count
   */
  async getActiveUsersCount() {
    try {
      if (this.redisEnabled && this.redis) {
        const count = await this.redis.scard('active_users:today');
        return count || 0;
      }
      return await countActiveUsersSince(sequelize, 1);
    } catch (error) {
      piiSafeLogger.error('Failed to get active users count', {
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Get total points awarded across platform
   */
  async getTotalPointsAwarded() {
    try {
      if (this.redisEnabled && this.redis) {
        const total = await this.redis.get('platform:total_points_awarded');
        return normalizeNonNegativeInteger(total);
      }
      return await getTotalPointsAwardedFromLedger(sequelize);
    } catch (error) {
      piiSafeLogger.error('Failed to get total points awarded', {
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Get achievement completion rate
   */
  async getAchievementCompletionRate() {
    return await getAchievementCompletionRateFromDatabase(sequelize);
  }

  /**
   * Get average streak across users
   */
  async getAverageStreak() {
    return await getAverageStreakFromDatabase(sequelize);
  }

  /**
   * Get engagement metrics
   * @param {Object} options - Options for metrics
   */
  async getEngagementMetrics(options = {}) {
    try {
      return await getEngagementMetricsFromDatabase(sequelize, options);
    } catch (error) {
      piiSafeLogger.error('Failed to get engagement metrics', {
        error: error.message,
        options
      });
      return {};
    }
  }

  /**
   * Get daily active users
   */
  async getDailyActiveUsers() {
    try {
      if (this.redisEnabled && this.redis) {
        return await this.redis.scard('active_users:daily');
      }
      return await countActiveUsersSince(sequelize, 1);
    } catch (error) {
      piiSafeLogger.error('Failed to get daily active users', {
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Get weekly active users
   */
  async getWeeklyActiveUsers() {
    try {
      if (this.redisEnabled && this.redis) {
        return await this.redis.scard('active_users:weekly');
      }
      return await countActiveUsersSince(sequelize, 7);
    } catch (error) {
      piiSafeLogger.error('Failed to get weekly active users', {
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Get average session length
   */
  async getAverageSessionLength() {
    return await getAverageSessionLengthFromDatabase(sequelize);
  }

  /**
   * Get engagement rate
   */
  async getEngagementRate() {
    return await getEngagementRateFromDatabase(sequelize);
  }

  /**
   * Close connections
   * 🎯 P0 PRODUCTION FIX: Handle Redis not being available
   */
  async close() {
    try {
      if (this.redis && this.redisEnabled) {
        await this.redis.disconnect();
      }
      // MongoDB client removed - PostgreSQL-only architecture
      piiSafeLogger.info('Gamification persistence connections closed');
    } catch (error) {
      piiSafeLogger.error('Error closing gamification connections', {
        error: error.message
      });
    }
  }
}

// Singleton instance
export const gamificationPersistence = new GamificationPersistence();

export default GamificationPersistence;
