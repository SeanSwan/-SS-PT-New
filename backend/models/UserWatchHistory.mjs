/**
 * UserWatchHistory Model - Resume/Progress Tracking
 * ==================================================
 * Tracks per-user video watch progress for "continue watching" and
 * completion analytics. Uses upsert on (user_id, video_id) for re-watches.
 */

import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

class UserWatchHistory extends sequelize.Sequelize.Model {}

UserWatchHistory.init({
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
    allowNull: false,
    references: { model: 'video_catalog', key: 'id' },
  },
  progress_seconds: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  completion_pct: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  completed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  last_watched_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  tableName: 'user_watch_history',
  timestamps: true,
  indexes: [
    { fields: ['user_id', 'video_id'], unique: true },
    { fields: ['user_id', { attribute: 'last_watched_at', order: 'DESC' }] },
    { fields: ['video_id', 'completed'] },
  ],
});

export default UserWatchHistory;
