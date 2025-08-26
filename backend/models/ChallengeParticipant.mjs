/**
 * 🎯 CHALLENGE PARTICIPANT MODEL - CHALLENGE PARTICIPATION TRACKING
 * ================================================================
 * Junction model for many-to-many relationship between Users and Challenges
 * with detailed progress tracking and participant management
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const ChallengeParticipant = db.define('ChallengeParticipant', {
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
  
  challengeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Challenges',
      key: 'id'
    }
  },
  
  // Participation Status
  status: {
    type: DataTypes.ENUM('joined', 'active', 'completed', 'failed', 'quit', 'disqualified'),
    allowNull: false,
    defaultValue: 'joined'
  },
  
  // Progress Tracking
  currentProgress: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
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
  
  // Performance Metrics
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  rank: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    }
  },
  
  // XP and Rewards
  xpEarned: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  bonusXpEarned: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  badgesEarned: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  // Timeline Tracking
  joinedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  lastProgressUpdate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Team Participation (if challenge allows teams)
  teamId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'ChallengeTeams',
      key: 'id'
    }
  },
  
  isTeamLeader: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  
  // Engagement Metrics
  checkInsCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  streakDays: {
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
  
  // Progress History (for charts and analytics)
  progressHistory: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  dailyProgress: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  
  // Performance Analytics
  averageDailyProgress: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  
  bestSingleDayProgress: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    defaultValue: 0.00,
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
  
  // Social Features
  isPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  allowFriendUpdates: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  shareAchievements: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  // Notification Preferences
  receiveReminders: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  receiveEncouragement: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  reminderFrequency: {
    type: DataTypes.ENUM('daily', 'every_2_days', 'weekly', 'never'),
    allowNull: false,
    defaultValue: 'daily'
  },
  
  // Additional Metadata
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  motivation: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Verification for challenges that require it
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
  
  verificationNotes: {
    type: DataTypes.TEXT,
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
  tableName: 'challenge_participants',
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'challengeId'],
      unique: true
    },
    {
      fields: ['challengeId', 'status']
    },
    {
      fields: ['userId', 'status']
    },
    {
      fields: ['challengeId', 'rank']
    },
    {
      fields: ['challengeId', 'score']
    },
    {
      fields: ['challengeId', 'progressPercentage']
    },
    {
      fields: ['teamId']
    },
    {
      fields: ['lastProgressUpdate']
    }
  ],
  
  // Instance Methods
  instanceMethods: {
    // Calculate progress percentage
    calculateProgressPercentage(challengeMaxProgress) {
      if (!challengeMaxProgress || challengeMaxProgress === 0) return 0;
      return Math.min((this.currentProgress / challengeMaxProgress) * 100, 100);
    },
    
    // Check if participant completed the challenge
    isCompleted(challengeMaxProgress) {
      return this.currentProgress >= challengeMaxProgress;
    },
    
    // Update progress with history tracking
    async updateProgress(newProgress, challengeMaxProgress) {
      const oldProgress = this.currentProgress;
      this.currentProgress = newProgress;
      this.progressPercentage = this.calculateProgressPercentage(challengeMaxProgress);
      this.lastProgressUpdate = new Date();
      
      // Add to progress history
      if (!this.progressHistory) this.progressHistory = [];
      this.progressHistory.push({
        date: new Date().toISOString(),
        progress: newProgress,
        progressChange: newProgress - oldProgress
      });
      
      // Update daily progress
      const today = new Date().toISOString().split('T')[0];
      if (!this.dailyProgress) this.dailyProgress = {};
      this.dailyProgress[today] = (this.dailyProgress[today] || 0) + (newProgress - oldProgress);
      
      // Check for completion
      if (this.isCompleted(challengeMaxProgress) && this.status !== 'completed') {
        this.status = 'completed';
        this.completedAt = new Date();
      }
      
      await this.save();
      return this;
    },
    
    // Calculate streak
    calculateStreak() {
      if (!this.dailyProgress) return 0;
      
      const sortedDates = Object.keys(this.dailyProgress).sort().reverse();
      let streak = 0;
      let checkDate = new Date();
      
      for (let i = 0; i < sortedDates.length; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (this.dailyProgress[dateStr] && this.dailyProgress[dateStr] > 0) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      
      return streak;
    },
    
    // Get participant stats
    getStats() {
      return {
        currentProgress: this.currentProgress,
        progressPercentage: this.progressPercentage,
        score: this.score,
        rank: this.rank,
        xpEarned: this.xpEarned + this.bonusXpEarned,
        streakDays: this.streakDays,
        checkInsCount: this.checkInsCount,
        consistencyScore: this.consistencyScore,
        isCompleted: this.status === 'completed',
        daysParticipating: this.getDaysParticipating()
      };
    },
    
    // Get days participating
    getDaysParticipating() {
      const start = this.startedAt || this.joinedAt;
      const end = this.completedAt || new Date();
      const diffTime = end - start;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  },
  
  // Class Methods
  classMethods: {
    // Get leaderboard for a challenge
    async getChallengeLeaderboard(challengeId, limit = 50) {
      return this.findAll({
        where: {
          challengeId,
          status: ['active', 'completed']
        },
        order: [
          ['score', 'DESC'],
          ['progressPercentage', 'DESC'],
          ['completedAt', 'ASC']
        ],
        limit,
        include: [{
          model: db.models.User,
          attributes: ['id', 'username', 'displayName', 'avatarUrl']
        }]
      });
    },
    
    // Get user's active participations
    async getUserActiveParticipations(userId) {
      return this.findAll({
        where: {
          userId,
          status: ['joined', 'active']
        },
        include: [{
          model: db.models.Challenge,
          where: {
            status: 'active'
          }
        }]
      });
    },
    
    // Calculate challenge completion rate
    async getChallengeCompletionRate(challengeId) {
      const totalParticipants = await this.count({
        where: { challengeId }
      });
      
      const completedParticipants = await this.count({
        where: {
          challengeId,
          status: 'completed'
        }
      });
      
      return totalParticipants > 0 ? (completedParticipants / totalParticipants) * 100 : 0;
    }
  }
});

// Model associations will be defined in associations.mjs

export default ChallengeParticipant;
