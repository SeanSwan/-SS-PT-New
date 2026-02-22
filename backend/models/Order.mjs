// backend/models/Order.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class Order extends Model {}

Order.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    cartId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'refunded', 'failed'),
      defaultValue: 'pending',
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paymentId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    billingEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    billingName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    shippingAddress: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // P0: Payment Application Tracking (MindBody-like idempotent payment)
    paymentAppliedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when payment was applied (idempotency check)'
    },
    paymentAppliedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Admin user ID who applied the payment'
    },
    paymentReference: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'External payment reference (Venmo ID, cash receipt, check #, Stripe PI)'
    },
    idempotencyKey: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Idempotency key for payment recovery dedup (frontend UUID v4)'
    },
  },
  {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    timestamps: true,
  }
);

export default Order;