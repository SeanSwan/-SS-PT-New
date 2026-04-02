/**
 * ============================================================================
 * FILE: BootcampSprint.mjs
 * PURPOSE: 3-month bootcamp sprint planning container with exercise memory
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 */

import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

const BootcampSprint = sequelize.define('BootcampSprint', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  trainerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(200),
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
  durationWeeks: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 12,
  },
  classesPerWeek: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
  },
  frequencyPattern: {
    type: DataTypes.JSONB,
    defaultValue: ['monday', 'wednesday', 'friday'],
  },
  focusRotation: {
    type: DataTypes.JSONB,
    defaultValue: ['lower_body', 'upper_body', 'full_body'],
  },
  defaultFormat: {
    type: DataTypes.STRING(30),
    defaultValue: 'stations_4x',
  },
  defaultStyle: {
    type: DataTypes.STRING(30),
    defaultValue: 'standard',
  },
  spaceProfileId: {
    type: DataTypes.INTEGER,
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'draft',
    validate: {
      isIn: [['draft', 'generating', 'active', 'completed', 'archived']],
    },
  },
  progressionStrategy: {
    type: DataTypes.STRING(20),
    defaultValue: 'linear',
    validate: {
      isIn: [['linear', 'undulating', 'block', 'random']],
    },
  },
  totalClassesPlanned: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  totalClassesCompleted: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  previousSprintId: {
    type: DataTypes.INTEGER,
  },
  notes: {
    type: DataTypes.TEXT,
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  generationVersion: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
}, {
  tableName: 'bootcamp_sprints',
  timestamps: true,
});

export default BootcampSprint;
