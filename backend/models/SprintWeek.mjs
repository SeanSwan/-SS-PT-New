/**
 * ============================================================================
 * FILE: SprintWeek.mjs
 * PURPOSE: One week within a bootcamp sprint cycle
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 */

import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

const SprintWeek = sequelize.define('SprintWeek', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  sprintId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  weekNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  theme: {
    type: DataTypes.STRING(100),
  },
  isDeloadWeek: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  intensityModifier: {
    type: DataTypes.FLOAT,
    defaultValue: 1.0,
  },
  notes: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'sprint_weeks',
  timestamps: true,
});

export default SprintWeek;
