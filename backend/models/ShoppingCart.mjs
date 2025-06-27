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
    // Updated userId to INTEGER to match User.id
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // Payment and checkout related fields
    paymentIntentId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Stripe Payment Intent ID for tracking payments'
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
      comment: 'Calculated total amount for the cart'
    },
    checkoutSessionId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Stripe Checkout Session ID (for legacy checkout)'
    },
    paymentStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Payment status: pending, paid, failed, cancelled'
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when the order was completed'
    },
    lastActivityAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time cart was modified'
    },
    checkoutSessionExpired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether the checkout session has expired'
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