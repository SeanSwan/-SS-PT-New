// 🎯 P0 PRODUCTION FIX: Conditional Redis import to prevent crashes
// import Redis from 'ioredis'; // REMOVED - causing production crashes
import { MongoClient } from 'mongodb';
import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';
import sequelize from '../../database.mjs';

/**
 * P1: Enhanced Gamification Engine with Reliability
 * Dual persistence with Redis + MongoDB/PostgreSQL backup
 * Aligned with Master Prompt v26 Addictive Gamification Strategy
 */

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

    // Fallback storage options
    this.usePostgreSQL = true;
    this.useMongoDB = process.env.MONGODB_URL || false;
    
    // MongoDB client (if available)
    if (this.useMongoDB) {
      this.mongoClient = new MongoClient(process.env.MONGODB_URL);
      this.mongodb = null;
      this.connectMongoDB();
    }

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

  /**
   * Connect to MongoDB with error handling
   */
  async connectMongoDB() {
    if (!this.useMongoDB) return;
    
    try {
      await this.mongoClient.connect();
      this.mongodb = this.mongoClient.db('swanstudios_gamification');
      piiSafeLogger.info('Gamification MongoDB connected successfully');
    } catch (error) {
      piiSafeLogger.error('MongoDB connection failed for gamification', {
        error: error.message
      });
      this.useMongoDB = false;
    }
  }

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

      // Persistent storage with backup (PostgreSQL or MongoDB)
      await this.persistPointTransaction(userId, finalPoints, reason, metadata);
      
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
        pointsAwarded: finalPoints,
        totalPoints: await this.getTotalPoints(userId),
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
      metadata: JSON.stringify(metadata),
      timestamp: new Date(),
      backedUp: false
    };

    try {
      // Try PostgreSQL first
      if (this.usePostgreSQL) {
        await sequelize.models.UserPointsLedger.create(pointRecord);
      }
      // Fallback to MongoDB
      else if (this.mongodb) {
        await this.mongodb.collection('user_achievements').insertOne(pointRecord);
      }
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
      // Use PostgreSQL as primary fallback
      if (this.usePostgreSQL) {
        const [userPoints, created] = await sequelize.models.UserPointsLedger.findOrCreate({
          where: { userId, reason, timestamp: new Date() },
          defaults: {
            userId,
            points,
            reason,
            metadata: JSON.stringify(metadata),
            timestamp: new Date()
          }
        });

        // Update user's total points
        await sequelize.models.UserAchievements.increment('totalPoints', {
          by: points,
          where: { userId }
        });

        return {
          success: true,
          pointsAwarded: points,
          fallbackUsed: 'postgresql',
          reason,
          timestamp: Date.now()
        };
      }

      // MongoDB fallback
      if (this.mongodb) {
        await this.mongodb.collection('user_points_fallback').insertOne({
          userId,
          points,
          reason,
          metadata,
          timestamp: new Date(),
          fallbackStorage: true
        });

        return {
          success: true,
          pointsAwarded: points,
          fallbackUsed: 'mongodb',
          reason,
          timestamp: Date.now()
        };
      }

      throw new Error('No fallback storage available');
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
        
        // Database fallback for achievement check
        if (!this.redisEnabled) {
          try {
            const dbAchievement = await sequelize.models.UserAchievements.findOne({
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

      // Persist to database (always do this)
      if (this.usePostgreSQL) {
        try {
          await sequelize.models.UserAchievements.create({
            userId,
            achievementId,
            achievementName: achievement.name,
            pointsAwarded: achievement.points,
            unlockedAt: new Date()
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
            return parseInt(points) || 0;
          }
        } catch (redisError) {
          console.log('🎯 Redis getTotalPoints failed, using database fallback');
          this.redisEnabled = false;
        }
      }
      
      // Fallback to database
      try {
        const result = await sequelize.models.UserPointsLedger.sum('points', {
          where: { userId }
        });
        return result || 0;
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
            totalWorkouts: parseInt(stats[0]) || 0,
            currentStreak: parseInt(stats[1]) || 0,
            perfectFormCount: parseInt(stats[2]) || 0,
            sharedWorkouts: parseInt(stats[3]) || 0,
            accessibilityUsage: parseInt(stats[4]) || 0
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
    try {
      // This would query the actual workout/progress tables
      // For now, return default values
      return {
        totalWorkouts: 0,
        currentStreak: 0,
        perfectFormCount: 0,
        sharedWorkouts: 0,
        accessibilityUsage: 0
      };
    } catch (error) {
      piiSafeLogger.error('Failed to calculate stats from database', {
        error: error.message,
        userId
      });
      return {
        totalWorkouts: 0,
        currentStreak: 0,
        perfectFormCount: 0,
        sharedWorkouts: 0,
        accessibilityUsage: 0
      };
    }
  }

  /**
   * Get leaderboard
   * @param {string} period - daily, weekly, monthly
   * @param {number} limit - Number of top users
   */
  async getLeaderboard(period = 'weekly', limit = 10) {
    try {
      const leaderboard = await this.redis.zrevrange(
        `leaderboard:${period}`,
        0,
        limit - 1,
        'WITHSCORES'
      );

      const result = [];
      for (let i = 0; i < leaderboard.length; i += 2) {
        const userId = leaderboard[i];
        const points = parseInt(leaderboard[i + 1]);
        
        // Get user info (would normally fetch from user table)
        result.push({
          userId,
          points,
          rank: Math.floor(i / 2) + 1
        });
      }

      return result;
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
      const streak = await this.redis.hget(`user:${userId}:stats`, 'currentStreak');
      return parseInt(streak) || 0;
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
      const rank = await this.redis.zrevrank(`leaderboard:${period}`, userId);
      return rank !== null ? rank + 1 : null;
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
      return await this.redis.sismember(`user:${userId}:achievements`, achievementId);
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
      
      // Also store in database
      if (this.usePostgreSQL) {
        await sequelize.models.UserAchievements.create({
          userId,
          achievementId,
          unlockedAt: new Date()
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
      const count = await this.redis.hget(`user:${userId}:stats`, 'totalWorkouts');
      return parseInt(count) || 0;
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
      const today = new Date().toISOString().split('T')[0];
      const key = `user:${userId}:actions:${today}:${action}`;
      const count = await this.redis.get(key);
      return parseInt(count) || 0;
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
      const count = await this.redis.hget(`user:${userId}:stats`, 'sharedWorkouts');
      return parseInt(count) || 0;
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
      const count = await this.redis.scard('active_users:today');
      return count || 0;
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
      // This would typically sum from database
      const total = await this.redis.get('platform:total_points_awarded');
      return parseInt(total) || 0;
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
    try {
      // Mock implementation - would calculate from actual data
      return 75; // 75% completion rate
    } catch (error) {
      piiSafeLogger.error('Failed to get achievement completion rate', {
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Get average streak across users
   */
  async getAverageStreak() {
    try {
      // Mock implementation - would calculate from actual data
      return 5.2; // Average streak of 5.2 days
    } catch (error) {
      piiSafeLogger.error('Failed to get average streak', {
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Get engagement metrics
   * @param {Object} options - Options for metrics
   */
  async getEngagementMetrics(options = {}) {
    try {
      const { timeframe = '30d', segment } = options;
      
      // Mock implementation - would pull from actual analytics
      return {
        dailyActiveUsers: 1250,
        weeklyActiveUsers: 5600,
        monthlyActiveUsers: 18750,
        averageSessionTime: 45, // minutes
        pointsPerUser: 850,
        achievementsPerUser: 3.2,
        streakCompletionRate: 68.5
      };
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
      return await this.redis.scard('active_users:daily');
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
      return await this.redis.scard('active_users:weekly');
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
    try {
      // Mock implementation - would calculate from actual session data
      return 38; // 38 minutes average
    } catch (error) {
      piiSafeLogger.error('Failed to get average session length', {
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Get engagement rate
   */
  async getEngagementRate() {
    try {
      // Mock implementation - would calculate from actual data
      return 78.5; // 78.5% engagement rate
    } catch (error) {
      piiSafeLogger.error('Failed to get engagement rate', {
        error: error.message
      });
      return 0;
    }
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
      if (this.mongoClient) {
        await this.mongoClient.close();
      }
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