// backend/models/FoodScanHistory.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * Food Scan History Model
 * Tracks user's food product scanning history.
 *
 * SCHEMA TRUTH (verified against information_schema 2026-07-29, rule 58): the real
 * food_scan_history table is a denormalized scan log — productName/productCode are copied at
 * scan time; there is NO product FK. The previous model declared productId/barcode/notes/
 * userRating/isFavorite/wasConsumed/location/metadata, none of which exist as columns, and did
 * NOT declare productName (NOT NULL) — so every INSERT violated a not-null constraint and was
 * swallowed by the caller's catch. The table had 0 rows for exactly that reason. Favorites,
 * ratings, and notes need an additive migration before they can return (SWA-87).
 */
class FoodScanHistory extends Model {}

FoodScanHistory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users', // Canonical user table — FKs must reference "Users", not "users"
        key: 'id'
      }
    },
    // Product identity is denormalized at scan time — the table has no product FK column.
    productName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    productCode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'UPC/EAN barcode as scanned'
    },
    scanDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    nutritionData: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.STRING,
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
