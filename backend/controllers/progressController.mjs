/**
 * 📈 PROGRESS CONTROLLER - COMPREHENSIVE PROGRESS TRACKING & ANALYTICS
 * ===================================================================
 * Production-ready controller for progress data, analytics, and insights
 * that matches frontend gamification components expectations
 */

import { Op } from 'sequelize';
import {
  directoryOffset,
  directoryLimit,
  isKnownTier,
  isStaffViewer as isStaffDirectoryViewer,
  scopeToRankable,
} from '../utils/memberDirectoryAccess.mjs';
import db from '../database.mjs';

// Import models through associations for proper relationships
import getModels from '../models/associations.mjs';

const INTERNAL_ERROR = 'Internal server error';

const sendProgressError = (res, status, message, error = INTERNAL_ERROR) =>
  res.status(status).json({
    success: false,
    message,
    error
  });

const parsePositiveInteger = (value, fallback = null) => {
  const stringValue = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(stringValue)) return fallback;

  return Number(stringValue);
};

const parseBoundedPositiveInteger = (value, fallback, max) =>
  Math.min(parsePositiveInteger(value, fallback), max);

const progressController = {
  /**
   * 📊 GET USER PROGRESS DATA - WITH TIME FILTERS
   * ============================================
   * GET /api/v1/gamification/users/:userId/progress
   */
  getUserProgress: async (req, res) => {
    try {
      const models = await getModels();
      const { ProgressData, User } = models;
      
      const { userId } = req.params;
      const { 
        timeframe = 'monthly',
        startDate,
        endDate,
        limit = 100,
        metrics = 'all'
      } = req.query;
      const normalizedLimit = parseBoundedPositiveInteger(limit, 100, 500);

      // Validate user exists
      const user = await User.findByPk(userId, {
        attributes: ['id', 'firstName', 'lastName', 'username', ['lifetimePointsEarned', 'points'], 'level']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Build date filter
      let dateFilter = {};
      const now = new Date();
      
      if (startDate && endDate) {
        dateFilter = {
          date: {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          }
        };
      } else {
        switch (timeframe) {
          case 'weekly':
            dateFilter.date = { [Op.gte]: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] };
            break;
          case 'monthly':
            dateFilter.date = { [Op.gte]: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] };
            break;
          case 'quarterly':
            dateFilter.date = { [Op.gte]: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] };
            break;
          case 'yearly':
            dateFilter.date = { [Op.gte]: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] };
            break;
          default:
            // Default to last 30 days
            dateFilter.date = { [Op.gte]: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] };
        }
      }

      const progressData = await ProgressData.findAll({
        where: {
          userId,
          ...dateFilter
        },
        order: [['date', 'ASC']],
        limit: normalizedLimit
      });

      // Calculate aggregated metrics
      const aggregatedData = this.aggregateProgressData(progressData, timeframe);
      
      // Calculate trends and insights
      const trends = this.calculateTrends(progressData);
      const insights = await this.generateInsights(userId, progressData, models);

      return res.status(200).json({
        success: true,
        user: user,
        timeframe,
        progressData: metrics === 'summary' ? [] : progressData,
        aggregated: aggregatedData,
        trends,
        insights,
        totalEntries: progressData.length
      });
    } catch (error) {
      console.error('❌ Error fetching user progress:', error);
      return sendProgressError(res, 500, 'Failed to fetch user progress data');
    }
  },

  /**
   * 📈 GET USER STATS - COMPREHENSIVE USER STATISTICS
   * ================================================
   * GET /api/v1/gamification/users/:userId/stats
   */
  getUserStats: async (req, res) => {
    try {
      const models = await getModels();
      const { User, ProgressData, Achievement, UserAchievement, Challenge, ChallengeParticipant, Goal } = models;
      
      const { userId } = req.params;
      const { period = 'all' } = req.query;

      // Get user with basic stats
      const user = await User.findByPk(userId, {
        attributes: [
          'id', 'firstName', 'lastName', 'username', 'photo',
          ['lifetimePointsEarned', 'points'], 'level', 'tier', 'streakDays', 'totalWorkouts',
          'totalExercises', 'createdAt'
        ],
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get latest progress data
      const latestProgress = await ProgressData.findOne({
        where: { userId },
        order: [['date', 'DESC']]
      });

      // Get achievement stats
      const achievementStats = await UserAchievement.findAndCountAll({
        where: { userId },
        include: [{
          model: Achievement,
          as: 'achievement',
          attributes: ['id', 'name', 'tier', 'pointValue']
        }]
      });

      const completedAchievements = achievementStats.rows.filter(ua => ua.isCompleted).length;
      const achievementProgress = achievementStats.rows.filter(ua => !ua.isCompleted);

      // Get challenge stats
      const challengeStats = await ChallengeParticipant.findAndCountAll({
        where: { userId },
        include: [{
          model: Challenge,
          as: 'challenge',
          attributes: ['id', 'title', 'challengeType', 'category']
        }]
      });

      const completedChallenges = challengeStats.rows.filter(cp => cp.isCompleted).length;
      const activeChallenges = challengeStats.rows.filter(cp => !cp.isCompleted).length;

      // Get goal stats
      const goalStats = await Goal.aggregate([
        {
          $match: { userId: userId }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]).catch(() => []); // Fallback if Goal model uses different aggregation

      // Calculate leaderboard position
      const leaderboardRank = await User.count({
        where: {
          lifetimePointsEarned: { [Op.gt]: user.points }
        }
      }) + 1;

      const totalUsers = await User.count();

      // Build comprehensive stats
      const userStats = {
        user: user.toJSON(),
        currentStats: {
          points: user.points,
          level: user.level,
          tier: user.tier,
          streakDays: user.streakDays,
          totalWorkouts: user.totalWorkouts,
          totalExercises: user.totalExercises,
          leaderboardRank,
          totalUsers,
          percentile: totalUsers > 0 ? Math.round(((totalUsers - leaderboardRank + 1) / totalUsers) * 100) : 0
        },
        achievements: {
          total: achievementStats.count,
          completed: completedAchievements,
          inProgress: achievementProgress.length,
          completionRate: achievementStats.count > 0 ? (completedAchievements / achievementStats.count) * 100 : 0,
          recent: achievementStats.rows
            .filter(ua => ua.isCompleted)
            .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt))
            .slice(0, 3)
        },
        challenges: {
          total: challengeStats.count,
          completed: completedChallenges,
          active: activeChallenges,
          completionRate: challengeStats.count > 0 ? (completedChallenges / challengeStats.count) * 100 : 0,
          recent: challengeStats.rows
            .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))
            .slice(0, 5)
        },
        goals: {
          active: goalStats.find(g => g._id === 'active')?.count || 0,
          completed: goalStats.find(g => g._id === 'completed')?.count || 0,
          total: goalStats.reduce((sum, g) => sum + g.count, 0)
        },
        progress: latestProgress ? {
          lastUpdate: latestProgress.date,
          xpGained: latestProgress.xpGained,
          workoutsCompleted: latestProgress.workoutsCompleted,
          currentStreak: latestProgress.currentStreak,
          longestStreak: latestProgress.longestStreak,
          consistencyScore: latestProgress.consistencyScore
        } : null,
        membershipInfo: {
          joinedAt: user.createdAt,
          daysSinceJoining: Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24))
        }
      };

      return res.status(200).json({
        success: true,
        stats: userStats
      });
    } catch (error) {
      console.error('❌ Error fetching user stats:', error);
      return sendProgressError(res, 500, 'Failed to fetch user statistics');
    }
  },

  /**
   * 🎯 RECORD PROGRESS ENTRY
   * =======================
   * POST /api/v1/gamification/users/:userId/progress
   */
  recordProgressEntry: async (req, res) => {
    const transaction = await db.transaction();
    
    try {
      const models = await getModels();
      const { ProgressData, User } = models;
      
      const { userId } = req.params;
      const progressData = req.body;

      // Validate user
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get or create today's progress entry
      const today = new Date().toISOString().split('T')[0];
      const dateObj = new Date(today);

      const [progressEntry, created] = await ProgressData.findOrCreate({
        where: { userId, date: today },
        defaults: {
          userId,
          date: today,
          timestamp: new Date(),
          weekNumber: this.getWeekNumber(dateObj),
          monthNumber: dateObj.getMonth() + 1,
          quarterNumber: Math.ceil((dateObj.getMonth() + 1) / 3),
          year: dateObj.getFullYear(),
          ...progressData
        },
        transaction
      });

      if (!created) {
        // Update existing entry
        await progressEntry.update({
          ...progressData,
          timestamp: new Date(),
          updatedAt: new Date()
        }, { transaction });
      }

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: created ? 'Progress entry created' : 'Progress entry updated',
        progressEntry,
        created
      });
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error recording progress entry:', error);
      return sendProgressError(res, 500, 'Failed to record progress entry');
    }
  },

  /**
   * 📊 GET LEADERBOARD WITH ADVANCED FILTERING
   * =========================================
   * GET /api/v1/gamification/leaderboard
   */
  getLeaderboard: async (req, res) => {
    try {
      const models = await getModels();
      const { User, ProgressData, Achievement } = models;
      
      const {
        timeframe = 'all_time',
        metric = 'points',
        tier,
        limit: rawLimit = 20,
        page = 1
      } = req.query;

      const normalizedPage = parsePositiveInteger(page, 1);
      const normalizedLimit = parseBoundedPositiveInteger(rawLimit, 20, 100);

      // SECURITY: this route is open to ANY authenticated account, and `page`
      // was unbounded with no role filter and surnames in the projection — so a
      // member created through the public signup form could walk
      // ?limit=100&page=1..N and harvest the whole user table, staff included.
      // Members get a bounded, member-only, surname-free board; staff keep the
      // full one the admin surfaces already consume.
      const isStaffViewer = isStaffDirectoryViewer(req.user);
      // A member-facing leaderboard shows the TOP of a slice. It is not a
      // cursor over the user table, so members get NO paging at all: offset is
      // forced to 0.
      //
      // Capping offset instead of eliminating it was two fixes ago, and it was
      // still wrong — the cap bound each QUERY while the reachable set is the
      // UNION over the parameter space. `tier` partitions the table and
      // `metric` re-sorts it, so a bounded-offset member could still walk past
      // the top of every slice. With offset pinned to 0 the top is all there
      // is, whatever tier/metric/timeframe is requested.
      const MEMBER_MAX_ROWS = 100;

      const rawOffset = (normalizedPage - 1) * normalizedLimit;
      const offset = directoryOffset(req.user, rawOffset);
      const effectiveLimit = directoryLimit(req.user, normalizedLimit);

      // A member-facing leaderboard ranks members. Staff are not competitors,
      // and listing them here is what exposed their names.
      const whereClause = scopeToRankable(req.user);
      let orderBy;
      let includeProgressData = false;

      // Build where clause. `tier` is allowlisted: an unvalidated value both
      // reaches the query and echoes back in `filters`, and each distinct tier
      // is a DISJOINT slice — so without a fixed, small set of slices the
      // per-query row cap can be unioned over the parameter space.
      // Allowlisted against the CANONICAL domain. A hand-copied
      // ['bronze','silver','gold','platinum'] matched nothing at all, because
      // the column stores `bronze_forge`-style keys — so every legitimate tier
      // filter was silently discarded and the slice protection was accidental.
      const safeTier = tier && tier !== 'all' && isKnownTier(tier) ? tier : null;
      if (safeTier) {
        whereClause.tier = safeTier;
      }

      // Configure ordering and includes based on metric and timeframe
      switch (metric) {
        case 'xp_gained':
          includeProgressData = true;
          orderBy = [[{ model: ProgressData, as: 'progressData' }, 'xpGained', 'DESC']];
          break;
        case 'workouts':
          orderBy = [['totalWorkouts', 'DESC']];
          break;
        case 'streak':
          orderBy = [['streakDays', 'DESC']];
          break;
        case 'level':
          orderBy = [['level', 'DESC'], ['lifetimePointsEarned', 'DESC']];
          break;
        case 'points':
        default:
          orderBy = [['lifetimePointsEarned', 'DESC']];
          break;
      }

      const includeClause = [];

      if (includeProgressData) {
        // Add date filtering for progress data based on timeframe
        const progressWhere = {};
        if (timeframe !== 'all_time') {
          const now = new Date();
          let startDate;
          
          switch (timeframe) {
            case 'weekly':
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case 'monthly':
              startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            case 'yearly':
              startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
              break;
          }
          
          if (startDate) {
            progressWhere.date = { [Op.gte]: startDate.toISOString().split('T')[0] };
          }
        }

        includeClause.push({
          model: ProgressData,
          as: 'progressData',
          where: progressWhere,
          required: timeframe !== 'all_time',
          attributes: ['xpGained', 'workoutsCompleted', 'date'],
          limit: timeframe === 'all_time' ? 1 : 100,
          order: [['date', 'DESC']]
        });
      }

      const leaderboard = await User.findAll({
        where: whereClause,
        attributes: [
          'id', 'firstName',
          // Surnames are staff-only: the member UI renders firstName/username.
          ...(isStaffViewer ? ['lastName'] : []),
          'username', 'photo',
          ['lifetimePointsEarned', 'points'], 'level', 'tier', 'streakDays', 'totalWorkouts',
          'totalExercises'
        ],
        include: includeClause,
        order: orderBy,
        limit: effectiveLimit,
        offset,
        subQuery: false,
        distinct: true
      });

      // Add ranking and calculate additional metrics
      const rankedLeaderboard = leaderboard.map((user, index) => {
        const userData = user.toJSON();
        
        // Calculate timeframe-specific metrics if needed
        if (includeProgressData && userData.progressData) {
          const progressEntries = Array.isArray(userData.progressData) ? userData.progressData : [userData.progressData];
          userData.timeframeStats = {
            totalXp: progressEntries.reduce((sum, p) => sum + (p.xpGained || 0), 0),
            totalWorkouts: progressEntries.reduce((sum, p) => sum + (p.workoutsCompleted || 0), 0),
            entriesCount: progressEntries.length
          };
        }

        return {
          rank: offset + index + 1,
          ...userData
        };
      });

      // SECURITY: `includeUser` was an unauthenticated-by-design stat oracle.
      // It fed an attacker-controlled id straight into User.findByPk with no
      // ownership check, and findByPk bypasses the role filter entirely — so a
      // member could rank ANY account (staff included) and, by switching
      // `metric`, read that account's points/level/streak/workouts one
      // comparison at a time. The `?.x || 0` fallback also made it an existence
      // oracle. It had ZERO callers in the entire repo, so it is removed rather
      // than guarded: the safest parameter is the one that does not exist.
      // Members already receive their own rank via /gamification/profile.
      const userRank = null;

      const total = await User.count({ where: whereClause });

      return res.status(200).json({
        success: true,
        leaderboard: rankedLeaderboard,
        pagination: {
          // Members are told the size of what they received, never the
          // population. `Math.min(total, CAP)` still disclosed any count BELOW
          // the cap exactly — and with `tier` set that is an exact per-segment
          // headcount, which at launch scale is the whole roster.
          total: isStaffViewer ? total : leaderboard.length,
          page: isStaffViewer ? normalizedPage : 1,
          limit: effectiveLimit,
          pages: isStaffViewer ? Math.ceil(total / normalizedLimit) : 1
        },
        filters: {
          timeframe,
          metric,
          tier: safeTier
        },
        userRank
      });
    } catch (error) {
      console.error('❌ Error fetching leaderboard:', error);
      return sendProgressError(res, 500, 'Failed to fetch leaderboard');
    }
  },

  /**
   * 🔍 GET PROGRESS INSIGHTS & ANALYTICS
   * ===================================
   * GET /api/v1/gamification/users/:userId/insights
   */
  getProgressInsights: async (req, res) => {
    try {
      const models = await getModels();
      const { ProgressData, User, Challenge, ChallengeParticipant } = models;
      
      const { userId } = req.params;
      const { timeframe = 'monthly' } = req.query;

      // Get user
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get progress data for timeframe
      const progressData = await progressController.getProgressDataForTimeframe(userId, timeframe, models);

      // Generate comprehensive insights
      const insights = {
        overview: progressController.generateOverviewInsights(user, progressData),
        trends: progressController.calculateDetailedTrends(progressData),
        achievements: await progressController.getAchievementInsights(userId, models),
        challenges: await progressController.getChallengeInsights(userId, models),
        recommendations: progressController.generateRecommendations(progressData),
        goals: await progressController.getGoalInsights(userId, models),
        social: await progressController.getSocialInsights(userId, models)
      };

      return res.status(200).json({
        success: true,
        insights,
        timeframe,
        dataPoints: progressData.length
      });
    } catch (error) {
      console.error('❌ Error generating insights:', error);
      return sendProgressError(res, 500, 'Failed to generate progress insights');
    }
  },

  // Helper methods for data processing and insights

  aggregateProgressData: (progressData, timeframe) => {
    if (progressData.length === 0) return null;

    const totals = progressData.reduce((acc, data) => {
      acc.xpGained += data.xpGained || 0;
      acc.workoutsCompleted += data.workoutsCompleted || 0;
      acc.workoutDuration += data.workoutDuration || 0;
      acc.exercisesCompleted += data.exercisesCompleted || 0;
      acc.caloriesBurned += data.caloriesBurned || 0;
      acc.achievementsUnlocked += data.achievementsUnlocked || 0;
      acc.challengesCompleted += data.challengesCompleted || 0;
      return acc;
    }, {
      xpGained: 0,
      workoutsCompleted: 0,
      workoutDuration: 0,
      exercisesCompleted: 0,
      caloriesBurned: 0,
      achievementsUnlocked: 0,
      challengesCompleted: 0
    });

    const averages = {
      averageXpPerDay: totals.xpGained / progressData.length,
      averageWorkoutsPerDay: totals.workoutsCompleted / progressData.length,
      averageDurationPerWorkout: totals.workoutsCompleted > 0 ? totals.workoutDuration / totals.workoutsCompleted : 0,
      averageCaloriesPerWorkout: totals.workoutsCompleted > 0 ? totals.caloriesBurned / totals.workoutsCompleted : 0
    };

    return {
      ...totals,
      ...averages,
      daysTracked: progressData.length,
      timeframe
    };
  },

  calculateTrends: (progressData) => {
    if (progressData.length < 2) return null;

    const latest = progressData[progressData.length - 1];
    const previous = progressData[progressData.length - 2];

    const trends = {};
    const fields = ['xpGained', 'workoutsCompleted', 'caloriesBurned', 'currentStreak'];

    fields.forEach(field => {
      const currentValue = latest[field] || 0;
      const previousValue = previous[field] || 0;
      const change = currentValue - previousValue;
      const percentage = previousValue > 0 ? (change / previousValue) * 100 : 0;

      trends[field] = {
        current: currentValue,
        previous: previousValue,
        change,
        percentage: Math.round(percentage * 100) / 100,
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
      };
    });

    return trends;
  },

  generateInsights: async (userId, progressData, models) => {
    const insights = [];

    // Streak insight
    if (progressData.length > 0) {
      const latest = progressData[progressData.length - 1];
      if (latest.currentStreak >= 7) {
        insights.push({
          type: 'achievement',
          message: `Amazing! You're on a ${latest.currentStreak}-day streak!`,
          priority: 'high'
        });
      }
    }

    // Progress trend insight
    if (progressData.length >= 7) {
      const recentAvg = progressData.slice(-7).reduce((sum, p) => sum + p.xpGained, 0) / 7;
      const previousAvg = progressData.slice(-14, -7).reduce((sum, p) => sum + p.xpGained, 0) / 7;
      
      if (recentAvg > previousAvg * 1.2) {
        insights.push({
          type: 'trend',
          message: 'Your performance has improved significantly this week!',
          priority: 'medium'
        });
      }
    }

    // Consistency insight
    const workoutDays = progressData.filter(p => p.workoutsCompleted > 0).length;
    const consistencyRate = progressData.length > 0 ? workoutDays / progressData.length : 0;
    
    if (consistencyRate >= 0.8) {
      insights.push({
        type: 'consistency',
        message: 'You\'re maintaining excellent workout consistency!',
        priority: 'medium'
      });
    }

    return insights;
  },

  // ── Missing helper methods for getProgressInsights ──────────────────────

  getProgressDataForTimeframe: async (userId, timeframe, models) => {
    const { ProgressData } = models;
    if (!ProgressData) return [];

    const now = new Date();
    const startDate = new Date();
    if (timeframe === 'weekly') startDate.setDate(now.getDate() - 7);
    else if (timeframe === 'monthly') startDate.setMonth(now.getMonth() - 1);
    else if (timeframe === 'quarterly') startDate.setMonth(now.getMonth() - 3);
    else startDate.setMonth(now.getMonth() - 1); // default monthly

    try {
      const data = await ProgressData.findAll({
        where: {
          userId,
          date: { [Op.gte]: startDate }
        },
        order: [['date', 'ASC']],
        raw: true,
      });
      return data || [];
    } catch {
      return [];
    }
  },

  generateOverviewInsights: (user, progressData) => {
    const totalWorkouts = progressData.reduce((sum, p) => sum + (p.workoutsCompleted || 0), 0);
    const totalXp = progressData.reduce((sum, p) => sum + (p.xpGained || 0), 0);
    const totalCalories = progressData.reduce((sum, p) => sum + (p.caloriesBurned || 0), 0);
    const activeDays = progressData.filter(p => (p.workoutsCompleted || 0) > 0).length;

    return {
      totalWorkouts,
      totalXp,
      totalCalories,
      activeDays,
      totalDays: progressData.length,
      consistencyRate: progressData.length > 0 ? Math.round((activeDays / progressData.length) * 100) : 0,
    };
  },

  calculateDetailedTrends: (progressData) => {
    if (progressData.length < 2) {
      return { xp: 'stable', workouts: 'stable', calories: 'stable', streak: 'stable' };
    }

    const mid = Math.floor(progressData.length / 2);
    const firstHalf = progressData.slice(0, mid);
    const secondHalf = progressData.slice(mid);

    const avg = (arr, field) => arr.length > 0 ? arr.reduce((s, p) => s + (p[field] || 0), 0) / arr.length : 0;
    const trend = (a, b) => b > a * 1.1 ? 'up' : b < a * 0.9 ? 'down' : 'stable';

    return {
      xp: trend(avg(firstHalf, 'xpGained'), avg(secondHalf, 'xpGained')),
      workouts: trend(avg(firstHalf, 'workoutsCompleted'), avg(secondHalf, 'workoutsCompleted')),
      calories: trend(avg(firstHalf, 'caloriesBurned'), avg(secondHalf, 'caloriesBurned')),
      streak: trend(avg(firstHalf, 'currentStreak'), avg(secondHalf, 'currentStreak')),
    };
  },

  getAchievementInsights: async (userId, models) => {
    try {
      const { UserAchievement } = models;
      if (!UserAchievement) return { total: 0, recent: [] };
      // Real columns are isCompleted/earnedAt (rule 58, verified 2026-07-29). The previous
      // where clause used isUnlocked/unlockedAt — fields that never existed in ANY version of
      // this model — so this query always threw and the catch below silently returned zero
      // achievements to the progress surface.
      const achievements = await UserAchievement.findAll({
        where: { userId, isCompleted: true },
        order: [['earnedAt', 'DESC']],
        limit: 5,
        raw: true,
      });
      return { total: achievements.length, recent: achievements };
    } catch {
      return { total: 0, recent: [] };
    }
  },

  getChallengeInsights: async (userId, models) => {
    try {
      const { ChallengeParticipant } = models;
      if (!ChallengeParticipant) return { active: 0, completed: 0 };
      const active = await ChallengeParticipant.count({ where: { userId, status: 'active' } });
      const completed = await ChallengeParticipant.count({ where: { userId, status: 'completed' } });
      return { active, completed };
    } catch {
      return { active: 0, completed: 0 };
    }
  },

  generateRecommendations: (progressData) => {
    const recommendations = [];
    if (progressData.length === 0) {
      recommendations.push({ type: 'start', message: 'Start logging workouts to track your progress!', priority: 'high' });
      return recommendations;
    }

    const activeDays = progressData.filter(p => (p.workoutsCompleted || 0) > 0).length;
    const rate = activeDays / progressData.length;

    if (rate < 0.3) {
      recommendations.push({ type: 'consistency', message: 'Try to work out at least 3 times per week for best results.', priority: 'high' });
    } else if (rate >= 0.7) {
      recommendations.push({ type: 'recovery', message: 'Great consistency! Make sure you include rest days for recovery.', priority: 'medium' });
    }

    return recommendations;
  },

  getGoalInsights: async (userId, models) => {
    // Goals feature not yet fully implemented — return safe default
    return { activeGoals: 0, completedGoals: 0, goals: [] };
  },

  getSocialInsights: async (userId, models) => {
    try {
      const SocialPost = models.SocialPost;
      if (!SocialPost) return { postCount: 0, engagementScore: 0 };
      const postCount = await SocialPost.count({ where: { userId } });
      return { postCount, engagementScore: Math.min(postCount * 5, 100) };
    } catch {
      return { postCount: 0, engagementScore: 0 };
    }
  },

  getWeekNumber: (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }
};

export default progressController;
