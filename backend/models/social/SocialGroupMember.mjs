/**
 * ============================================================================
 * FILE: SocialGroupMember.mjs
 * PURPOSE: Membership rows for SocialGroups — role + status per user.
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-07-14
 * ============================================================================
 *
 * ROLES:  owner (one, the creator) | moderator | member
 * STATUS: active | pending (private-group join request) | banned
 * A UNIQUE(groupId, userId) constraint makes join idempotent-safe.
 */

import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

export const GROUP_MEMBER_ROLES = ['owner', 'moderator', 'member'];
export const GROUP_MEMBER_STATUSES = ['active', 'pending', 'banned'];

const SocialGroupMember = db.define('SocialGroupMember', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'SocialGroups', key: 'id' },
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'member',
    validate: { isIn: [GROUP_MEMBER_ROLES] },
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'active',
    validate: { isIn: [GROUP_MEMBER_STATUSES] },
  },
}, {
  tableName: 'SocialGroupMembers',
  timestamps: true,
  // Explicit index names match migration 20260715000001 so a repair-sync
  // never creates duplicate auto-named indexes on the same columns.
  indexes: [
    { name: 'social_group_members_unique', unique: true, fields: ['groupId', 'userId'] },
    { name: 'social_group_members_user_idx', fields: ['userId'] },
  ],
});

export default SocialGroupMember;
