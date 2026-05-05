/**
 * PlaudClip Model
 * ================
 * Durable metadata for PLAUD wristband audio clips uploaded for the
 * multi-clip merge ingestion workflow.
 *
 * Phase 3 Slice 3.1 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §4.1.
 * Phase 5 Slice 5.1 (2026-05-04): added clipSource, clipExternalId,
 *   applaudEventId for Applaud webhook auto-ingestion. Plan:
 *   PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md §7.1.
 * Schema preflight (Rule 58, 2026-05-04): Users table is "Users" PascalCase.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class PlaudClip extends Model {}

PlaudClip.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    clipId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'clip_id',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: { model: '"Users"', key: 'id' },
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'client_id',
      references: { model: '"Users"', key: 'id' },
    },
    filenameOriginal: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'filename_original',
    },
    storageExt: {
      type: DataTypes.STRING(8),
      allowNull: false,
      field: 'storage_ext',
    },
    mimetype: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    sizeBytes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'size_bytes',
    },
    durationSec: {
      type: DataTypes.DECIMAL(7, 2),
      allowNull: true,
      field: 'duration_sec',
    },
    sha256: {
      type: DataTypes.CHAR(64),
      allowNull: false,
    },
    diskPath: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'disk_path',
    },
    r2Key: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'r2_key',
    },
    r2MirrorStatus: {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: 'pending',
      field: 'r2_mirror_status',
      validate: { isIn: [['pending', 'in_flight', 'mirrored', 'failed_retryable', 'failed_terminal']] },
    },
    status: {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: 'uploading',
      validate: { isIn: [['uploading', 'pending_merge', 'merged', 'expired', 'deleted', 'lost']] },
    },
    uploadedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'uploaded_at',
    },
    mergedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'merged_at',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
    // Phase 5 Slice 5.1 — Applaud webhook auto-ingestion source tracking.
    // Default 'manual_upload' covers all existing pre-Phase-5 rows.
    clipSource: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'manual_upload',
      field: 'clip_source',
      validate: { isIn: [['manual_upload', 'applaud_webhook']] },
    },
    // Plaud's recording_id (UUID-ish from Applaud). NULL for manual uploads.
    // Partial UNIQUE index (clip_source, clip_external_id, user_id)
    // WHERE clip_external_id IS NOT NULL enforces dedup for webhook ingestion.
    clipExternalId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'clip_external_id',
    },
    // Applaud's per-event ID. Used for forensic tracing only — not unique.
    applaudEventId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'applaud_event_id',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    modelName: 'PlaudClip',
    tableName: 'plaud_clips',
    timestamps: true,
    paranoid: false,
  },
);

export default PlaudClip;
