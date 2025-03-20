// backend/models/CartItem.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class CartItem extends Model {}

CartItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    // Store the price at the time of purchase.
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'CartItem',
    tableName: 'cart_items',
    timestamps: true,
  }
);

// IMPORTANT: Remove the associations from here since they're now in setupAssociations.mjs
// This prevents circular dependencies and keeps all associations in one place

export default CartItem;