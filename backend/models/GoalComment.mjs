/**
 * GoalComment Model - Social Encouragement on Goals
 * ==================================================
 * Comments and encouragement messages on public goals.
 * Enables community engagement and accountability.
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const GoalComment = db.define('GoalComment', {
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
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    comment: 'User who posted the comment',
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 500],
      notEmpty: true,
    },
  },
  // Comment type
  commentType: {
    type: DataTypes.ENUM('encouragement', 'tip', 'celebration', 'general'),
    allowNull: false,
    defaultValue: 'general',
  },
  // Moderation
  isHidden: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  hiddenReason: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'goal_comments',
  timestamps: true,
  indexes: [
    { fields: ['goalId', 'createdAt'] },
    { fields: ['userId'] },
    { fields: ['commentType'] },
  ],
});

export default GoalComment;
