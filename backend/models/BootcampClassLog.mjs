/**
 * BootcampClassLog — Log of actual boot camp classes taught
 * Phase 10a: Tracks what exercises were used, mods made, ratings.
 */
import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

const BootcampClassLog = sequelize.define('BootcampClassLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  templateId: {
    type: DataTypes.INTEGER,
    references: { model: 'bootcamp_templates', key: 'id' },
  },
  trainerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  classDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  dayType: {
    type: DataTypes.STRING(30),
  },
  actualParticipants: {
    type: DataTypes.INTEGER,
  },
  overflowActivated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  exercisesUsed: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  modificationsMade: {
    type: DataTypes.JSONB,
  },
  trainerNotes: {
    type: DataTypes.TEXT,
  },
  classRating: {
    type: DataTypes.INTEGER,
  },
  energyLevel: {
    type: DataTypes.STRING(20),
  },
  /**
   * SWA-105 Slice 8: { recordedAt, attendees: [{userId}|{guest}],
   * workoutFormIds: number[] }. NULL = never recorded; presence = recorded
   * exactly once (the service no-ops a second submission).
   */
  attendance: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'bootcamp_class_log',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['classDate'], name: 'idx_bootcamp_log_date' },
    { fields: ['trainerId'], name: 'idx_bootcamp_log_trainer' },
    { fields: ['dayType'], name: 'idx_bootcamp_log_day' },
  ],
});

export default BootcampClassLog;
