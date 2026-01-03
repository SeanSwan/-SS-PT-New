/**
 * WorkoutExercise Model (Enhanced)
 * ===============================
 * Junction table linking exercises to workout sessions.
 * Tracks performance metrics for each exercise in a workout session.
 * 
 * This enhanced version removes the JSON setDetails field and instead
 * establishes a relationship with the Set model for better data modeling.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class WorkoutExercise extends Model {}

WorkoutExercise.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  workoutSessionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'workout_sessions',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  exerciseId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Exercises',
      key: 'id'
    }
  },
  orderInWorkout: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'The order of this exercise within the workout'
  },
  // Performance Metrics
  performanceRating: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 10
    },
    comment: 'Overall performance rating (1-10)'
  },
  difficultyRating: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 10
    },
    comment: 'How difficult the exercise felt (1-10)'
  },
  painLevel: {
    type: DataTypes.INTEGER,
    validate: {
      min: 0,
      max: 10
    },
    defaultValue: 0,
    comment: 'Pain level during exercise (0-10)'
  },
  // Form Rating (NASM-based)
  formRating: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 5
    },
    comment: 'Rating of form quality (1-5)'
  },
  formNotes: {
    type: DataTypes.TEXT,
    comment: 'Notes on form and technique'
  },
  // Rehabilitation & Physical Therapy
  isRehabExercise: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indicates if this is a rehabilitation exercise'
  },
  rangeOfMotion: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 10
    },
    comment: 'Range of motion achievement (1-10)'
  },
  stabilityRating: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 10
    },
    comment: 'Stability during exercise (1-10)'
  },
  // Gamification Metrics
  experiencePoints: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'XP earned from this exercise'
  },
  achievementProgress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Progress towards achievements related to this exercise'
  },
  // General Notes
  notes: {
    type: DataTypes.TEXT,
    comment: 'General notes about this exercise performance'
  },
  // Timestamps for performance tracking
  startedAt: {
    type: DataTypes.DATE,
    comment: 'When the exercise was started'
  },
  completedAt: {
    type: DataTypes.DATE,
    comment: 'When the exercise was completed'
  },
  // Standard timestamps
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
  modelName: 'WorkoutExercise',
  tableName: 'workout_exercises',
  timestamps: true
});

export default WorkoutExercise;