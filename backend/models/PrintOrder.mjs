/**
 * PrintOrder Model
 * ================
 * Tracks print-on-demand orders placed by gallery visitors.
 * Links to GalleryPhoto for the source image and GalleryVisitor for the buyer.
 * Commission tracked for SwanStudios revenue share (15-20%).
 */
import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

const PrintOrder = sequelize.define('PrintOrder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  visitorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'visitor_id',
  },
  photoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'photo_id',
  },
  eventId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'event_id',
  },
  productType: {
    type: DataTypes.ENUM('print', 'canvas', 'metal', 'photobook', 'poster'),
    allowNull: false,
    field: 'product_type',
  },
  size: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'e.g., 8x10, 16x20, 24x36',
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  cropData: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'crop_data',
    comment: 'JSON with x, y, width, height crop coordinates',
  },
  priceUsd: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'price_usd',
  },
  commissionUsd: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'commission_usd',
    comment: 'SwanStudios commission (15-20%)',
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'),
    defaultValue: 'pending',
  },
  stripeSessionId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'stripe_session_id',
  },
  idempotencyKey: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'idempotency_key',
    comment: 'Stable gallery print payment-attempt key',
  },
  printProviderOrderId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'print_provider_order_id',
    comment: 'Order ID from Printful/Gelato/etc',
  },
  shippingAddress: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'shipping_address',
  },
  trackingNumber: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'tracking_number',
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'paid_at',
  },
  shippedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'shipped_at',
  },
}, {
  tableName: 'print_orders',
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['visitor_id'] },
    { fields: ['photo_id'] },
    { fields: ['event_id'] },
    { fields: ['status'] },
    { fields: ['idempotency_key'] },
  ],
});

export default PrintOrder;
