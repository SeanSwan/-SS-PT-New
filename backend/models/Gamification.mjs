/**
 * ============================================================================
 * FILE: Gamification.mjs
 * PURPOSE: Per-user gamification state model (XP, level, tier, streaks)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-23
 * AI VILLAGE VALIDATED: 2026-03-23
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Stores each user's current gamification state —
 * total XP, current level, tier, streak count, last activity date.
 * One row per user. FK to Users table.
 *
 * HOW IT FITS IN THE APP: gamificationController reads/writes this model
 * to track user progress. levelingAlgorithm calculates level from totalPoints.
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const Gamification = db.define('Gamification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  experience: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  totalXP: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  streakCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  achievements: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  badges: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  lastUpdateDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  totalWorkouts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  totalExercises: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  longestStreak: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  currentTier: {
    type: DataTypes.ENUM('bronze', 'silver', 'gold', 'platinum'),
    allowNull: false,
    defaultValue: 'bronze'
  },
  nextTierProgress: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  activityLog: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  // ── Streak Freeze System (Loss Aversion Psychology) ──
  // Users earn freeze tokens through consistency (1 per 7-day streak, max 3).
  // A freeze protects the streak for 1 missed day, reducing anxiety.
  streakFreezes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  streakFreezesUsed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  lastStreakFreezeUsed: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastStreakFreezeEarned: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // ── Aegis HUD: RPG Needs System (V2 Feature) ──
  // 5 needs bars: athletic, recovery, social, discipline, vitality
  // Each stores { value: 0-100, lastUpdated: ISO string }
  // Decay calculated on read — no cron needed
  needsState: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      athletic:   { value: 50, lastUpdated: new Date().toISOString() },
      recovery:   { value: 50, lastUpdated: new Date().toISOString() },
      social:     { value: 50, lastUpdated: new Date().toISOString() },
      discipline: { value: 50, lastUpdated: new Date().toISOString() },
      vitality:   { value: 50, lastUpdated: new Date().toISOString() },
    }
  },
  lastNeedsCalculation: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // ── Job Class System (V2 Feature) ──
  // FFXIV-style: paladin, monk, ranger, white_mage, dark_knight
  jobClass: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: null
  },
  // ── Moodlet: derived from needs state ──
  currentMoodlet: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'neutral'
  }
}, {
  timestamps: true
});

export default Gamification;