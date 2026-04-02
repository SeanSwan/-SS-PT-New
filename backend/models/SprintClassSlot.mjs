/**
 * ============================================================================
 * FILE: SprintClassSlot.mjs
 * PURPOSE: A scheduled bootcamp class within a sprint week
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 */

import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

const SprintClassSlot = sequelize.define('SprintClassSlot', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  weekId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  sprintId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  templateId: {
    type: DataTypes.INTEGER,
  },
  classLogId: {
    type: DataTypes.INTEGER,
  },
  dayOfWeek: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  scheduledDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  dayType: {
    type: DataTypes.STRING(30),
    defaultValue: 'full_body',
  },
  classFormat: {
    type: DataTypes.STRING(30),
    defaultValue: 'stations_4x',
  },
  classStyle: {
    type: DataTypes.STRING(30),
    defaultValue: 'standard',
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'planned',
    validate: {
      isIn: [['planned', 'generated', 'taught', 'skipped']],
    },
  },
  wasUsed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  usedDate: {
    type: DataTypes.DATEONLY,
  },
  trainerConfirmedAt: {
    type: DataTypes.DATE,
  },
  exerciseKeys: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  generatedClassData: {
    type: DataTypes.JSONB,
  },
  notes: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'sprint_class_slots',
  timestamps: true,
});

export default SprintClassSlot;
