/**
 * PlaudClipMirrorJob Model
 * =========================
 * R2 mirror outbox for PLAUD clips. Worker polls this table to upload
 * clip files from disk to Cloudflare R2 (durability backstop).
 *
 * Phase 3 Slice 3.1 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §4.3.
 * Codex Round 2 CRIT #3 + MEDIUM #3 (UNIQUE per clip).
 *
 * State machine:
 *   pending -> in_flight -> mirrored | failed_retryable
 *   failed_retryable -> in_flight (next retry window)
 *   failed_retryable -> failed_terminal (after max 5 attempts)
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class PlaudClipMirrorJob extends Model {}

PlaudClipMirrorJob.init(
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
      references: { model: 'plaud_clips', key: 'clip_id' },
    },
    attempts: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 0,
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'last_error',
    },
    nextRetryAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'next_retry_at',
    },
    status: {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: 'pending',
      validate: { isIn: [['pending', 'in_flight', 'mirrored', 'failed_retryable', 'failed_terminal']] },
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
    modelName: 'PlaudClipMirrorJob',
    tableName: 'plaud_clip_mirror_jobs',
    timestamps: true,
    paranoid: false,
  },
);

export default PlaudClipMirrorJob;
