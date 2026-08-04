/**
 * ============================================================================
 * FILE: Achievement.mjs
 * PURPOSE: Sequelize model for achievement definitions (rarity, criteria, XP)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-23
 * AI VILLAGE VALIDATED: 2026-03-23
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines the Achievement table schema — stores all
 * possible achievements with their criteria, rarity levels, skill trees,
 * point values, and display metadata. Seeded by 4 seeder files.
 *
 * HOW IT FITS IN THE APP:
 *   Seeders → Achievement model ← gamificationController (queries)
 *   Achievement ← UserAchievement (junction to Users)
 *
 * KEY DECISIONS:
 * - INTEGER auto-increment primary key (matches live "Achievements".id serial — the earlier
 *   "UUID for cross-system compatibility" note described an intent that never reached the DB)
 * - Both `title` and `name` fields exist (legacy — `name` is the dedup key)
 * - 6 rarity levels: common, rare, epic, legendary, mythic, secret
 * - 6 skill trees: awakening, forge_nasm, iron_gravity, the_tribe, free_spirit, the_unbroken
 * - 6 achievement categories: fitness, social, streak, milestone, special, community
 *
 * KNOWN ISSUES:
 * - No UNIQUE constraint on `name` (Phase 1 migration target — causes duplicates)
 * - 483 lines — exceeds 300-line rule but acceptable for model definitions
 */

import { DataTypes, Op } from 'sequelize';
import db from '../database.mjs';

const Achievement = db.define('Achievement', {
  // SCHEMA TRUTH (live DB verified 2026-08-03, CLAUDE.md rule 58): "Achievements".id is
  // INTEGER with nextval('"Achievements_id_seq"') — 1,067 live rows. The previous UUID
  // declaration made every Achievement.create() fail (uuid string into int column) and,
  // via belongsTo target-PK inference, silently re-typed UserAchievement.achievementId
  // back to UUID at runtime despite that model's correct INTEGER declaration.
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
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
    type: DataTypes.ENUM('fitness', 'social', 'streak', 'milestone', 'special', 'community'),
    allowNull: false,
    defaultValue: 'fitness'
  },

  // Role targeting — who can earn this achievement
  targetRoles: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: ['user'],
    comment: 'Roles eligible for this achievement',
    validate: {
      isValidRoles(value) {
        const validRoles = ['user', 'client', 'trainer', 'creator', 'moderator'];
        if (!Array.isArray(value) || !value.every(r => validRoles.includes(r))) {
          throw new Error('Invalid target roles');
        }
      }
    }
  },

  // Reward type and issuance
  rewardType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'badge',
    validate: {
      isIn: [['badge', 'title', 'honor', 'discount', 'unlock', 'item']]
    }
  },

  issuance: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'auto',
    validate: {
      isIn: [['auto', 'admin_review', 'admin_award']]
    }
  },

  // Multi-reward support (JSONB array for flexibility without JOIN overhead)
  rewards: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of reward objects: [{type, value, description}]',
    validate: {
      isValidRewardArray(value) {
        if (!Array.isArray(value)) throw new Error('Rewards must be an array');
        const validTypes = ['badge', 'title', 'honor', 'discount', 'unlock', 'item'];
        value.forEach(reward => {
          if (!validTypes.includes(reward.type)) {
            throw new Error(`Invalid reward type: ${reward.type}`);
          }
        });
      }
    }
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
  
  // Octalysis Skill Tree (Crystalline Swan Gamification)
  skillTree: {
    type: DataTypes.ENUM('awakening', 'forge_nasm', 'iron_gravity', 'tribe_social', 'free_spirit', 'unbroken_streaks'),
    allowNull: true,
    comment: 'Octalysis-inspired skill tree branch'
  },

  skillTreeOrder: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Ordering within a skill tree branch'
  },

  templateId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Links to achievement template definitions'
  },

  tierLevel: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
    comment: 'Tier progression level within skill trees'
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
  tableName: 'Achievements',
  freezeTableName: true,
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
  
});

// ── Instance Methods (attached to prototype for Sequelize v4+) ──

Achievement.prototype.isAvailable = function () {
  if (!this.isActive) return false;
  const now = new Date();
  if (this.availableFrom && now < new Date(this.availableFrom)) return false;
  if (this.availableUntil && now > new Date(this.availableUntil)) return false;
  return true;
};

Achievement.prototype.getRarityMultiplier = function () {
  const multipliers = { common: 1.0, rare: 1.5, epic: 2.0, legendary: 3.0 };
  return multipliers[this.rarity] || 1.0;
};

Achievement.prototype.getTotalXpReward = function () {
  return Math.floor(this.xpReward * this.getRarityMultiplier());
};

Achievement.prototype.checkPrerequisites = async function (userId) {
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
};

// NOTE: updateUnlockStats removed per AI Village consensus — O(N) full-table count
// is a performance bottleneck. Stats should be updated via Redis increments + async sync.

// ── Class Methods ──

Achievement.getByCategory = async function (category, includeHidden = false) {
  const whereClause = { category, isActive: true };
  if (!includeHidden) whereClause.isHidden = false;
  return this.findAll({
    where: whereClause,
    order: [['rarity', 'DESC'], ['xpReward', 'DESC']]
  });
};

Achievement.getAvailableForUser = async function (userId) {
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
};

Achievement.getTrending = async function (limit = 10) {
  return this.findAll({
    where: { isActive: true, isHidden: false },
    order: [['shareCount', 'DESC'], ['totalUnlocked', 'DESC']],
    limit
  });
};

// Model associations will be defined in associations.mjs

export default Achievement;
