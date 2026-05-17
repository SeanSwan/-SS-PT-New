/**
 * MODEL: SocialPublishingJob
 * ==========================
 * SwanStudios-owned immediate and scheduled social publishing jobs.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

export const JOB_STATUSES = ['draft', 'scheduled', 'running', 'published', 'partial_failed', 'failed', 'cancelled'];

class SocialPublishingJob extends Model {}

SocialPublishingJob.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  content: { type: DataTypes.TEXT, allowNull: false },
  status: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'scheduled',
    validate: { isIn: [JOB_STATUSES] },
  },
  scheduledAt: { type: DataTypes.DATE, allowNull: false },
  platformAccountIds: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  media: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  complianceSnapshot: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  platformResults: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  source: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'dashboard' },
  createdBy: { type: DataTypes.INTEGER, allowNull: true },
  publishedAt: { type: DataTypes.DATE, allowNull: true },
  failedAt: { type: DataTypes.DATE, allowNull: true },
  failureReason: { type: DataTypes.TEXT, allowNull: true },
}, {
  sequelize,
  modelName: 'SocialPublishingJob',
  tableName: 'social_publishing_jobs',
  timestamps: true,
  paranoid: true,
});

export default SocialPublishingJob;
