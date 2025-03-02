// backend/models/StorefrontItem.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * StorefrontItem Model
 *
 * This model stores items offered in the storefront.
 * It supports two package types:
 *   - "fixed": A one-time purchase package (with a fixed number of sessions).
 *   - "monthly": A recurring package (with details like months and sessions per week).
 *
 * Fields:
 *   - packageType: ENUM('fixed', 'monthly') — distinguishes the package type.
 *   - name: Name of the package.
 *   - description: A short description.
 *   - sessions: (fixed packages only) The number of sessions.
 *   - pricePerSession: The price per session.
 *   - months: (monthly packages only) The number of months.
 *   - sessionsPerWeek: (monthly packages only) The number of sessions per week.
 *   - totalSessions: (optional) Total sessions (calculated or stored for monthly packages).
 *   - totalCost: (optional) Total cost (calculated or stored for monthly packages).
 */
class StorefrontItem extends Model {}

StorefrontItem.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // 'fixed' for one-time packages or 'monthly' for recurring packages.
  packageType: {
    type: DataTypes.ENUM('fixed', 'monthly'),
    allowNull: false,
    defaultValue: 'fixed',
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // For fixed packages (e.g., 8 sessions).
  sessions: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Common field: Price per session.
  pricePerSession: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  // For monthly packages.
  months: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  sessionsPerWeek: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Optional fields that can be pre-calculated.
  totalSessions: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  totalCost: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'StorefrontItem',
  tableName: 'storefront_items',
  timestamps: true,
});

export default StorefrontItem;
