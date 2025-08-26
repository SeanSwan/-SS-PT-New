/**
 * 📈 PROGRESS DATA MODEL - HISTORICAL PROGRESS TRACKING & ANALYTICS
 * =================================================================
 * Comprehensive progress data tracking for charts, analytics, and insights
 * with automatic aggregation and trend analysis
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const ProgressData = db.define('ProgressData', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  
  // Foreign Key
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  // Date & Time Tracking
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: true
    }
  },
  
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  // Core Gamification Metrics
  xpGained: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  totalXp: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  
  // Activity Metrics
  workoutsCompleted: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  workoutDuration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  exercisesCompleted: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  setsCompleted: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  repsCompleted: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  caloriesBurned: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  // Achievement & Challenge Metrics
  achievementsUnlocked: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  totalAchievements: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  challengesJoined: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  challengesCompleted: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  activeChallenges: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  // Streak & Consistency Metrics
  currentStreak: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  longestStreak: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  consistencyScore: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 10
    }
  },
  
  // Social & Competition Metrics
  leaderboardRank: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    }
  },
  
  totalUsers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  
  friendsConnected: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  socialInteractions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  // Detailed Workout Categories
  strengthWorkouts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  cardioWorkouts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  flexibilityWorkouts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  functionalWorkouts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  // Goal Tracking
  goalsSet: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  goalsCompleted: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  activeGoals: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  // Premium & Business Metrics
  premiumActions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  sessionBookings: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  trainerInteractions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  // Detailed Progress Data
  progressDetails: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  
  workoutBreakdown: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      byType: {},
      byDuration: {},
      byIntensity: {}
    }
  },
  
  achievementBreakdown: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      byCategory: {},
      byRarity: {}
    }
  },
  
  // Mood & Wellness Tracking
  moodRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 10
    }
  },
  
  energyLevel: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 10
    }
  },
  
  motivationLevel: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 10
    }
  },
  
  // Time-Based Aggregations
  weekNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 53
    }
  },
  
  monthNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 12
    }
  },
  
  quarterNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 4
    }
  },
  
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 2020
    }
  },
  
  // Data Source & Quality
  dataSource: {
    type: DataTypes.ENUM('automatic', 'manual', 'imported', 'calculated', 'estimated'),
    allowNull: false,
    defaultValue: 'automatic'
  },
  
  dataQuality: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    defaultValue: 1.00,
    validate: {
      min: 0,
      max: 1
    }
  },
  
  isComplete: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  // Integration & Sync
  lastSyncAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  syncSource: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  externalId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // Timestamps
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'progress_data',
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'date'],
      unique: true
    },
    {
      fields: ['userId', 'year', 'monthNumber']
    },
    {
      fields: ['userId', 'year', 'weekNumber']
    },
    {
      fields: ['date']
    },
    {
      fields: ['totalXp']
    },
    {
      fields: ['level']
    },
    {
      fields: ['currentStreak']
    },
    {
      fields: ['leaderboardRank']
    },
    {
      fields: ['workoutsCompleted']
    },
    {
      fields: ['dataSource', 'dataQuality']
    }
  ],
  
  // Instance Methods
  instanceMethods: {
    // Calculate trend compared to previous period
    async calculateTrend(metric, days = 7) {
      const previousDate = new Date(this.date);
      previousDate.setDate(previousDate.getDate() - days);
      
      const previousData = await ProgressData.findOne({
        where: {
          userId: this.userId,
          date: previousDate.toISOString().split('T')[0]
        }
      });
      
      if (!previousData) return { trend: 'neutral', change: 0, percentage: 0 };
      
      const currentValue = this[metric] || 0;
      const previousValue = previousData[metric] || 0;
      const change = currentValue - previousValue;
      const percentage = previousValue > 0 ? (change / previousValue) * 100 : 0;
      
      let trend = 'neutral';
      if (change > 0) trend = 'up';
      else if (change < 0) trend = 'down';
      
      return { trend, change, percentage };
    },
    
    // Get progress summary
    getProgressSummary() {
      return {
        gamification: {
          xpGained: this.xpGained,
          totalXp: this.totalXp,
          level: this.level,
          achievements: this.achievementsUnlocked,
          totalAchievements: this.totalAchievements
        },
        activity: {
          workouts: this.workoutsCompleted,
          duration: this.workoutDuration,
          exercises: this.exercisesCompleted,
          calories: this.caloriesBurned
        },
        challenges: {
          active: this.activeChallenges,
          completed: this.challengesCompleted,
          joined: this.challengesJoined
        },
        social: {
          rank: this.leaderboardRank,
          totalUsers: this.totalUsers,
          friends: this.friendsConnected,
          interactions: this.socialInteractions
        },
        goals: {
          active: this.activeGoals,
          completed: this.goalsCompleted,
          set: this.goalsSet
        },
        wellness: {
          mood: this.moodRating,
          energy: this.energyLevel,
          motivation: this.motivationLevel
        }
      };
    },
    
    // Calculate percentile rank
    async calculatePercentileRank(metric) {
      const totalUsers = await ProgressData.count({
        where: {
          date: this.date,
          [metric]: { [Op.ne]: null }
        },
        distinct: true,
        col: 'userId'
      });
      
      const betterUsers = await ProgressData.count({
        where: {
          date: this.date,
          [metric]: { [Op.gt]: this[metric] }
        },
        distinct: true,
        col: 'userId'
      });
      
      return totalUsers > 0 ? ((totalUsers - betterUsers) / totalUsers) * 100 : 50;
    },
    
    // Get workout efficiency score
    getWorkoutEfficiency() {
      if (this.workoutDuration === 0) return 0;
      
      const xpPerMinute = this.xpGained / this.workoutDuration;
      const caloriesPerMinute = this.caloriesBurned / this.workoutDuration;
      const exercisesPerMinute = this.exercisesCompleted / this.workoutDuration;
      
      // Normalize and weight the metrics
      return (xpPerMinute * 0.4 + caloriesPerMinute * 0.3 + exercisesPerMinute * 0.3);
    }
  },
  
  // Class Methods
  classMethods: {
    // Get user progress for timeframe
    async getUserProgress(userId, timeframe = 'monthly') {
      let dateFilter;
      const now = new Date();
      
      switch (timeframe) {
        case 'weekly':
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarterly':
          dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'yearly':
          dateFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      return this.findAll({
        where: {
          userId,
          date: { [Op.gte]: dateFilter.toISOString().split('T')[0] }
        },
        order: [['date', 'ASC']]
      });
    },
    
    // Aggregate progress data
    async aggregateUserProgress(userId, timeframe = 'monthly') {
      const progressData = await this.getUserProgress(userId, timeframe);
      
      if (progressData.length === 0) return null;
      
      const totals = progressData.reduce((acc, data) => {
        acc.xpGained += data.xpGained;
        acc.workoutsCompleted += data.workoutsCompleted;
        acc.workoutDuration += data.workoutDuration;
        acc.achievementsUnlocked += data.achievementsUnlocked;
        acc.challengesCompleted += data.challengesCompleted;
        acc.caloriesBurned += data.caloriesBurned;
        return acc;
      }, {
        xpGained: 0,
        workoutsCompleted: 0,
        workoutDuration: 0,
        achievementsUnlocked: 0,
        challengesCompleted: 0,
        caloriesBurned: 0
      });
      
      const averages = {
        averageXpPerDay: totals.xpGained / progressData.length,
        averageWorkoutsPerDay: totals.workoutsCompleted / progressData.length,
        averageDurationPerWorkout: totals.workoutsCompleted > 0 ? 
          totals.workoutDuration / totals.workoutsCompleted : 0
      };
      
      return { ...totals, ...averages, daysTracked: progressData.length };
    },
    
    // Get leaderboard data
    async getLeaderboardData(timeframe = 'monthly', metric = 'totalXp', limit = 50) {
      let dateFilter;
      const now = new Date();
      
      switch (timeframe) {
        case 'weekly':
          dateFilter = now.getDate() - 7;
          break;
        case 'monthly':
          dateFilter = now.getMonth();
          break;
        case 'yearly':
          dateFilter = now.getFullYear();
          break;
        default:
          dateFilter = now.getMonth();
      }
      
      // This is a simplified version - in production, you'd want more sophisticated aggregation
      return this.findAll({
        attributes: [
          'userId',
          [db.fn('MAX', db.col(metric)), 'value'],
          [db.fn('MAX', db.col('totalXp')), 'totalXp'],
          [db.fn('MAX', db.col('level')), 'level'],
          [db.fn('MAX', db.col('currentStreak')), 'currentStreak']
        ],
        where: timeframe === 'weekly' ? {
          date: { [Op.gte]: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
        } : timeframe === 'monthly' ? {
          monthNumber: now.getMonth() + 1,
          year: now.getFullYear()
        } : {
          year: now.getFullYear()
        },
        group: ['userId'],
        order: [[db.fn('MAX', db.col(metric)), 'DESC']],
        limit,
        include: [{
          model: db.models.User,
          attributes: ['id', 'username', 'displayName', 'avatarUrl']
        }]
      });
    },
    
    // Create or update daily progress
    async upsertDailyProgress(userId, date, progressData) {
      const dateStr = new Date(date).toISOString().split('T')[0];
      const dateObj = new Date(dateStr);
      
      const [record, created] = await this.findOrCreate({
        where: { userId, date: dateStr },
        defaults: {
          ...progressData,
          date: dateStr,
          weekNumber: this.getWeekNumber(dateObj),
          monthNumber: dateObj.getMonth() + 1,
          quarterNumber: Math.ceil((dateObj.getMonth() + 1) / 3),
          year: dateObj.getFullYear(),
          timestamp: new Date()
        }
      });
      
      if (!created) {
        await record.update({
          ...progressData,
          timestamp: new Date(),
          updatedAt: new Date()
        });
      }
      
      return record;
    },
    
    // Helper method to get week number
    getWeekNumber(date) {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }
  }
});

// Model associations will be defined in associations.mjs

export default ProgressData;
