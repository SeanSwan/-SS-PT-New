/**
 * MovementProfile Model
 * =====================
 * Aggregated movement quality data for a client, built over time from FormAnalysis results.
 * One profile per user — updated after each form analysis completes.
 *
 * Used by: Intelligent Workout Builder, Admin Dashboard, Variation Engine
 * Fed by: FormAnalysis results (compensations, scores, mobility data)
 *
 * NOTE: Uses JSONB columns extensively for flexible schema evolution.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class MovementProfile extends Model {}

MovementProfile.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'One movement profile per user (unique constraint)',
  },
  mobilityScores: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Per-joint mobility ratings: { ankleDF: 85, hipFlexion: 72, shoulderFlexion: 90, ... }',
  },
  strengthBalance: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Left/right imbalance data: { kneeValgus: { left: 12, right: 8 }, hipDrop: { left: 5, right: 3 } }',
  },
  commonCompensations: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Most frequently detected patterns: [{ type, frequency, avgSeverity, trend, lastDetected }]',
  },
  improvementTrend: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Score history over time: [{ date, avgScore, exerciseName, compensationCount }]',
  },
  exerciseScores: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Per-exercise average scores: { barbell_squat: { avg: 82, count: 5, trend: "improving" }, ... }',
  },
  nasmPhaseRecommendation: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 },
    comment: 'Recommended NASM OPT phase based on movement quality (1-5)',
  },
  totalAnalyses: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Total number of form analyses completed',
  },
  lastAnalysisAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp of most recent form analysis',
  },
  lastAnalysisId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of most recent FormAnalysis record',
  },
}, {
  sequelize,
  tableName: 'movement_profiles',
  timestamps: true,
  paranoid: false,
  indexes: [
    { fields: ['userId'], unique: true, name: 'idx_movement_profile_user' },
  ],
});

export default MovementProfile;
