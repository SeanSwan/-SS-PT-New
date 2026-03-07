/**
 * BootcampSpaceProfile — Gym space layouts for boot camp planning
 * Phase 10a: AI-analyzed from photos/video via Gemini Vision.
 */
import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

const BootcampSpaceProfile = sequelize.define('BootcampSpaceProfile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  trainerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  locationName: {
    type: DataTypes.STRING(200),
  },
  totalAreaSqft: {
    type: DataTypes.INTEGER,
  },
  maxStations: {
    type: DataTypes.INTEGER,
  },
  maxPerStation: {
    type: DataTypes.INTEGER,
    defaultValue: 4,
  },
  layoutData: {
    type: DataTypes.JSONB,
  },
  mediaUrls: {
    type: DataTypes.JSONB,
  },
  hasOutdoorAccess: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  outdoorDescription: {
    type: DataTypes.TEXT,
  },
  notes: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'bootcamp_space_profiles',
  timestamps: true,
});

export default BootcampSpaceProfile;
