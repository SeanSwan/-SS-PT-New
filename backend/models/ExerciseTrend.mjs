/**
 * ExerciseTrend — Trending exercises from web research
 * Phase 10a: YouTube, Reddit, Instagram trend tracking with NASM rating.
 */
import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

const ExerciseTrend = sequelize.define('ExerciseTrend', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  exerciseName: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  source: {
    type: DataTypes.ENUM('youtube', 'reddit', 'instagram', 'trainer_input', 'nasm_library'),
    allowNull: false,
  },
  sourceUrl: {
    type: DataTypes.TEXT,
  },
  trendScore: {
    type: DataTypes.INTEGER,
  },
  nasmRating: {
    type: DataTypes.ENUM('approved', 'approved_with_caveats', 'not_recommended', 'dangerous'),
  },
  impactLevel: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'plyometric'),
  },
  muscleTargets: {
    type: DataTypes.TEXT,
  },
  difficulty: {
    type: DataTypes.STRING(20),
  },
  description: {
    type: DataTypes.TEXT,
  },
  aiAnalysis: {
    type: DataTypes.JSONB,
  },
  discoveredAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    references: { model: 'Users', key: 'id' },
  },
}, {
  tableName: 'exercise_trends',
  timestamps: false,
  indexes: [
    { fields: ['source'], name: 'idx_exercise_trends_source' },
    { fields: ['nasmRating'], name: 'idx_exercise_trends_rating' },
  ],
});

export default ExerciseTrend;
