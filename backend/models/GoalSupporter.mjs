/**
 * GoalSupporter Model - Social Accountability Junction
 * =====================================================
 * Tracks who supports which goals. Enables accountability partners,
 * supporter notifications, and social goal feeds.
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const GoalSupporter = db.define('GoalSupporter', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  goalId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'goals', key: 'id' },
  },
  supporterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    comment: 'User who is supporting this goal',
  },
  // Notification preferences
  notifyOnProgress: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Receive notifications when goal owner updates progress',
  },
  notifyOnCompletion: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  // Engagement tracking
  encouragementsSent: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  lastEncouragementAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'goal_supporters',
  timestamps: true,
  indexes: [
    { fields: ['goalId', 'supporterId'], unique: true },
    { fields: ['supporterId'] },
    { fields: ['goalId'] },
  ],
});

export default GoalSupporter;
