/**
 * ============================================================================
 * FILE: UserFeatureFlag.mjs
 * PURPOSE: Per-user feature flag model for granular admin access control
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Stores per-user feature flags that control access to
 * premium features like Content Studio. Admin toggles these on/off per user.
 * HOW IT FITS IN THE APP: Admin dashboard → Feature Access page → toggle user flags
 * KEY DECISIONS: Per-user (not per-role) for granular control. Generic system
 * reusable for future premium features beyond Content Studio.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class UserFeatureFlag extends Model {}

UserFeatureFlag.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'References User.id — the user this flag applies to',
  },
  featureKey: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Feature identifier (e.g., "content-studio", "workout-planner-pro")',
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this feature is enabled for this user',
  },
  grantedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Admin user ID who granted this access',
  },
  grantedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When access was granted',
  },
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When access was revoked (soft-revoke audit trail)',
  },
  notes: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Admin notes about why access was granted/revoked',
  },
}, {
  sequelize,
  modelName: 'UserFeatureFlag',
  tableName: 'user_feature_flags',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'featureKey'],
      name: 'uq_user_feature_flag',
    },
    {
      fields: ['featureKey'],
      name: 'idx_feature_key',
    },
  ],
});

export default UserFeatureFlag;
