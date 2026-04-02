/**
 * ============================================================================
 * FILE: BootcampStretch.mjs
 * PURPOSE: Stretch exercises for bootcamp warm-up/cool-down sequences
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines the BootcampStretch model for 3-5 minute
 * targeted stretch sequences attached to bootcamp templates.
 * HOW IT FITS IN THE APP: BootcampTemplate → hasMany → BootcampStretch
 */
import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

const BootcampStretch = sequelize.define('BootcampStretch', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  templateId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'bootcamp_templates', key: 'id' },
  },
  exerciseName: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  targetMuscles: {
    type: DataTypes.STRING(200),
  },
  durationSec: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  exerciseLibraryId: {
    type: DataTypes.INTEGER,
  },
}, {
  tableName: 'bootcamp_stretches',
  timestamps: false,
  indexes: [
    { fields: ['templateId'], name: 'idx_bootcamp_stretches_template' },
  ],
});

export default BootcampStretch;
