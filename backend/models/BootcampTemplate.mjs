/**
 * BootcampTemplate — Reusable boot camp class designs
 * Phase 10a: Core template model for group fitness classes.
 */
import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

const BootcampTemplate = sequelize.define('BootcampTemplate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  trainerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  classFormat: {
    type: DataTypes.ENUM('stations_4x', 'stations_3x5', 'stations_2x7', 'full_group', 'custom'),
    allowNull: false,
  },
  targetDurationMin: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 45,
  },
  demoDurationMin: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
  },
  clearDurationMin: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
  },
  dayType: {
    type: DataTypes.ENUM('lower_body', 'upper_body', 'cardio', 'full_body', 'custom'),
  },
  difficultyBase: {
    type: DataTypes.ENUM('easy', 'medium', 'hard', 'mixed'),
    allowNull: false,
    defaultValue: 'medium',
  },
  equipmentProfileId: {
    type: DataTypes.INTEGER,
    references: { model: 'equipment_profiles', key: 'id' },
  },
  spaceProfileId: {
    type: DataTypes.INTEGER,
    references: { model: 'bootcamp_space_profiles', key: 'id' },
  },
  maxParticipants: {
    type: DataTypes.INTEGER,
    defaultValue: 20,
  },
  optimalParticipants: {
    type: DataTypes.INTEGER,
    defaultValue: 12,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  tags: {
    type: DataTypes.TEXT,
  },
  aiGenerated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lastUsedAt: {
    type: DataTypes.DATE,
  },
  timesUsed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  metadata: {
    type: DataTypes.JSONB,
  },
}, {
  tableName: 'bootcamp_templates',
  timestamps: true,
  indexes: [
    { fields: ['trainerId'], name: 'idx_bootcamp_templates_trainer' },
    { fields: ['classFormat'], name: 'idx_bootcamp_templates_format' },
    { fields: ['dayType'], name: 'idx_bootcamp_templates_day' },
  ],
});

export default BootcampTemplate;
