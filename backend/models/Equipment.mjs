/**
 * Equipment Model
 * ==============
 * Represents equipment that can be used in exercises.
 * This normalizes what was previously stored as a JSON array in Exercise.equipmentNeeded.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class Equipment extends Model {}

Equipment.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Name of the equipment (e.g., "Barbell", "Dumbbell")'
  },
  category: {
    type: DataTypes.ENUM('free_weight', 'machine', 'bodyweight', 'cable', 'cardio', 'resistance_band', 'kettlebell', 'medicine_ball', 'stability', 'other'),
    allowNull: false,
    comment: 'Category of equipment'
  },
  description: {
    type: DataTypes.TEXT,
    comment: 'Description of the equipment and its uses'
  },
  setupInstructions: {
    type: DataTypes.TEXT,
    comment: 'Instructions for setting up or adjusting the equipment'
  },
  safetyNotes: {
    type: DataTypes.TEXT,
    comment: 'Safety considerations when using this equipment'
  },
  imageUrl: {
    type: DataTypes.STRING,
    comment: 'URL to an image of the equipment'
  },
  availability: {
    type: DataTypes.ENUM('common', 'specialized', 'rare'),
    defaultValue: 'common',
    comment: 'How commonly available this equipment is in standard gyms'
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
  modelName: 'Equipment',
  tableName: 'equipment',
  timestamps: true
});

export default Equipment;