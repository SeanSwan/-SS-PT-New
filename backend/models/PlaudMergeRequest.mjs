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
 * Approval (reworked 2026-09-01, blueprint Slice 1 — F1/F2):
 *   the apply path (POST /api/admin/clients/:clientId/workouts) routes
 *   plaud_merge / plaud_merge_segment sources through
 *   approveCaptureWorkoutService, which locks this row FOR UPDATE and
 *   commits the workout write + approval flip in ONE transaction,
 *   recording approved_workout_session_id (FK → workout_sessions).
 *   approvedWorkoutFormId is RETIRED — its FK targets daily_workout_forms,
 *   which the approval path never writes; the column is kept one release
 *   for rollback safety, then dropped.
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
    // RETIRED 2026-09-01 (F1): never successfully written — the approval path
    // creates workout_sessions rows, not daily_workout_forms rows. Kept one
    // release for rollback safety; see 20260901090000 migration.
    approvedWorkoutFormId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'approved_workout_form_id',
      references: { model: 'daily_workout_forms', key: 'id' },
    },
    approvedWorkoutSessionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'approved_workout_session_id',
      references: { model: 'workout_sessions', key: 'id' },
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
