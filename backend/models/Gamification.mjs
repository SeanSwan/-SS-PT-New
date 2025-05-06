/**
 * Gamification Model
 * =================
 * Stores user-specific gamification data like experience points, level progress,
 * achievement tracking, and other gamification elements.
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const Gamification = db.define('Gamification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
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
  }
}, {
  timestamps: true
});

export default Gamification;