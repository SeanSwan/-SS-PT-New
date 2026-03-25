/**
 * ============================================================================
 * FILE: UserHashtagFollow.mjs
 * PURPOSE: Tracks which hashtags a user follows for personalized feeds
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Enables users to follow hashtags to see them
 * prioritized in their feeds and get discovery recommendations.
 * HOW IT FITS IN THE APP: User ←→ UserHashtagFollow ←→ Hashtag
 */

import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

const UserHashtagFollow = db.define('UserHashtagFollow', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  hashtagId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Hashtags',
      key: 'id'
    },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'UserHashtagFollows',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { unique: true, fields: ['userId', 'hashtagId'] },
    { fields: ['userId'] },
    { fields: ['hashtagId'] }
  ]
});

export default UserHashtagFollow;
