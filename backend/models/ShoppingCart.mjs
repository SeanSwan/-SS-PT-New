// backend/models/ShoppingCart.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class ShoppingCart extends Model {}

ShoppingCart.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // Status: 'active' for an open cart, 'completed' after checkout
    status: {
      type: DataTypes.ENUM('active', 'completed'),
      defaultValue: 'active',
      allowNull: false,
    },
    // Updated userId to UUID to match User.id
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    // Add these fields needed for checkout
    checkoutSessionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paymentStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastActivityAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    checkoutSessionExpired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'ShoppingCart',
    tableName: 'shopping_carts',
    timestamps: true,
  }
);

// No associations here as they're all in setupAssociations.mjs

export default ShoppingCart;