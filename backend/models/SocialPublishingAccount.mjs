/**
 * MODEL: SocialPublishingAccount
 * ==============================
 * Native social provider account metadata with encrypted credential blobs.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

export const SOCIAL_PROVIDERS = ['bluesky', 'youtube', 'facebook', 'instagram', 'tiktok', 'nextdoor'];
export const ACCOUNT_STATUSES = ['connected', 'needs_reauth', 'disabled', 'failed'];

class SocialPublishingAccount extends Model {}

SocialPublishingAccount.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  provider: {
    type: DataTypes.STRING(32),
    allowNull: false,
    validate: { isIn: [SOCIAL_PROVIDERS] },
  },
  providerAccountId: { type: DataTypes.STRING(160), allowNull: true },
  handle: { type: DataTypes.STRING(160), allowNull: true },
  displayName: { type: DataTypes.STRING(160), allowNull: false },
  profileUrl: { type: DataTypes.STRING(500), allowNull: true },
  status: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'connected',
    validate: { isIn: [ACCOUNT_STATUSES] },
  },
  capabilities: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  credentialCipher: { type: DataTypes.BLOB, allowNull: false },
  credentialIv: { type: DataTypes.BLOB, allowNull: false },
  credentialTag: { type: DataTypes.BLOB, allowNull: false },
  credentialKeyId: { type: DataTypes.STRING(32), allowNull: false },
  tokenExpiresAt: { type: DataTypes.DATE, allowNull: true },
  lastHealthCheckAt: { type: DataTypes.DATE, allowNull: true },
  lastError: { type: DataTypes.TEXT, allowNull: true },
  createdBy: { type: DataTypes.INTEGER, allowNull: true },
  updatedBy: { type: DataTypes.INTEGER, allowNull: true },
}, {
  sequelize,
  modelName: 'SocialPublishingAccount',
  tableName: 'social_publishing_accounts',
  timestamps: true,
  paranoid: true,
});

export default SocialPublishingAccount;
