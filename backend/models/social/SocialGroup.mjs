/**
 * ============================================================================
 * FILE: SocialGroup.mjs
 * PURPOSE: First-class community groups — each group owns a feed (SocialPosts
 *          rows with groupId) and links to a messaging conversation for chat.
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-07-14
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Upgrades "chat groups" (bare conversations rows) into
 * real communities with identity (name/emoji/description/category), privacy
 * (public|private), membership roles, and their own post feed. The linked
 * conversationId keeps group chat on the proven messaging stack.
 *
 * DESIGN NOTES:
 * - conversationId has NO FK constraint: the messaging `conversations` table
 *   is created lazily by ensureMessagingTables(), so it may not exist at
 *   migration time. Chat linkage is best-effort by design.
 * - Groups are archived, never hard-deleted from the API. The SocialPosts
 *   FK (ON DELETE CASCADE) is a backstop for manual DB cleanup only.
 */

import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

export const GROUP_PRIVACY_VALUES = ['public', 'private'];
export const GROUP_CATEGORY_VALUES = [
  'fitness', 'nutrition', 'motivation', 'lifestyle', 'creative', 'sports', 'general'
];

const SocialGroup = db.define('SocialGroup', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(80),
    allowNull: false,
    validate: { len: [3, 80] },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  emoji: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  photo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING(40),
    allowNull: false,
    defaultValue: 'general',
    validate: { isIn: [GROUP_CATEGORY_VALUES] },
  },
  privacy: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'public',
    validate: { isIn: [GROUP_PRIVACY_VALUES] },
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  conversationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  memberCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  lastActivityAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'SocialGroups',
  timestamps: true,
  // Matches migration 20260715000001 (discovery ORDER BY privacy/archived/
  // activity) so the index survives a model-only sync on a fresh DB.
  indexes: [
    { name: 'social_groups_privacy_activity_idx', fields: ['privacy', 'isArchived', 'lastActivityAt'] },
  ],
});

export default SocialGroup;
