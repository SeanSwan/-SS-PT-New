/**
 * One-time, hashed credential for passwordless email sign-in.
 *
 * Raw login tokens are never persisted. Consumption is an atomic update from
 * unused to consumed so a link cannot establish more than one session.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class MagicLoginToken extends Model {}

MagicLoginToken.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  tokenHash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  consumedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'MagicLoginToken',
  tableName: 'magic_login_tokens',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['tokenHash'], name: 'magic_login_tokens_hash_uq' },
    { fields: ['userId'], name: 'magic_login_tokens_user_idx' },
    {
      unique: true, fields: ['userId'], where: { consumedAt: null },
      name: 'magic_login_tokens_active_user_uq',
    },
    { fields: ['expiresAt'], name: 'magic_login_tokens_expiry_idx' },
  ],
});

export default MagicLoginToken;