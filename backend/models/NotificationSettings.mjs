// backend/models/NotificationSettings.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * NotificationSettings Model
 * Stores contact information for system notifications and alerts
 * This allows for updating notification settings through the UI
 * rather than requiring environment variable changes
 */
class NotificationSettings extends Model {}

NotificationSettings.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { 
        isEmail: true 
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    notificationType: {
      type: DataTypes.ENUM('ADMIN', 'ORIENTATION', 'ORDER', 'SYSTEM', 'ALL'),
      allowNull: false,
      defaultValue: 'ALL',
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    }
  },
  {
    sequelize,
    modelName: 'NotificationSettings',
    tableName: 'notification_settings',
    timestamps: true,
  }
);

export default NotificationSettings;
