import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

export const DELIVERY_CHANNELS = ['in_app', 'push', 'email', 'sms'];
export const DELIVERY_STATUSES = ['pending', 'sent', 'delivered', 'failed', 'opened', 'clicked', 'skipped'];

/**
 * NotificationDelivery Model
 * Tracks per-user, per-channel delivery lifecycle for canonical notifications.
 */
class NotificationDelivery extends Model {}

NotificationDelivery.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    notificationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'notifications', key: 'id' },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
      onDelete: 'CASCADE',
    },
    channel: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'in_app',
      validate: { isIn: [DELIVERY_CHANNELS] },
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: { isIn: [DELIVERY_STATUSES] },
    },
    attemptCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lastAttemptAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    providerMessageId: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    errorCode: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'NotificationDelivery',
    tableName: 'notification_deliveries',
    timestamps: true,
    indexes: [
      { name: 'idx_notification_deliveries_notification', fields: ['notificationId'] },
      { name: 'idx_notification_deliveries_user', fields: ['userId'] },
      { name: 'idx_notification_deliveries_status', fields: ['status'] },
      { name: 'idx_notification_deliveries_unique_channel', unique: true, fields: ['notificationId', 'userId', 'channel'] },
    ],
  }
);

export default NotificationDelivery;