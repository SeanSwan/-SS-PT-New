/**
 * GoalLike Model - Celebrate Goal Progress
 * =========================================
 * Lightweight reaction system for goals.
 * Supports different reaction types for richer engagement.
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const GoalLike = db.define('GoalLike', {
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
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  reactionType: {
    type: DataTypes.ENUM('like', 'celebrate', 'support', 'fire', 'inspire'),
    allowNull: false,
    defaultValue: 'like',
  },
}, {
  tableName: 'goal_likes',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['goalId', 'userId', 'reactionType'], unique: true },
    { fields: ['goalId'] },
    { fields: ['userId'] },
  ],
});

export default GoalLike;
