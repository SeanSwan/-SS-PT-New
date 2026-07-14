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
      allowNull: true,
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
      type: DataTypes.ENUM('pending', 'pending_payment', 'processing', 'completed', 'refunded', 'failed'),
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
    stripePaymentIntentId: {
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
    // Commission & tax attribution (migration 20260101000003-extend-orders-table;
    // columns verified live in production 2026-07-13 via scripts/inspect-orders-schema.mjs)
    trainerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'trainer_id',
      comment: 'Trainer attributed to this sale (for commission)'
    },
    leadSource: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'lead_source',
      comment: 'Origin of the sale: platform, trainer_brought, resign'
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'tax_amount',
    },
    taxRateApplied: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      defaultValue: 0.0,
      field: 'tax_rate_applied',
    },
    taxChargedToClient: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'tax_charged_to_client',
      comment: 'True if tax charged on top, false if absorbed by business'
    },
    clientState: {
      type: DataTypes.STRING(2),
      allowNull: true,
      field: 'client_state',
    },
    businessCut: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'business_cut',
      comment: 'Business commission amount in dollars'
    },
    trainerCut: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: 'trainer_cut',
      comment: 'Trainer commission amount in dollars'
    },
    grantReason: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'grant_reason',
      comment: 'Reason for credit grant: purchase_pending, admin_grant, etc.'
    },
    sessionsGranted: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sessions_granted',
      comment: 'Total sessions granted from this order'
    },
    creditsGrantedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'credits_granted_at',
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