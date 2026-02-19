/**
 * VideoJobLog Model - BullMQ Job Audit Trail
 * ============================================
 * Logs all background job activity (YouTube imports, syncs, analytics rollups,
 * backfills, checksum verification, draft cleanup) for admin visibility.
 */

import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

class VideoJobLog extends sequelize.Sequelize.Model {}

VideoJobLog.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  job_type: {
    type: DataTypes.ENUM('youtube_import', 'youtube_sync', 'analytics_rollup', 'backfill', 'checksum_verify', 'draft_cleanup'),
    allowNull: false,
  },
  job_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'BullMQ job ID',
  },
  status: {
    type: DataTypes.ENUM('queued', 'processing', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'queued',
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  result: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  tableName: 'video_job_log',
  timestamps: false,
  createdAt: false,
  updatedAt: false,
});

export default VideoJobLog;
