/**
 * Streak Model - Dedicated Streak Tracking System
 * ================================================
 * Independent streak tracking for workouts, logins, goals, challenges.
 * Supports freeze mechanics (premium) and streak history.
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const Streak = db.define('Streak', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  // What this streak tracks
  streakType: {
    type: DataTypes.ENUM('workout', 'login', 'goal_progress', 'challenge', 'custom'),
    allowNull: false,
    defaultValue: 'workout',
  },
  // Current state
  currentCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  longestCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  lastActivityDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date of last qualifying activity (YYYY-MM-DD)',
  },
  // Freeze mechanics (premium)
  freezesRemaining: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of freeze days available (premium feature)',
  },
  freezesUsed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  lastFreezeDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  // XP rewards
  xpEarnedFromStreak: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  // State
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  brokenAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  brokenReason: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Why the streak was broken (missed, manual_reset, etc)',
  },
  // History
  history: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of { date, action, count } entries',
  },
}, {
  tableName: 'streaks',
  timestamps: true,
  indexes: [
    { fields: ['userId', 'streakType'], unique: true },
    { fields: ['userId', 'isActive'] },
    { fields: ['currentCount'] },
    { fields: ['longestCount'] },
  ],
});

export default Streak;
