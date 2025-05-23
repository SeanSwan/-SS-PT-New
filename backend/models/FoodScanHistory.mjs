// backend/models/FoodScanHistory.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * Food Scan History Model
 * Tracks user's food product scanning history
 */
class FoodScanHistory extends Model {}

FoodScanHistory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // User who performed the scan
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    // The product that was scanned
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'food_products',
        key: 'id'
      }
    },
    // Barcode that was scanned
    barcode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Timestamp of the scan (defaults to current time)
    scanDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    // Optional user notes about this scan
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Optional user rating of the product (1-5)
    userRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    // Whether the user saved this product to their favorites
    isFavorite: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // Whether the user marked this product as consumed
    wasConsumed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    // Location of the scan (if provided)
    location: {
      type: DataTypes.JSON, // { latitude, longitude, placeName }
      allowNull: true,
    },
    // Additional scan metadata
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'FoodScanHistory',
    tableName: 'food_scan_history',
    timestamps: true,
  }
);

export default FoodScanHistory;