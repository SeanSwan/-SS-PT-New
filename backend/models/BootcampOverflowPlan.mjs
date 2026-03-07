/**
 * BootcampOverflowPlan — Backup plans for class size overflow
 * Phase 10a: Lap rotations, group splits, station additions.
 */
import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

const BootcampOverflowPlan = sequelize.define('BootcampOverflowPlan', {
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
  triggerCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  strategy: {
    type: DataTypes.ENUM('lap_rotation', 'split_groups', 'add_stations', 'condense'),
    allowNull: false,
  },
  lapExercises: {
    type: DataTypes.JSONB,
  },
  lapDurationMin: {
    type: DataTypes.INTEGER,
    defaultValue: 4,
  },
  notes: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'bootcamp_overflow_plans',
  timestamps: false,
});

export default BootcampOverflowPlan;
