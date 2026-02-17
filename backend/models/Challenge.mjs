/**
 * 🎯 CHALLENGE MODEL - COMPREHENSIVE CHALLENGE SYSTEM
 * ==================================================
 * Complete challenge model supporting all challenge types with business logic
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const Challenge = db.define('Challenge', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  
  // Challenge Identity
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 100],
      notEmpty: true
    }
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 1000],
      notEmpty: true
    }
  },
  
  // Challenge Classification
  challengeType: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'community', 'custom'),
    allowNull: false,
    defaultValue: 'daily'
  },
  
  difficulty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    },
    defaultValue: 3
  },
  
  category: {
    type: DataTypes.ENUM('fitness', 'nutrition', 'mindfulness', 'social', 'streak'),
    allowNull: false,
    defaultValue: 'fitness'
  },
  
  // Reward System
  xpReward: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
    validate: {
      min: 0
    }
  },
  
  bonusXpReward: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  // Participation Management
  maxParticipants: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    }
  },
  
  currentParticipants: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  // Progress Tracking
  maxProgress: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  
  progressUnit: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'completion',
    validate: {
      isIn: [['completion', 'workouts', 'minutes', 'calories', 'sessions', 'days', 'points', 'custom']]
    }
  },
  
  // Time Management
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isAfterStart(value) {
        if (value <= this.startDate) {
          throw new Error('End date must be after start date');
        }
      }
    }
  },
  
  // Challenge Creator
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  // Challenge Requirements
  requirements: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  // Challenge Tags
  tags: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  // Challenge Status
  status: {
    type: DataTypes.ENUM('draft', 'active', 'completed', 'cancelled', 'archived'),
    allowNull: false,
    defaultValue: 'active'
  },
  
  isPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  isFeatured: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  
  // Business Intelligence
  completionRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 100
    }
  },
  
  averageProgress: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    defaultValue: 0.00,
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
  
  // Advanced Configuration
  autoComplete: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  allowEarlyCompletion: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  requireVerification: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  
  // Premium Features
  isPremium: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  
  premiumBenefits: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  
  // Leaderboard Configuration
  hasLeaderboard: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  leaderboardType: {
    type: DataTypes.ENUM('progress', 'completion_time', 'total_score', 'custom'),
    allowNull: false,
    defaultValue: 'progress'
  },
  
  // Social Features
  allowTeams: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  
  maxTeamSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 2
    }
  },
  
  // Notification Settings
  sendStartNotification: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  sendProgressNotifications: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  sendCompletionNotification: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  // Analytics Tracking
  viewCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  shareCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  likeCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
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
  tableName: 'challenges',
  timestamps: true,
  indexes: [
    {
      fields: ['challengeType', 'status']
    },
    {
      fields: ['category', 'difficulty']
    },
    {
      fields: ['startDate', 'endDate']
    },
    {
      fields: ['createdBy']
    },
    {
      fields: ['isPremium', 'isFeatured']
    },
    {
      fields: ['completionRate']
    },
    {
      fields: ['engagementScore']
    }
  ],
  
  // Instance Methods
  instanceMethods: {
    // Check if challenge is active
    isActive() {
      const now = new Date();
      return this.status === 'active' && 
             now >= this.startDate && 
             now <= this.endDate;
    },
    
    // Check if challenge is full
    isFull() {
      return this.maxParticipants && 
             this.currentParticipants >= this.maxParticipants;
    },
    
    // Calculate days remaining
    getDaysRemaining() {
      const now = new Date();
      const end = new Date(this.endDate);
      const diffTime = end - now;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },
    
    // Get challenge duration in days
    getDuration() {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      const diffTime = end - start;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  },
  
  // Class Methods
  classMethods: {
    // Get active challenges
    async getActiveChallenges() {
      const now = new Date();
      return this.findAll({
        where: {
          status: 'active',
          startDate: { [Op.lte]: now },
          endDate: { [Op.gte]: now }
        }
      });
    },
    
    // Get featured challenges
    async getFeaturedChallenges() {
      return this.findAll({
        where: {
          isFeatured: true,
          status: 'active'
        },
        order: [['engagementScore', 'DESC']]
      });
    },
    
    // Get challenges by category
    async getChallengesByCategory(category) {
      return this.findAll({
        where: {
          category,
          status: 'active'
        },
        order: [['completionRate', 'DESC']]
      });
    }
  }
});

// Model associations will be defined in associations.mjs

export default Challenge;
