/**
 * WorkoutPlan Model (PostgreSQL Version)
 * =====================================
 * PostgreSQL version to work with WorkoutPlanDay, WorkoutPlanDayExercise, etc.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class WorkoutPlan extends Model {}

WorkoutPlan.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'User who owns this plan'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  durationWeeks: {
    type: DataTypes.INTEGER,
    allowNull: false,
    min: 1,
    comment: 'Duration of the plan in weeks'
  },
  status: {
    type: DataTypes.ENUM('active', 'archived', 'draft'),
    defaultValue: 'active',
    allowNull: false
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Tags for categorizing the plan'
  },
  difficulty: {
    type: DataTypes.INTEGER,
    allowNull: true,
    min: 1,
    max: 10,
    comment: 'Difficulty level 1-10'
  },
  isTemplate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this plan can be used as a template'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this plan is publicly shareable'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'WorkoutPlan',
  tableName: 'WorkoutPlans',
  timestamps: true
});

export default WorkoutPlan;