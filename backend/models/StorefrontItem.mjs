import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * StorefrontItem Model
 * 
 * This model represents a training package offered on the storefront.
 * Supports two types of packages:
 *  - 'fixed': One-time purchase packages with a fixed number of sessions.
 *  - 'monthly': Recurring packages with details such as months and sessions per week.
 */
class StorefrontItem extends Model {}

StorefrontItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
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
    sessions: {
      // Only applicable for fixed packages.
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    pricePerSession: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    months: {
      // Only applicable for monthly packages.
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    sessionsPerWeek: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    totalSessions: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    totalCost: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'StorefrontItem',
    tableName: 'storefront_items',
    timestamps: true,
  }
);

export default StorefrontItem;
