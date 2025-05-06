/**
 * WorkoutPlanDay Model
 * ===================
 * Represents a day within a workout plan.
 * This normalizes what was previously stored as JSON in WorkoutPlan.workoutStructure.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class WorkoutPlanDay extends Model {}

WorkoutPlanDay.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  workoutPlanId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'WorkoutPlans',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  dayNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Day number within the plan (1-based)'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Name/title for this day (e.g., "Push Day", "Lower Body", "Recovery")'
  },
  focus: {
    type: DataTypes.STRING,
    comment: 'Primary focus or goal of this workout day'
  },
  dayType: {
    type: DataTypes.ENUM('training', 'active_recovery', 'rest', 'assessment', 'specialization'),
    defaultValue: 'training',
    comment: 'Type of day within the plan'
  },
  optPhase: {
    type: DataTypes.ENUM('stabilization_endurance', 'strength_endurance', 'hypertrophy', 'maximal_strength', 'power'),
    comment: 'NASM OPT model phase for this workout day'
  },
  notes: {
    type: DataTypes.TEXT,
    comment: 'General notes for this workout day'
  },
  warmupInstructions: {
    type: DataTypes.TEXT,
    comment: 'Specific warmup instructions for this day'
  },
  cooldownInstructions: {
    type: DataTypes.TEXT,
    comment: 'Specific cooldown instructions for this day'
  },
  estimatedDuration: {
    type: DataTypes.INTEGER,
    comment: 'Estimated duration in minutes'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'For ordering days in the plan (allows non-sequential ordering)'
  },
  isTemplate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this day is a template that can be reused'
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
  modelName: 'WorkoutPlanDay',
  tableName: 'workout_plan_days',
  timestamps: true
});

export default WorkoutPlanDay;