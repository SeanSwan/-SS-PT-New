/**
 * SessionPackage Model
 * ===================
 * Represents session packages/bundles available for purchase
 * Used for analytics and package management
 */

import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

const SessionPackage = sequelize.define('SessionPackage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sessionCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  duration: {
    type: DataTypes.INTEGER, // Duration in minutes
    allowNull: true,
    defaultValue: 60
  },
  packageType: {
    type: DataTypes.ENUM('individual', 'bundle', 'subscription'),
    defaultValue: 'individual'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  features: {
    type: DataTypes.JSON,
    allowNull: true
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
  tableName: 'session_packages',
  timestamps: true
});

export default SessionPackage;
