/**
 * WorkoutPlanDayExercise Model
 * ===========================
 * Represents an exercise within a workout plan day.
 * This further normalizes what was previously stored as JSON in WorkoutPlan.workoutStructure.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class WorkoutPlanDayExercise extends Model {}

WorkoutPlanDayExercise.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  workoutPlanDayId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'WorkoutPlanDays',
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
    comment: 'Order of this exercise within the workout day'
  },
  setScheme: {
    type: DataTypes.STRING,
    comment: 'Set scheme (e.g., "3x10", "5x5", "1x20")'
  },
  repGoal: {
    type: DataTypes.STRING,
    comment: 'Rep goals (e.g., "8-12", "5", "AMRAP")'
  },
  restPeriod: {
    type: DataTypes.INTEGER,
    comment: 'Rest period in seconds between sets'
  },
  tempo: {
    type: DataTypes.STRING,
    comment: 'Tempo notation (e.g., "3-1-3" for 3s eccentric, 1s pause, 3s concentric)'
  },
  intensityGuideline: {
    type: DataTypes.STRING,
    comment: 'Intensity guideline (e.g., "70% 1RM", "RPE 8", "Moderate")'
  },
  supersetGroup: {
    type: DataTypes.INTEGER,
    comment: 'Group number for exercises in the same superset (null if not a superset)'
  },
  notes: {
    type: DataTypes.TEXT,
    comment: 'Notes specific to this exercise within this workout day'
  },
  isOptional: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this exercise is optional in the plan'
  },
  alternateExerciseId: {
    type: DataTypes.UUID,
    references: {
      model: 'Exercises',
      key: 'id'
    },
    comment: 'Alternative exercise if the main one cannot be performed'
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
  modelName: 'WorkoutPlanDayExercise',
  tableName: 'workout_plan_day_exercises',
  timestamps: true
});

export default WorkoutPlanDayExercise;