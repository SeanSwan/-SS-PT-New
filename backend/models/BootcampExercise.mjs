/**
 * BootcampExercise — Exercises within a station or full-group workout
 * Phase 10a: Includes difficulty tiers and pain modifications.
 */
import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

const BootcampExercise = sequelize.define('BootcampExercise', {
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
  stationId: {
    type: DataTypes.INTEGER,
    references: { model: 'bootcamp_stations', key: 'id' },
  },
  exerciseName: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  sourceExerciseName: {
    type: DataTypes.STRING(100),
  },
  durationSec: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 35,
  },
  restSec: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  isCardioFinisher: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  muscleTargets: {
    type: DataTypes.TEXT,
  },
  // Difficulty tiers
  easyVariation: {
    type: DataTypes.STRING(100),
  },
  mediumVariation: {
    type: DataTypes.STRING(100),
  },
  hardVariation: {
    type: DataTypes.STRING(100),
  },
  // Pain modifications
  kneeMod: {
    type: DataTypes.STRING(100),
  },
  shoulderMod: {
    type: DataTypes.STRING(100),
  },
  ankleMod: {
    type: DataTypes.STRING(100),
  },
  wristMod: {
    type: DataTypes.STRING(100),
  },
  elbowMod: {
    type: DataTypes.STRING(100),
  },
  footMod: {
    type: DataTypes.STRING(100),
  },
  hipMod: {
    type: DataTypes.STRING(100),
  },
  backMod: {
    type: DataTypes.STRING(100),
  },
  equipmentRequired: {
    type: DataTypes.STRING(100),
  },
  description: {
    type: DataTypes.TEXT,
  },
  instructions: {
    type: DataTypes.TEXT,
  },
  videoUrl: {
    type: DataTypes.STRING(500),
  },
  previewVideoUrl: {
    type: DataTypes.STRING(500),
  },
  imageUrl: {
    type: DataTypes.STRING(500),
  },
  thumbnailUrl: {
    type: DataTypes.STRING(500),
  },
  notes: {
    type: DataTypes.TEXT,
  },
  // ── Upgrade Phase 0a: alternative boards, pyramid, superset, flow, rolodex ──
  board: {
    type: DataTypes.ENUM('main', 'alternative', 'lowImpact'),
    defaultValue: 'main',
  },
  setupTimeSec: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  pyramidStartWeight: {
    type: DataTypes.STRING(50),
  },
  pyramidDrops: {
    type: DataTypes.INTEGER,
  },
  supersetOrder: {
    type: DataTypes.INTEGER,
  },
  supersetGroupId: {
    type: DataTypes.INTEGER,
  },
  exerciseLibraryId: {
    type: DataTypes.UUID,
    references: { model: 'Exercises', key: 'id' },
    onDelete: 'SET NULL',
  },
}, {
  tableName: 'bootcamp_exercises',
  timestamps: false,
  indexes: [
    { fields: ['templateId'], name: 'idx_bootcamp_exercises_template' },
    { fields: ['stationId'], name: 'idx_bootcamp_exercises_station' },
  ],
});

export default BootcampExercise;
