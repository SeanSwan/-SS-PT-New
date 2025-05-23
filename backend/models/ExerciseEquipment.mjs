/**
 * ExerciseEquipment Model
 * ======================
 * Junction table connecting Exercises to Equipment with additional metadata
 * about the relationship (required vs optional, setup instructions).
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class ExerciseEquipment extends Model {}

ExerciseEquipment.init({
  exerciseId: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'Exercises',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  equipmentId: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'Equipment',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  required: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether this equipment is required or optional for the exercise'
  },
  preferredWeight: {
    type: DataTypes.STRING,
    comment: 'Recommended starting weight or range for this equipment (e.g., "10-25 lbs")'
  },
  setupInstructions: {
    type: DataTypes.TEXT,
    comment: 'Specific setup instructions for this equipment with this exercise'
  },
  alternatives: {
    type: DataTypes.TEXT,
    comment: 'Suggested alternative equipment if this one is not available'
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
  modelName: 'ExerciseEquipment',
  tableName: 'exercise_equipment',
  timestamps: true
});

export default ExerciseEquipment;