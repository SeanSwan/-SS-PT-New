/**
 * ExerciseMuscleGroup Model
 * ========================
 * Junction table connecting Exercises to MuscleGroups with additional metadata
 * about the relationship (primary vs secondary, activation level).
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class ExerciseMuscleGroup extends Model {}

ExerciseMuscleGroup.init({
  exerciseId: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'Exercises',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  muscleGroupId: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'muscle_groups',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  activationType: {
    type: DataTypes.ENUM('primary', 'secondary', 'stabilizer'),
    allowNull: false,
    defaultValue: 'primary',
    comment: 'Whether this is a primary or secondary muscle group for the exercise'
  },
  activationLevel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    validate: {
      min: 1,
      max: 10
    },
    comment: 'Relative activation level on a scale of 1-10'
  },
  notes: {
    type: DataTypes.TEXT,
    comment: 'Any specific notes about how this muscle is engaged in the exercise'
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
  modelName: 'ExerciseMuscleGroup',
  tableName: 'exercise_muscle_groups',
  timestamps: true
});

export default ExerciseMuscleGroup;