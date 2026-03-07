/**
 * FormAnalysis Model
 * ==================
 * Stores AI form analysis results from video/photo uploads.
 * Each record represents one analysis of one exercise performance.
 *
 * Pipeline: Upload media -> Queue job -> Python MediaPipe service -> Store results
 * Integration: Links to User, WorkoutSession (optional), MovementProfile (aggregation)
 *
 * NOTE: Uses STRING instead of ENUM for analysisStatus/mediaType
 * to avoid PostgreSQL ENUM type issues with sequelize.sync({ alter: true }).
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class FormAnalysis extends Model {}

FormAnalysis.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'The client whose form is being analyzed',
  },
  trainerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'Trainer who requested/reviewed the analysis (if applicable)',
  },
  sessionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Optional link to a training session this analysis belongs to',
  },
  exerciseName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Exercise analyzed (matches form-analysis registry key, e.g., "barbell_squat")',
  },
  mediaUrl: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'R2/S3 URL of uploaded video or image',
  },
  mediaType: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: {
      isIn: [['video', 'image']],
    },
    comment: 'Type of uploaded media',
  },
  analysisStatus: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'processing', 'complete', 'failed']],
    },
    comment: 'Current status of the analysis pipeline',
  },
  overallScore: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0, max: 100 },
    comment: 'Overall form score 0-100 (weighted average of rep scores)',
  },
  repCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Total reps detected in the video',
  },
  findings: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Detailed analysis: { jointAngles, compensations[], repScores[], fatigueDetected, symmetryScore, rangeOfMotionPercent }',
  },
  recommendations: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Corrective exercises from NASM CES continuum: [{ compensation, inhibit, lengthen, activate, integrate }]',
  },
  coachingFeedback: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Gemini Flash generated coaching feedback: { summary, repByRepFeedback, correctiveCues }',
  },
  landmarkDataUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'R2 URL to compressed landmark data (not stored inline for large videos)',
  },
  processingDurationMs: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'How long the analysis took in milliseconds',
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error details if analysisStatus = failed',
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional metadata: { deviceType, cameraAngle, videoDurationSec, frameCount, modelVersion }',
  },
}, {
  sequelize,
  tableName: 'form_analyses',
  timestamps: true,
  paranoid: false,
  indexes: [
    { fields: ['userId', 'analysisStatus'], name: 'idx_form_analysis_user_status' },
    { fields: ['userId', 'exerciseName'], name: 'idx_form_analysis_user_exercise' },
    { fields: ['analysisStatus'], name: 'idx_form_analysis_status' },
    { fields: ['createdAt'], name: 'idx_form_analysis_created' },
  ],
});

export default FormAnalysis;
