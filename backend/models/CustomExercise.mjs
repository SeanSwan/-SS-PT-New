/**
 * CustomExercise Model
 * ====================
 * Trainer-created custom exercises for form analysis.
 * Append-only versioning: updates create new rows (parentVersionId links to previous).
 *
 * mechanics_schema JSONB stores the flexible rule definitions:
 * {
 *   primaryAngle: "knee_flexion",
 *   repDetection: { joint: "leftKnee", minAngle: 60, maxAngle: 170 },
 *   formRules: [
 *     { type: "angle_threshold", joint: "leftKnee", operator: "<", threshold: 90, severity: "warning", message: "..." },
 *     { type: "landmark_deviation", landmark: 25, axis: "x", maxDeviation: 0.05, severity: "error", message: "..." }
 *   ],
 *   checkpoints: ["knee_valgus", "torso_lean", "hip_shift"]
 * }
 *
 * NOTE: Uses STRING with validate.isIn instead of ENUM.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class CustomExercise extends Model {}

CustomExercise.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  trainerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'Trainer who created this custom exercise',
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    comment: 'Display name (e.g., "Tempo Back Squat")',
  },
  slug: {
    type: DataTypes.STRING(150),
    allowNull: false,
    comment: 'URL-safe identifier (e.g., "tempo_back_squat")',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Trainer notes about this exercise variant',
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'custom',
    comment: 'NASM category (squat, hinge, push, pull, etc.)',
  },
  baseExerciseKey: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Built-in exercise this was derived from (e.g., "squat", "deadlift")',
  },
  mechanicsSchema: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    comment: 'Flexible rule definitions: primaryAngle, repDetection, formRules, checkpoints',
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'draft',
    validate: { isIn: [['draft', 'testing', 'published', 'archived']] },
    comment: 'Lifecycle: draft -> testing -> published -> archived',
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Append-only version number',
  },
  parentVersionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'custom_exercises', key: 'id' },
    comment: 'Previous version of this exercise (null for v1)',
  },
  validationResult: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Sandbox test results: { repsFired, rulesFired, passedAt, videoUrl }',
  },
  usageCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of times this exercise has been analyzed',
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether other trainers can see and duplicate this exercise',
  },
}, {
  sequelize,
  tableName: 'custom_exercises',
  timestamps: true,
  paranoid: false,
  indexes: [
    { fields: ['trainerId'], name: 'idx_custom_exercise_trainer' },
    { fields: ['slug', 'trainerId'], unique: true, name: 'idx_custom_exercise_slug_trainer' },
    { fields: ['status'], name: 'idx_custom_exercise_status' },
    { fields: ['baseExerciseKey'], name: 'idx_custom_exercise_base' },
    { fields: ['parentVersionId'], name: 'idx_custom_exercise_parent' },
  ],
});

export default CustomExercise;
