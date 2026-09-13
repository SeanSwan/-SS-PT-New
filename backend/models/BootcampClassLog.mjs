/**
 * BootcampClassLog — Log of actual boot camp classes taught
 * Phase 10a: Tracks what exercises were used, mods made, ratings.
 */
import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

const BootcampClassLog = sequelize.define('BootcampClassLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  templateId: {
    type: DataTypes.INTEGER,
    references: { model: 'bootcamp_templates', key: 'id' },
  },
  trainerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  classDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  dayType: {
    type: DataTypes.STRING(30),
  },
  actualParticipants: {
    type: DataTypes.INTEGER,
  },
  overflowActivated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  exercisesUsed: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  modificationsMade: {
    type: DataTypes.JSONB,
  },
  trainerNotes: {
    type: DataTypes.TEXT,
  },
  classRating: {
    type: DataTypes.INTEGER,
  },
  energyLevel: {
    type: DataTypes.STRING(20),
  },
  /**
   * SWA-105 Slice 8: { recordedAt, attendees: [{userId}|{guest}],
   * workoutFormIds: number[] }. NULL = never recorded; presence = recorded
   * exactly once (the service no-ops a second submission).
   */
  attendance: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  /**
   * H29 / R-H04 (contract §5 line 218) — durable operation identity for the taught-log
   * write. `sprint-slot:<slotId>` for a Sprint confirmation; `run:<stable-run-UUID>` for
   * an ordinary class run, persisted by the caller BEFORE its first POST.
   *
   * NULLABLE ON PURPOSE: historical rows have no key and must stay readable. The unique
   * index on (trainerId, operationKey) is what makes a retry collapse onto one row, and
   * Postgres treats NULLs as distinct so those legacy rows do not collide.
   */
  operationKey: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
  /** Hash of the submitted payload, so a RETRY with a changed body is a 409, not a write. */
  payloadHash: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  /**
   * Distinguishes `trainer_attested_prescription` from `runner_measured` (§5 line 222):
   * prescribed work seconds/rounds are NOT measured elapsed time, and `expectedParticipants`
   * is not actual attendance.
   */
  executionSummary: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'bootcamp_class_log',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['classDate'], name: 'idx_bootcamp_log_date' },
    { fields: ['trainerId'], name: 'idx_bootcamp_log_trainer' },
    { fields: ['dayType'], name: 'idx_bootcamp_log_day' },
    // H29: the deduplication guarantee. Must match the migration's index name so a
    // schema diff cannot silently report two different identities for one constraint.
    { fields: ['trainerId', 'operationKey'], name: 'uniq_bootcamp_log_trainer_operation_key', unique: true },
  ],
});

export default BootcampClassLog;
