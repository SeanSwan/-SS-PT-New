/**
 * 📈 PROGRESS CONTROLLER - COMPREHENSIVE PROGRESS TRACKING & ANALYTICS
 * ===================================================================
 * Production-ready controller for progress data, analytics, and insights
 * that matches frontend gamification components expectations
 */

import { Op } from 'sequelize';
import db from '../database.mjs';

// Import models through associations for proper relationships
import getModels from '../models/associations.mjs';

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

      // Validate user exists
      const user = await User.findByPk(userId, {
        attributes: ['id', 'firstName', 'lastName', 'username', 'points', 'level']
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
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter.date = { [Op.gte]: weekAgo.toISOString().split('T')[0] };
            break;
          case 'monthly':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateFilter.date = { [Op.gte]: monthAgo.toISOString().split('T')[0] };
            break;
          case 'quarterly':
            const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            dateFilter.date = { [Op.gte]: quarterAgo.toISOString().split('T')[0] };
            break;
          case 'yearly':
            const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            dateFilter.date = { [Op.gte]: yearAgo.toISOString().split('T')[0] };
            break;
          default:
            // Default to last 30 days
            const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateFilter.date = { [Op.gte]: defaultStart.toISOString().split('T')[0] };
        }
      }

      const progressData = await ProgressData.findAll({
        where: {
          userId,
          ...dateFilter
        },
        order: [['date', 'ASC']],
        limit: parseInt(limit)
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
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user progress data',
        error: error.message
      });
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
          'points', 'level', 'tier', 'streakDays', 'totalWorkouts',
          'totalExercises', 'badgesPrimary', 'createdAt'
        ],
        include: [
          {
            model: Achievement,
            as: 'primaryBadge',
            attributes: ['id', 'name', 'icon', 'badgeImageUrl']
          }
        ]
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
          points: { [Op.gt]: user.points }
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
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user statistics',
        error: error.message
      });
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
      return res.status(500).json({
        success: false,
        message: 'Failed to record progress entry',
        error: error.message
      });
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
        limit = 20,
        page = 1,
        includeUser
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      let whereClause = {};
      let orderBy;
      let includeProgressData = false;

      // Build where clause
      if (tier && tier !== 'all') {
        whereClause.tier = tier;
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
          orderBy = [['level', 'DESC'], ['points', 'DESC']];
          break;
        case 'points':
        default:
          orderBy = [['points', 'DESC']];
          break;
      }

      const includeClause = [
        {
          model: Achievement,
          as: 'primaryBadge',
          attributes: ['id', 'name', 'icon', 'badgeImageUrl'],
          required: false
        }
      ];

      if (includeProgressData) {
        // Add date filtering for progress data based on timeframe
        let progressWhere = {};
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
          'id', 'firstName', 'lastName', 'username', 'photo',
          'points', 'level', 'tier', 'streakDays', 'totalWorkouts',
          'totalExercises', 'badgesPrimary'
        ],
        include: includeClause,
        order: orderBy,
        limit: parseInt(limit),
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

      // Get user's position if requested
      let userRank = null;
      if (includeUser) {
        const userPosition = await User.count({
          where: {
            ...whereClause,
            [metric === 'points' ? 'points' : metric === 'level' ? 'level' : metric === 'streak' ? 'streakDays' : 'totalWorkouts']: {
              [Op.gt]: metric === 'points' ? (await User.findByPk(includeUser))?.points || 0 :
                       metric === 'level' ? (await User.findByPk(includeUser))?.level || 0 :
                       metric === 'streak' ? (await User.findByPk(includeUser))?.streakDays || 0 :
                       (await User.findByPk(includeUser))?.totalWorkouts || 0
            }
          }
        });
        userRank = userPosition + 1;
      }

      const total = await User.count({ where: whereClause });

      return res.status(200).json({
        success: true,
        leaderboard: rankedLeaderboard,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        },
        filters: {
          timeframe,
          metric,
          tier
        },
        userRank
      });
    } catch (error) {
      console.error('❌ Error fetching leaderboard:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch leaderboard',
        error: error.message
      });
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
      const progressData = await this.getProgressDataForTimeframe(userId, timeframe, models);
      
      // Generate comprehensive insights
      const insights = {
        overview: await this.generateOverviewInsights(user, progressData),
        trends: this.calculateDetailedTrends(progressData),
        achievements: await this.getAchievementInsights(userId, models),
        challenges: await this.getChallengeInsights(userId, models),
        recommendations: await this.generateRecommendations(userId, progressData, models),
        goals: await this.getGoalInsights(userId, models),
        social: await this.getSocialInsights(userId, models)
      };

      return res.status(200).json({
        success: true,
        insights,
        timeframe,
        dataPoints: progressData.length
      });
    } catch (error) {
      console.error('❌ Error generating insights:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate progress insights',
        error: error.message
      });
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

  getWeekNumber: (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }
};

export default progressController;
