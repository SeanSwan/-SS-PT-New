/**
 * VideoAccessGrant Model - Premium Entitlements
 * ==============================================
 * Tracks individual and role-based access grants to videos and collections.
 * XOR constraint ensures each grant targets exactly one entity (video OR collection).
 * Partial unique indexes prevent duplicate active grants per user+target.
 */

import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

class VideoAccessGrant extends sequelize.Sequelize.Model {}

VideoAccessGrant.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  video_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'video_catalog', key: 'id' },
  },
  collection_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'video_collections', key: 'id' },
  },
  grant_type: {
    type: DataTypes.ENUM('role_based', 'individual', 'purchase'),
    allowNull: false,
    defaultValue: 'individual',
  },
  grant_status: {
    type: DataTypes.ENUM('active', 'expired', 'revoked'),
    allowNull: false,
    defaultValue: 'active',
  },
  granted_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  revoked_at: {
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
  tableName: 'video_access_grants',
  timestamps: false,
  createdAt: false,
  updatedAt: false,
});

export default VideoAccessGrant;
