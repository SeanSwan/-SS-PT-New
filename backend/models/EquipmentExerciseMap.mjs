/**
 * EquipmentExerciseMap Model
 * ==========================
 * Maps equipment items to exercises they support.
 * Links to both the 81-exercise built-in registry and custom exercises.
 *
 * AI auto-suggests mappings when equipment is scanned/approved;
 * trainer confirms before mapping becomes active.
 *
 * Associations:
 *   EquipmentItem -> hasMany EquipmentExerciseMap
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class EquipmentExerciseMap extends Model {}

EquipmentExerciseMap.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  equipmentItemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'equipment_items', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'Equipment item this mapping belongs to',
  },
  exerciseKey: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Exercise identifier (built-in key like "squat" or custom exercise slug)',
  },
  exerciseName: {
    type: DataTypes.STRING(150),
    allowNull: false,
    comment: 'Display name for the exercise',
  },
  isCustomExercise: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this maps to a custom exercise (vs built-in)',
  },
  customExerciseId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'custom_exercises', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'FK to custom_exercises if isCustomExercise=true',
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this is the primary equipment for this exercise',
  },
  isAiSuggested: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this mapping was AI-suggested (vs manual)',
  },
  confirmed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Trainer confirmed this mapping (AI suggestions start as false)',
  },
}, {
  sequelize,
  tableName: 'equipment_exercise_map',
  timestamps: true,
  paranoid: false,
  indexes: [
    { fields: ['equipmentItemId'], name: 'idx_eq_exercise_map_item' },
    { fields: ['exerciseKey'], name: 'idx_eq_exercise_map_exercise' },
    { fields: ['equipmentItemId', 'exerciseKey'], unique: true, name: 'idx_eq_exercise_map_unique' },
    { fields: ['customExerciseId'], name: 'idx_eq_exercise_map_custom' },
    { fields: ['confirmed'], name: 'idx_eq_exercise_map_confirmed' },
  ],
});

export default EquipmentExerciseMap;
