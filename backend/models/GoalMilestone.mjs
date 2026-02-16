/**
 * GoalMilestone Model - Normalized Goal-Milestone Junction
 * ========================================================
 * Links goals to system-defined milestones for structured
 * checkpoint tracking and XP rewards at each milestone.
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const GoalMilestone = db.define('GoalMilestone', {
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
  // Milestone checkpoint
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { len: [1, 100] },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Target
  targetValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Value at which this milestone is achieved',
  },
  targetPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Alternative: percentage of parent goal (e.g., 25%, 50%, 75%)',
  },
  // Status
  isAchieved: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  achievedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // Rewards
  xpReward: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 25,
  },
  badgeId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Optional badge awarded at this milestone',
  },
  // Ordering
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'goal_milestones',
  timestamps: true,
  indexes: [
    { fields: ['goalId', 'sortOrder'] },
    { fields: ['goalId', 'isAchieved'] },
  ],
});

export default GoalMilestone;
