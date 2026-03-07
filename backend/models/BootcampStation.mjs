/**
 * BootcampStation — Stations within a boot camp class template
 * Phase 10a: Defines station layout, equipment, and ordering.
 */
import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

const BootcampStation = sequelize.define('BootcampStation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  templateId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'bootcamp_templates', key: 'id' },
  },
  stationNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  stationName: {
    type: DataTypes.STRING(100),
  },
  equipmentNeeded: {
    type: DataTypes.TEXT,
  },
  setupTimeSec: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  notes: {
    type: DataTypes.TEXT,
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'bootcamp_stations',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['templateId', 'stationNumber'],
      name: 'idx_bootcamp_stations_unique',
    },
  ],
});

export default BootcampStation;
