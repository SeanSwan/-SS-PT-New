/**
 * MuscleGroup Model
 * ================
 * Represents a muscle group that exercises can target.
 * This normalizes what was previously stored as JSON arrays in Exercise.primaryMuscles
 * and Exercise.secondaryMuscles.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class MuscleGroup extends Model {}

MuscleGroup.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Name of the muscle group (e.g., "Quadriceps", "Latissimus Dorsi")'
  },
  shortName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Short name or abbreviation (e.g., "Quads", "Lats")'
  },
  bodyRegion: {
    type: DataTypes.ENUM('upper_body', 'lower_body', 'core', 'full_body'),
    allowNull: false,
    comment: 'General body region this muscle group belongs to'
  },
  description: {
    type: DataTypes.TEXT,
    comment: 'Description of the muscle group and its function'
  },
  anatomicalInfo: {
    type: DataTypes.TEXT,
    comment: 'Detailed anatomical information about the muscle group'
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
  modelName: 'MuscleGroup',
  tableName: 'muscle_groups',
  timestamps: true
});

export default MuscleGroup;