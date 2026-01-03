/**
 * Set Model
 * =========
 * Represents an individual exercise set within a workout exercise.
 * This model normalizes what was previously stored as JSON in WorkoutExercise.setDetails.
 * 
 * This approach provides better data integrity, queryability, and analysis capabilities
 * compared to storing sets as JSON.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class Set extends Model {}

Set.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  workoutExerciseId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'workout_exercises',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  setNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    },
    comment: 'The order of this set within the exercise (1, 2, 3, etc.)'
  },
  setType: {
    type: DataTypes.ENUM('warmup', 'working', 'dropset', 'superset', 'failure', 'amrap', 'rest_pause'),
    defaultValue: 'working',
    comment: 'Indicates the type/purpose of this set'
  },
  repsGoal: {
    type: DataTypes.INTEGER,
    comment: 'Target number of repetitions for this set'
  },
  repsCompleted: {
    type: DataTypes.INTEGER,
    comment: 'Actual number of repetitions completed'
  },
  weightGoal: {
    type: DataTypes.FLOAT,
    comment: 'Target weight in pounds/kg for this set'
  },
  weightUsed: {
    type: DataTypes.FLOAT,
    comment: 'Actual weight used in pounds/kg'
  },
  duration: {
    type: DataTypes.INTEGER,
    comment: 'Duration of the set in seconds (for timed exercises)'
  },
  distance: {
    type: DataTypes.FLOAT,
    comment: 'Distance covered in miles/km (for distance-based exercises)'
  },
  restGoal: {
    type: DataTypes.INTEGER,
    comment: 'Target rest time in seconds after this set'
  },
  restTaken: {
    type: DataTypes.INTEGER,
    comment: 'Actual rest time taken in seconds after this set'
  },
  rpe: {
    type: DataTypes.FLOAT,
    validate: {
      min: 1,
      max: 10
    },
    comment: 'Rate of Perceived Exertion (1-10 scale)'
  },
  tempo: {
    type: DataTypes.STRING,
    comment: 'Tempo notation (e.g., "3-1-3" for 3s eccentric, 1s pause, 3s concentric)'
  },
  notes: {
    type: DataTypes.TEXT,
    comment: 'Notes specific to this set (form issues, modifications, etc.)'
  },
  isPR: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indicates if this set was a personal record'
  },
  completedAt: {
    type: DataTypes.DATE,
    comment: 'When the set was completed (allows tracking rest time between sets)'
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
  modelName: 'Set',
  tableName: 'sets',
  timestamps: true
});

export default Set;