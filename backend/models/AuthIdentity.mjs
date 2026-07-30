/**
 * AuthIdentity model.
 *
 * Stores immutable provider subjects separately from mutable email addresses.
 * A user may link at most one identity from each provider; a provider subject
 * may belong to only one SwanStudios user.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class AuthIdentity extends Model {}

AuthIdentity.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  provider: {
    type: DataTypes.STRING(32),
    allowNull: false,
    validate: { isIn: [['google', 'apple', 'facebook', 'tiktok']] },
  },
  providerSubject: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  emailVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'AuthIdentity',
  tableName: 'auth_identities',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['provider', 'providerSubject'], name: 'auth_identities_provider_subject_uq' },
    { unique: true, fields: ['userId', 'provider'], name: 'auth_identities_user_provider_uq' },
    { fields: ['userId'], name: 'auth_identities_user_idx' },
  ],
});

export default AuthIdentity;