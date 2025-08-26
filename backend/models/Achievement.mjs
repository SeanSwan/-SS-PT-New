/**
 * 🏆 ACHIEVEMENT MODEL - ENHANCED GAMIFICATION ACHIEVEMENTS
 * ========================================================
 * Complete achievement system with rarity, progress tracking,
 * social sharing, and advanced business logic
 */

import { DataTypes, Op } from 'sequelize';
import db from '../database.mjs';

const Achievement = db.define('Achievement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  
  // Achievement Identity
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 100],
      notEmpty: true
    }
  },
  
  name: {
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
      len: [10, 500],
      notEmpty: true
    }
  },
  
  // Visual Elements
  iconEmoji: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '🏆',
    validate: {
      len: [1, 10]
    }
  },
  
  iconUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  
  // Achievement Classification
  category: {
    type: DataTypes.ENUM('fitness', 'social', 'streak', 'milestone', 'special'),
    allowNull: false,
    defaultValue: 'fitness'
  },
  
  rarity: {
    type: DataTypes.ENUM('common', 'rare', 'epic', 'legendary'),
    allowNull: false,
    defaultValue: 'common'
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
  
  requiredPoints: {
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
  
  // Progress Configuration
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
      isIn: [['completion', 'workouts', 'points', 'days', 'exercises', 'calories', 'sessions', 'custom']]
    }
  },
  
  // Requirements and Logic
  requirements: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  unlockConditions: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  
  prerequisiteAchievements: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  // Status and Availability
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  
  isHidden: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  
  isSecret: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  
  isLimited: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  
  availableFrom: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  availableUntil: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Analytics and Stats
  totalUnlocked: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  unlockRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 100
    }
  },
  
  averageTimeToUnlock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
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
  
  allowSharing: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
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
  
  // Gamification Logic
  difficulty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
    validate: {
      min: 1,
      max: 5
    }
  },
  
  estimatedDuration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  
  tags: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  
  // Business Intelligence
  businessValue: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 1.00,
    validate: {
      min: 0,
      max: 10
    }
  },
  
  conversionImpact: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 10
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
  tableName: 'achievements',
  timestamps: true,
  indexes: [
    {
      fields: ['category', 'rarity']
    },
    {
      fields: ['isActive', 'isHidden']
    },
    {
      fields: ['difficulty']
    },
    {
      fields: ['totalUnlocked']
    },
    {
      fields: ['unlockRate']
    },
    {
      fields: ['isPremium']
    },
    {
      fields: ['availableFrom', 'availableUntil']
    }
  ],
  
  // Instance Methods
  instanceMethods: {
    // Check if achievement is available
    isAvailable() {
      if (!this.isActive) return false;
      
      const now = new Date();
      if (this.availableFrom && now < new Date(this.availableFrom)) return false;
      if (this.availableUntil && now > new Date(this.availableUntil)) return false;
      
      return true;
    },
    
    // Calculate rarity multiplier for XP
    getRarityMultiplier() {
      const multipliers = {
        'common': 1.0,
        'rare': 1.5,
        'epic': 2.0,
        'legendary': 3.0
      };
      return multipliers[this.rarity] || 1.0;
    },
    
    // Get total XP reward with rarity bonus
    getTotalXpReward() {
      return Math.floor(this.xpReward * this.getRarityMultiplier());
    },
    
    // Check if user meets prerequisites
    async checkPrerequisites(userId) {
      if (!this.prerequisiteAchievements || this.prerequisiteAchievements.length === 0) {
        return true;
      }
      
      const userAchievements = await db.models.UserAchievement.findAll({
        where: {
          userId,
          achievementId: { [Op.in]: this.prerequisiteAchievements }
        }
      });
      
      return userAchievements.length >= this.prerequisiteAchievements.length;
    },
    
    // Update unlock statistics
    async updateUnlockStats() {
      const totalUsers = await db.models.User.count();
      const unlockedCount = await db.models.UserAchievement.count({
        where: { achievementId: this.id }
      });
      
      this.totalUnlocked = unlockedCount;
      this.unlockRate = totalUsers > 0 ? (unlockedCount / totalUsers) * 100 : 0;
      
      await this.save();
    }
  },
  
  // Class Methods
  classMethods: {
    // Get achievements by category
    async getByCategory(category, includeHidden = false) {
      const whereClause = {
        category,
        isActive: true
      };
      
      if (!includeHidden) {
        whereClause.isHidden = false;
      }
      
      return this.findAll({
        where: whereClause,
        order: [['rarity', 'DESC'], ['xpReward', 'DESC']]
      });
    },
    
    // Get available achievements for user
    async getAvailableForUser(userId) {
      const now = new Date();
      const userAchievements = await db.models.UserAchievement.findAll({
        where: { userId },
        attributes: ['achievementId']
      });
      
      const unlockedIds = userAchievements.map(ua => ua.achievementId);
      
      return this.findAll({
        where: {
          isActive: true,
          isHidden: false,
          id: { [Op.notIn]: unlockedIds },
          [Op.or]: [
            { availableFrom: null },
            { availableFrom: { [Op.lte]: now } }
          ],
          [Op.or]: [
            { availableUntil: null },
            { availableUntil: { [Op.gte]: now } }
          ]
        },
        order: [['difficulty', 'ASC'], ['xpReward', 'ASC']]
      });
    },
    
    // Get trending achievements
    async getTrending(limit = 10) {
      return this.findAll({
        where: {
          isActive: true,
          isHidden: false
        },
        order: [['shareCount', 'DESC'], ['totalUnlocked', 'DESC']],
        limit
      });
    }
  }
});

// Model associations will be defined in associations.mjs

export default Achievement;
