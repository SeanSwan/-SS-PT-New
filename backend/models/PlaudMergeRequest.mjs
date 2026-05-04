/**
 * PlaudMergeRequest Model
 * ========================
 * Durable merge state for the PLAUD multi-clip merge workflow. Each row
 * represents one merge attempt and survives browser-close / power-outage /
 * server restart so trainers can resume their pending review.
 *
 * Phase 3 Slice 3.1 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §4.2.
 *
 * Encryption: payload_cipher holds AES-256-GCM-encrypted JSON
 * `{ transcript, parsedWorkout }` keyed by cipher_key_id (e.g. 'V2'),
 * with payload_iv + payload_tag per row. See plaudCipherService.mjs.
 *
 * markApproved guarded UPDATE pattern (Codex Round 2 CRIT #4 + Round 4 HIGH):
 *   the apply path (POST /api/admin/clients/:clientId/workouts) calls
 *   PlaudMergeRequest.markApproved within the same transaction that
 *   creates the workout form. The UPDATE asserts ownership, status,
 *   and approve-once invariants via WHERE clauses.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class PlaudMergeRequest extends Model {}

PlaudMergeRequest.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    mergeRequestId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'merge_request_id',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: { model: '"Users"', key: 'id' },
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'client_id',
      references: { model: '"Users"', key: 'id' },
    },
    clipIds: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'clip_ids',
    },
    status: {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: 'processing',
      validate: { isIn: [['processing', 'completed', 'failed', 'approved', 'discarded', 'expired']] },
    },
    transcriptHash: {
      type: DataTypes.CHAR(64),
      allowNull: true,
      field: 'transcript_hash',
    },
    payloadCipher: {
      type: DataTypes.BLOB,
      allowNull: true,
      field: 'payload_cipher',
    },
    payloadIv: {
      type: DataTypes.BLOB,
      allowNull: true,
      field: 'payload_iv',
    },
    payloadTag: {
      type: DataTypes.BLOB,
      allowNull: true,
      field: 'payload_tag',
    },
    cipherKeyId: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'cipher_key_id',
    },
    errorCode: {
      type: DataTypes.STRING(48),
      allowNull: true,
      field: 'error_code',
    },
    boundaryWarning: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'boundary_warning',
    },
    parsedExerciseCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'parsed_exercise_count',
    },
    approvedWorkoutFormId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'approved_workout_form_id',
      references: { model: 'daily_workout_forms', key: 'id' },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'approved_at',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    cipherPurgedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'cipher_purged_at',
    },
  },
  {
    sequelize,
    modelName: 'PlaudMergeRequest',
    tableName: 'plaud_merge_requests',
    timestamps: false,
    paranoid: false,
  },
);

export default PlaudMergeRequest;
