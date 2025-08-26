/**
 * 🏆 USER ACHIEVEMENT MODEL - USER ACHIEVEMENT PROGRESS TRACKING
 * ==============================================================
 * Junction model tracking user achievement progress with detailed analytics,
 * social sharing, and timeline management
 */

import { DataTypes, Op } from 'sequelize';
import db from '../database.mjs';

const UserAchievement = db.define('UserAchievement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  
  // Foreign Keys
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  achievementId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Achievements',
      key: 'id'
    }
  },
  
  // Progress Tracking
  progress: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  
  maxProgress: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 1.00,
    validate: {
      min: 0
    }
  },
  
  progressPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 100
    }
  },
  
  // Status Tracking
  isCompleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  
  isNew: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  isViewed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  
  // Timeline Management
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  earnedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  unlockedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  lastProgressUpdate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  viewedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Reward Tracking
  xpAwarded: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  pointsAwarded: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  bonusRewards: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  // Progress History
  progressHistory: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  milestones: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  // Social Features
  shareCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  sharedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  socialPlatforms: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  reactions: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  
  // Notification Management
  notificationSent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  
  notificationSentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  remindersSent: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  // Performance Metrics
  timeToComplete: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  
  difficulty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
    validate: {
      min: 1,
      max: 5
    }
  },
  
  effortScore: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 5.00,
    validate: {
      min: 1,
      max: 10
    }
  },
  
  // User Experience
  userRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  
  userFeedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  motivationLevel: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 10
    }
  },
  
  // Analytics Data
  viewCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  engagementScore: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 10
    }
  },
  
  // Custom Data
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  
  customNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  tags: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  // Verification (for achievements that require it)
  isVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  
  verifiedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  verificationEvidence: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
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
  tableName: 'user_achievements',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'achievementId']
    },
    {
      fields: ['userId', 'isCompleted']
    },
    {
      fields: ['userId', 'isNew', 'isViewed']
    },
    {
      fields: ['achievementId', 'isCompleted']
    },
    {
      fields: ['earnedAt']
    },
    {
      fields: ['progressPercentage']
    },
    {
      fields: ['shareCount']
    },
    {
      fields: ['lastProgressUpdate']
    }
  ],
  
  // Instance Methods
  instanceMethods: {
    // Update progress with history tracking
    async updateProgress(newProgress, notes = null) {
      const oldProgress = this.progress;
      const oldPercentage = this.progressPercentage;
      
      this.progress = Math.max(0, newProgress);
      this.progressPercentage = this.maxProgress > 0 ? 
        Math.min((this.progress / this.maxProgress) * 100, 100) : 0;
      this.lastProgressUpdate = new Date();
      
      // Add to progress history
      if (!this.progressHistory) this.progressHistory = [];
      this.progressHistory.push({
        date: new Date().toISOString(),
        progress: this.progress,
        progressChange: this.progress - oldProgress,
        percentage: this.progressPercentage,
        notes: notes
      });
      
      // Keep only last 50 progress updates
      if (this.progressHistory.length > 50) {
        this.progressHistory = this.progressHistory.slice(-50);
      }
      
      // Check for completion
      if (this.progressPercentage >= 100 && !this.isCompleted) {
        await this.complete();
      }
      
      await this.save();
      return this;
    },
    
    // Mark achievement as completed
    async complete() {
      if (this.isCompleted) return this;
      
      this.isCompleted = true;
      this.earnedAt = new Date();
      this.unlockedAt = new Date();
      this.progressPercentage = 100;
      this.isNew = true;
      
      // Calculate time to complete
      if (this.startedAt) {
        this.timeToComplete = Math.floor(
          (new Date() - new Date(this.startedAt)) / (1000 * 60 * 60 * 24)
        );
      }
      
      // Award XP and points
      const achievement = await db.models.Achievement.findByPk(this.achievementId);
      if (achievement) {
        this.xpAwarded = achievement.getTotalXpReward();
        this.pointsAwarded = achievement.requiredPoints || 0;
        
        // Update user's total XP
        const user = await db.models.User.findByPk(this.userId);
        if (user && user.gamification) {
          await user.gamification.update({
            totalXp: user.gamification.totalXp + this.xpAwarded,
            totalPoints: user.gamification.totalPoints + this.pointsAwarded
          });
        }
      }
      
      await this.save();
      return this;
    },
    
    // Share achievement on social platform
    async share(platform) {
      this.shareCount += 1;
      this.sharedAt = new Date();
      
      if (!this.socialPlatforms) this.socialPlatforms = [];
      if (!this.socialPlatforms.includes(platform)) {
        this.socialPlatforms.push(platform);
      }
      
      // Update achievement's total share count
      const achievement = await db.models.Achievement.findByPk(this.achievementId);
      if (achievement) {
        await achievement.update({
          shareCount: achievement.shareCount + 1
        });
      }
      
      await this.save();
      return this;
    },
    
    // Mark as viewed
    async markAsViewed() {
      if (!this.isViewed) {
        this.isViewed = true;
        this.viewedAt = new Date();
        this.isNew = false;
        this.viewCount += 1;
        
        await this.save();
      }
      return this;
    },
    
    // Calculate completion speed score
    getCompletionSpeedScore() {
      if (!this.isCompleted || !this.timeToComplete) return 0;
      
      // Score based on how quickly achievement was completed relative to average
      const achievement = this.Achievement;
      if (!achievement || !achievement.averageTimeToUnlock) return 5;
      
      const ratio = this.timeToComplete / achievement.averageTimeToUnlock;
      
      if (ratio <= 0.5) return 10; // Extremely fast
      if (ratio <= 0.75) return 8;  // Very fast
      if (ratio <= 1.0) return 6;   // Average speed
      if (ratio <= 1.5) return 4;   // Slow
      return 2; // Very slow
    },
    
    // Get achievement statistics
    getStats() {
      return {
        progress: this.progress,
        progressPercentage: this.progressPercentage,
        isCompleted: this.isCompleted,
        timeToComplete: this.timeToComplete,
        xpAwarded: this.xpAwarded,
        shareCount: this.shareCount,
        viewCount: this.viewCount,
        effortScore: this.effortScore,
        completionSpeedScore: this.getCompletionSpeedScore(),
        daysSinceStarted: this.getDaysSinceStarted(),
        progressUpdates: this.progressHistory ? this.progressHistory.length : 0
      };
    },
    
    // Get days since started
    getDaysSinceStarted() {
      const start = new Date(this.startedAt);
      const now = new Date();
      const diffTime = now - start;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  },
  
  // Class Methods
  classMethods: {
    // Get user's achievements with filters
    async getUserAchievements(userId, filters = {}) {
      const whereClause = { userId };
      
      if (filters.completed !== undefined) {
        whereClause.isCompleted = filters.completed;
      }
      
      if (filters.category) {
        // This would need to be joined with Achievement model
      }
      
      return this.findAll({
        where: whereClause,
        include: [{
          model: db.models.Achievement,
          where: filters.category ? { category: filters.category } : undefined
        }],
        order: [
          ['isNew', 'DESC'],
          ['earnedAt', 'DESC'],
          ['progressPercentage', 'DESC']
        ]
      });
    },
    
    // Get user's recent achievements
    async getRecentAchievements(userId, limit = 5) {
      return this.findAll({
        where: {
          userId,
          isCompleted: true
        },
        include: [{
          model: db.models.Achievement
        }],
        order: [['earnedAt', 'DESC']],
        limit
      });
    },
    
    // Get user's achievement progress
    async getUserProgress(userId) {
      const totalAchievements = await db.models.Achievement.count({
        where: { isActive: true, isHidden: false }
      });
      
      const userAchievements = await this.count({
        where: { userId }
      });
      
      const completedAchievements = await this.count({
        where: { userId, isCompleted: true }
      });
      
      const totalXp = await this.sum('xpAwarded', {
        where: { userId, isCompleted: true }
      }) || 0;
      
      return {
        totalAchievements,
        userAchievements,
        completedAchievements,
        totalXp,
        completionRate: userAchievements > 0 ? 
          (completedAchievements / userAchievements) * 100 : 0,
        availableRate: totalAchievements > 0 ? 
          (userAchievements / totalAchievements) * 100 : 0
      };
    },
    
    // Award achievement to user
    async awardAchievement(userId, achievementId, initialProgress = 0) {
      const [userAchievement, created] = await this.findOrCreate({
        where: { userId, achievementId },
        defaults: {
          userId,
          achievementId,
          progress: initialProgress,
          startedAt: new Date()
        }
      });
      
      if (created && initialProgress > 0) {
        await userAchievement.updateProgress(initialProgress);
      }
      
      return userAchievement;
    }
  }
});

// Model associations will be defined in associations.mjs

export default UserAchievement;
