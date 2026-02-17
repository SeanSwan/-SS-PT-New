/**
 * 🚀 GOAL MODEL - PERSONAL GOAL SETTING & TRACKING SYSTEM
 * =======================================================
 * User-defined goals with deadline management, progress tracking,
 * and milestone-based rewards system
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const Goal = db.define('Goal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  
  // Foreign Key
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  // Goal Identity
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
    allowNull: true,
    validate: {
      len: [0, 1000]
    }
  },
  
  // Goal Configuration
  targetValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  
  currentValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  
  unit: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 50],
      notEmpty: true
    }
  },
  
  // Goal Classification
  category: {
    type: DataTypes.ENUM(
      'fitness', 'strength', 'cardio', 'flexibility', 'nutrition', 
      'weight', 'body_composition', 'mindfulness', 'sleep', 
      'social', 'habit', 'streak', 'custom'
    ),
    allowNull: false,
    defaultValue: 'fitness'
  },
  
  subcategory: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 50]
    }
  },
  
  // Goal Priority & Status
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'medium'
  },
  
  status: {
    type: DataTypes.ENUM('draft', 'active', 'completed', 'paused', 'cancelled', 'failed'),
    allowNull: false,
    defaultValue: 'active'
  },
  
  // Timeline Management
  deadline: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true,
      isAfter: new Date().toISOString()
    }
  },
  
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  estimatedCompletionDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Progress Tracking
  progressPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 100
    }
  },
  
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
  
  // Reward System
  xpReward: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  completionBonus: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  badgeReward: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  customRewards: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  // Goal Configuration
  isPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  
  allowSupporters: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  requiresVerification: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  
  autoComplete: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  // Tracking Configuration
  trackingMethod: {
    type: DataTypes.ENUM('manual', 'automatic', 'integration', 'photo', 'measurement'),
    allowNull: false,
    defaultValue: 'manual'
  },
  
  trackingFrequency: {
    type: DataTypes.ENUM('daily', 'weekly', 'bi_weekly', 'monthly', 'as_needed'),
    allowNull: false,
    defaultValue: 'weekly'
  },
  
  reminderSettings: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      enabled: true,
      frequency: 'weekly',
      time: '09:00',
      days: ['monday', 'wednesday', 'friday']
    }
  },
  
  // Analytics & Intelligence
  difficulty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
    validate: {
      min: 1,
      max: 5
    }
  },
  
  confidenceLevel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    validate: {
      min: 1,
      max: 10
    }
  },
  
  motivationLevel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 8,
    validate: {
      min: 1,
      max: 10
    }
  },
  
  // Performance Metrics
  averageProgressPerWeek: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  
  bestWeekProgress: {
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
  supporters: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  supporterCount: {
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
  
  encouragementCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  // Notes & Reflection
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  reflection: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  obstaclesEncountered: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  lessonsLearned: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  // Integration Data
  connectedApps: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  externalId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  syncSettings: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
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
  },
  
  lastProgressUpdate: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'goals',
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'status']
    },
    {
      fields: ['category', 'priority']
    },
    {
      fields: ['deadline', 'status']
    },
    {
      fields: ['userId', 'category', 'status']
    },
    {
      fields: ['progressPercentage']
    },
    {
      fields: ['isPublic', 'status']
    },
    {
      fields: ['lastProgressUpdate']
    }
  ],
  
  // Instance Methods
  instanceMethods: {
    // Calculate progress percentage
    calculateProgressPercentage() {
      if (this.targetValue === 0) return 0;
      const percentage = (this.currentValue / this.targetValue) * 100;
      return Math.min(percentage, 100);
    },
    
    // Check if goal is overdue
    isOverdue() {
      return new Date() > new Date(this.deadline) && this.status !== 'completed';
    },
    
    // Get days remaining
    getDaysRemaining() {
      const now = new Date();
      const deadline = new Date(this.deadline);
      const diffTime = deadline - now;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },
    
    // Get goal duration
    getDuration() {
      const start = new Date(this.startDate);
      const deadline = new Date(this.deadline);
      const diffTime = deadline - start;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },
    
    // Update progress
    async updateProgress(newValue, notes = null) {
      const oldValue = this.currentValue;
      const oldPercentage = this.progressPercentage;
      
      this.currentValue = Math.max(0, newValue);
      this.progressPercentage = this.calculateProgressPercentage();
      this.lastProgressUpdate = new Date();
      
      // Add to progress history
      if (!this.progressHistory) this.progressHistory = [];
      this.progressHistory.push({
        date: new Date().toISOString(),
        value: this.currentValue,
        change: this.currentValue - oldValue,
        percentage: this.progressPercentage,
        notes: notes
      });
      
      // Check for completion
      if (this.progressPercentage >= 100 && this.status === 'active' && this.autoComplete) {
        this.status = 'completed';
        this.completedAt = new Date();
      }
      
      // Update milestones
      this.checkMilestones();
      
      await this.save();
      return this;
    },
    
    // Check and update milestones
    checkMilestones() {
      if (!this.milestones || this.milestones.length === 0) return;
      
      this.milestones = this.milestones.map(milestone => {
        if (!milestone.achieved && this.progressPercentage >= milestone.percentage) {
          milestone.achieved = true;
          milestone.achievedAt = new Date().toISOString();
        }
        return milestone;
      });
    },
    
    // Get current status with context
    getStatusWithContext() {
      const status = this.status;
      const daysRemaining = this.getDaysRemaining();
      const isOverdue = this.isOverdue();
      
      if (status === 'completed') {
        return { status: 'completed', message: 'Goal completed!' };
      } else if (isOverdue) {
        return { status: 'overdue', message: `Overdue by ${Math.abs(daysRemaining)} days` };
      } else if (daysRemaining <= 7) {
        return { status: 'urgent', message: `${daysRemaining} days remaining` };
      } else if (daysRemaining <= 30) {
        return { status: 'approaching', message: `${daysRemaining} days remaining` };
      } else {
        return { status: 'active', message: `${daysRemaining} days remaining` };
      }
    },
    
    // Calculate estimated completion date
    calculateEstimatedCompletion() {
      if (this.progressPercentage === 0) return null;
      
      const daysElapsed = (new Date() - new Date(this.startDate)) / (1000 * 60 * 60 * 24);
      const progressPerDay = this.progressPercentage / daysElapsed;
      
      if (progressPerDay <= 0) return null;
      
      const remainingProgress = 100 - this.progressPercentage;
      const daysToComplete = remainingProgress / progressPerDay;
      
      const estimatedDate = new Date();
      estimatedDate.setDate(estimatedDate.getDate() + daysToComplete);
      
      return estimatedDate;
    },
    
    // Get goal insights
    getInsights() {
      const daysElapsed = Math.max(1, (new Date() - new Date(this.startDate)) / (1000 * 60 * 60 * 24));
      const expectedProgress = (daysElapsed / this.getDuration()) * 100;
      const actualProgress = this.progressPercentage;
      const progressDifference = actualProgress - expectedProgress;
      
      let insight = '';
      if (progressDifference > 10) {
        insight = 'Ahead of schedule! Great work!';
      } else if (progressDifference < -10) {
        insight = 'Behind schedule. Consider adjusting your approach.';
      } else {
        insight = 'On track to meet your goal.';
      }
      
      return {
        expectedProgress: Math.max(0, Math.min(100, expectedProgress)),
        actualProgress,
        progressDifference,
        insight,
        estimatedCompletion: this.calculateEstimatedCompletion(),
        averageProgressPerDay: actualProgress / daysElapsed
      };
    }
  },
  
  // Class Methods
  classMethods: {
    // Get user's active goals
    async getUserActiveGoals(userId) {
      return this.findAll({
        where: {
          userId,
          status: ['active', 'paused']
        },
        order: [
          ['priority', 'DESC'],
          ['deadline', 'ASC']
        ]
      });
    },
    
    // Get overdue goals
    async getOverdueGoals(userId) {
      return this.findAll({
        where: {
          userId,
          status: 'active',
          deadline: { [Op.lt]: new Date() }
        }
      });
    },
    
    // Get goals by category
    async getGoalsByCategory(userId, category) {
      return this.findAll({
        where: {
          userId,
          category,
          status: ['active', 'completed', 'paused']
        },
        order: [['createdAt', 'DESC']]
      });
    },
    
    // Get goal completion stats
    async getCompletionStats(userId) {
      const totalGoals = await this.count({ where: { userId } });
      const completedGoals = await this.count({ 
        where: { userId, status: 'completed' } 
      });
      const activeGoals = await this.count({ 
        where: { userId, status: 'active' } 
      });
      const overdueGoals = await this.count({ 
        where: { 
          userId, 
          status: 'active',
          deadline: { [Op.lt]: new Date() }
        } 
      });
      
      return {
        total: totalGoals,
        completed: completedGoals,
        active: activeGoals,
        overdue: overdueGoals,
        completionRate: totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0
      };
    }
  }
});

// Model associations will be defined in associations.mjs

export default Goal;
