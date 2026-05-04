/**
 * PlaudMergeLock Model
 * =====================
 * Per-user merge lock with 15-minute TTL + heartbeat. Prevents
 * concurrent merges from the same trainer.
 *
 * Phase 3 Slice 3.1 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §10.
 * Codex Round 2 HIGH #2 (atomic expired-lock takeover via raw query).
 *
 * Acquire is done via raw SQL (Sequelize doesn't easily express
 * `INSERT ... ON CONFLICT DO UPDATE WHERE ...`). The model is here
 * primarily for representation, sweep cron, and tests.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class PlaudMergeLock extends Model {}

PlaudMergeLock.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      field: 'user_id',
      references: { model: '"Users"', key: 'id' },
    },
    jobId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'job_id',
    },
    lockedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'locked_at',
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'locked_until',
    },
  },
  {
    sequelize,
    modelName: 'PlaudMergeLock',
    tableName: 'plaud_merge_locks',
    timestamps: false,
    paranoid: false,
  },
);

export default PlaudMergeLock;
