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
    // Status: cart lifecycle states for payment processing
    // 'active' - Cart being built by user
    // 'pending_payment' - Payment in progress (Stripe or manual)
    // 'completed' - Order completed and paid
    // 'cancelled' - Payment cancelled or expired
    status: {
      type: DataTypes.ENUM('active', 'pending_payment', 'completed', 'cancelled'),
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
    // IDEMPOTENCY: Tracks whether sessions have been granted for this order
    // Prevents double-grants when both webhook and verify-session are called
    sessionsGranted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether sessions have been granted to user (idempotency flag)'
    },
    // Optional: Track which endpoint granted the sessions
    stripeSessionData: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON data from Stripe session for audit trail'
    },
    // Optional: Store customer info for admin dashboard
    customerInfo: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON customer info for admin dashboard'
    },
    // Subtotal and tax for order breakdown
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Subtotal before tax'
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Tax amount'
    },
    lastCheckoutAttempt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last checkout attempt timestamp'
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