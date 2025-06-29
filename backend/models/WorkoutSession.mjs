/**
 * WorkoutSession Model (PostgreSQL Version)
 * ========================================
 * Converted from MongoDB to PostgreSQL to work with the rest of the Sequelize ecosystem.
 * Represents a completed workout session with exercises and performance data.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class WorkoutSession extends Model {
  // Method to calculate session stats (converted from Mongoose method)
  calculateStats() {
    // This will be calculated from related WorkoutExercise and Set records
    // We'll implement this as a static method or via associations
    return {
      totalWeight: this.totalWeight || 0,
      totalReps: this.totalReps || 0,
      totalSets: this.totalSets || 0
    };
  }
}

WorkoutSession.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',  // FIXED: Match actual User table name
      key: 'id'
    },
    comment: 'User who performed this workout session (client)'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Title/name of the workout session'
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Date when the workout was performed'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Duration of workout in minutes'
  },
  intensity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 10
    },
    comment: 'Perceived intensity of workout (1-10 scale)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
    comment: 'General notes about the workout session'
  },
  // Calculated/aggregated fields (will be computed from related WorkoutExercise/Set records)
  totalWeight: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Total weight lifted in this session (calculated)'
  },
  totalReps: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Total number of repetitions in this session (calculated)'
  },
  totalSets: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: 'Total number of sets in this session (calculated)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this workout session is currently in progress'
  },
  // Performance tracking
  avgRPE: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 1,
      max: 10
    },
    comment: 'Average Rate of Perceived Exertion for the session'
  },
  // Gamification integration
  experiencePoints: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'XP earned from this workout session'
  },
  // Workout plan integration
  workoutPlanId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'WorkoutPlans',  // FIXED: Match actual WorkoutPlan table name
      key: 'id'
    },
    comment: 'Reference to workout plan if this session was part of a plan'
  },
  workoutPlanDayId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'WorkoutPlanDays',  // FIXED: Match actual WorkoutPlanDay table name
      key: 'id'
    },
    comment: 'Reference to specific workout plan day if applicable'
  },
  // Session completion status
  status: {
    type: DataTypes.ENUM('planned', 'in_progress', 'completed', 'skipped', 'cancelled'),
    defaultValue: 'planned',
    allowNull: false,
    comment: 'Current status of the workout session'
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the workout was actually started'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the workout was completed'
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
  modelName: 'WorkoutSession',
  tableName: 'workout_sessions',
  timestamps: true,
  indexes: [
    {
      fields: ['userId'],
      name: 'workout_session_user_idx'
    },
    {
      fields: ['date'],
      name: 'workout_session_date_idx'
    },
    {
      fields: ['userId', 'date'],
      name: 'workout_session_user_date_idx'
    },
    {
      fields: ['status'],
      name: 'workout_session_status_idx'
    }
  ]
});

export default WorkoutSession;