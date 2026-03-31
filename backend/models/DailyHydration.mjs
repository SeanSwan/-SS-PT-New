/**
 * ============================================================================
 * FILE: DailyHydration.mjs
 * PURPOSE: Tracks daily water intake per user (glasses filled out of goal)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: Pending
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Stores one row per user per day with glasses filled
 * and daily goal. Replaces localStorage-based hydration tracking.
 * HOW IT FITS IN THE APP: NutritionWorkspace → Hydration tab → POST/GET /api/hydration
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class DailyHydration extends Model {}

DailyHydration.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  glassesFilled: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0, max: 30 },
    comment: 'Number of glasses consumed today',
  },
  dailyGoal: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 8,
    validate: { min: 1, max: 30 },
    comment: 'Target glasses per day (default 8 = 64oz)',
  },
  glassOz: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 8,
    validate: { min: 1, max: 32 },
    comment: 'Ounces per glass (default 8oz)',
  },
}, {
  sequelize,
  modelName: 'DailyHydration',
  tableName: 'daily_hydrations',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['userId', 'date'] },
  ],
});

export default DailyHydration;
