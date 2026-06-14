/**
 * BootcampTemplate — Reusable boot camp class designs
 * Phase 10a: Core template model for group fitness classes.
 */
import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

const BOOTCAMP_CLASS_FORMAT_VALUES = [
  '2x5_r4', '2x5_r3', '2x6_r3', '2x6_r2', '2x7_r3', '2x7_r2',
  '2x8_r3', '2x8_r2', '2x10_r2', '3x4_r3', '3x4_r2', '3x5_r2',
  '3x5_r3', '3x6_r2', '3x6_r1', '3x8_r1', '4x4_r2', '4x4_r1',
  '4x5_r2', '4x5_r1', '4x6_r1', '5x3_r2', '5x3_r1', '5x4_r1',
  'stations_4x', 'stations_3x5', 'stations_2x7', 'stations_3x4',
  'stations_5x3', 'full_group', 'circuit', 'emom', 'tabata', 'amrap',
  'partner', 'hybrid', 'custom',
];

const BOOTCAMP_CLASS_STYLE_VALUES = [
  'standard', 'pyramid', 'superset', 'mixed', 'ladder', 'descending',
  'chipper', 'countdown', 'death_by', 'ygig', 'contrast', 'density',
];

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
    type: DataTypes.ENUM(...BOOTCAMP_CLASS_FORMAT_VALUES),
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
  // ── Upgrade Phase 0a: class style, intensity, stretch ──
  classStyle: {
    type: DataTypes.ENUM(...BOOTCAMP_CLASS_STYLE_VALUES),
    defaultValue: 'standard',
  },
  intensityCategory: {
    type: DataTypes.ENUM('high_impact', 'medium_impact', 'calisthenics', 'stability', 'flexibility', 'cardio'),
  },
  rounds: {
    type: DataTypes.INTEGER,
  },
  exerciseDurationSec: {
    type: DataTypes.INTEGER,
  },
  includeStretch: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  stretchDurationMin: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
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
