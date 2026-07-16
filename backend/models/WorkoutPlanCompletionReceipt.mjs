/**
 * ============================================================================
 * FILE: WorkoutPlanCompletionReceipt.mjs
 * PURPOSE: Store immutable evidence for one completed plan assignment.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines the revision/date-aware completion receipt row,
 * its privacy retention links, uniqueness, and update prohibition.
 * HOW IT FITS IN THE APP: Workout log + plan advance transaction creates it;
 * read projections later render historical prescription truth from it.
 * KEY DECISIONS: No updatedAt column and ORM update hooks fail closed. Account,
 * plan, and form deletion cascade; session deletion preserves a nullable link.
 * NASM PROTOCOL CONTEXT: Captures the exact prescribed acute variables completed.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

const immutableReceiptError = () => {
  const error = new Error('Workout plan completion receipts are immutable');
  error.code = 'WORKOUT_PLAN_COMPLETION_RECEIPT_IMMUTABLE';
  throw error;
};

class WorkoutPlanCompletionReceipt extends Model {}

WorkoutPlanCompletionReceipt.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  workoutPlanId: {
    type: DataTypes.UUID,
    field: 'workout_plan_id',
    allowNull: false,
    references: { model: 'workout_plans', key: 'id' },
    onDelete: 'CASCADE',
  },
  clientId: {
    type: DataTypes.INTEGER,
    field: 'client_id',
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onDelete: 'CASCADE',
    validate: { min: 1 },
  },
  dayKey: {
    type: DataTypes.STRING(64),
    field: 'day_key',
    allowNull: false,
    validate: { is: /^w[1-9]\d*:d[1-9]\d*$/ },
  },
  assignmentId: {
    type: DataTypes.STRING(255),
    field: 'assignment_id',
    allowNull: false,
  },
  occurrenceIndex: {
    type: DataTypes.INTEGER,
    field: 'occurrence_index',
    allowNull: false,
    defaultValue: 1,
    validate: { min: 1 },
  },
  scheduledDate: {
    type: DataTypes.DATEONLY,
    field: 'scheduled_date',
    allowNull: false,
  },
  prescribedRevision: {
    type: DataTypes.INTEGER,
    field: 'prescribed_revision',
    allowNull: false,
    validate: { min: 1 },
  },
  prescribedHash: {
    type: DataTypes.CHAR(64),
    field: 'prescribed_hash',
    allowNull: false,
    validate: { is: /^[a-f0-9]{64}$/ },
  },
  exerciseSnapshot: {
    type: DataTypes.JSONB,
    field: 'exercise_snapshot',
    allowNull: false,
  },
  dailyWorkoutFormId: {
    type: DataTypes.UUID,
    field: 'daily_workout_form_id',
    allowNull: false,
    references: { model: 'daily_workout_forms', key: 'id' },
    onDelete: 'CASCADE',
  },
  workoutSessionId: {
    type: DataTypes.UUID,
    field: 'workout_session_id',
    allowNull: true,
    references: { model: 'workout_sessions', key: 'id' },
    onDelete: 'SET NULL',
  },
  idempotencyKey: {
    type: DataTypes.STRING(80),
    field: 'idempotency_key',
    allowNull: false,
    validate: { is: /^wpc:[a-f0-9]{64}$/ },
  },
  completedAt: {
    type: DataTypes.DATE,
    field: 'completed_at',
    allowNull: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at',
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'WorkoutPlanCompletionReceipt',
  tableName: 'workout_plan_completion_receipts',
  timestamps: true,
  updatedAt: false,
  hooks: {
    beforeUpdate: immutableReceiptError,
    beforeBulkUpdate: immutableReceiptError,
    beforeDestroy: immutableReceiptError,
    beforeBulkDestroy: immutableReceiptError,
  },
  indexes: [
    {
      name: 'workout_plan_completion_receipts_idempotency_unique',
      unique: true,
      fields: ['idempotency_key'],
    },
    {
      name: 'workout_plan_completion_receipts_daily_form_unique',
      unique: true,
      fields: ['daily_workout_form_id'],
    },
    {
      name: 'idx_workout_plan_completion_receipts_plan_revision',
      fields: ['workout_plan_id', 'prescribed_revision'],
    },
    {
      name: 'idx_workout_plan_completion_receipts_client_date',
      fields: ['client_id', 'scheduled_date'],
    },
  ],
});

export default WorkoutPlanCompletionReceipt;
