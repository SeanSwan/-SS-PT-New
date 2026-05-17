/**
 * MODEL: SocialPublishingAttempt
 * ==============================
 * Per-provider publish attempt audit trail for native social publishing.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

export const ATTEMPT_STATUSES = ['published', 'failed'];

class SocialPublishingAttempt extends Model {}

SocialPublishingAttempt.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  jobId: { type: DataTypes.UUID, allowNull: true },
  accountId: { type: DataTypes.UUID, allowNull: true },
  provider: { type: DataTypes.STRING(32), allowNull: false },
  status: {
    type: DataTypes.STRING(32),
    allowNull: false,
    validate: { isIn: [ATTEMPT_STATUSES] },
  },
  providerPostId: { type: DataTypes.STRING(300), allowNull: true },
  response: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  error: { type: DataTypes.TEXT, allowNull: true },
  attemptedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: 'SocialPublishingAttempt',
  tableName: 'social_publishing_attempts',
  timestamps: true,
});

export default SocialPublishingAttempt;
