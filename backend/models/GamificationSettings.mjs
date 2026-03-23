/**
 * ============================================================================
 * FILE: GamificationSettings.mjs
 * PURPOSE: Singleton config model — admin-adjustable point values & multipliers
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-23
 * AI VILLAGE VALIDATED: 2026-03-23
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Stores global gamification config — points per workout,
 * per exercise, per streak, multiplier cap, enabled/disabled toggle. Single
 * row in DB. Admin edits via /api/gamification/settings endpoint.
 *
 * HOW IT FITS IN THE APP: gamificationController reads settings before
 * awarding points. Admin dashboard allows editing without code changes.
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const GamificationSettings = db.define('GamificationSettings', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  isEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  pointsPerWorkout: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 50
  },
  pointsPerExercise: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10
  },
  pointsPerStreak: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 20
  },
  pointsPerLevel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100
  },
  pointsPerReview: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 15
  },
  pointsPerReferral: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 200
  },
  tierThresholds: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      bronze: 0,
      silver: 1000,
      gold: 5000,
      platinum: 20000
    }
  },
  levelRequirements: {
    type: DataTypes.JSON,
    allowNull: true
  },
  pointsMultiplier: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0
  },
  enableLeaderboards: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  enableNotifications: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  autoAwardAchievements: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  timestamps: true
});

export default GamificationSettings;