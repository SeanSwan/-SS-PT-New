// backend/models/Notification.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * Notification Model
 * Stores notifications for users with different types and read status
 */
class Notification extends Model {}

Notification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'system',
      validate: {
        isIn: {
          args: [['orientation', 'system', 'order', 'workout', 'client', 'admin', 'session', 'achievement', 'reward', 'measurement']],
          msg: 'Invalid notification type'
        }
      }
    },
    read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    persistent: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Persistent notifications survive "mark all read"'
    },
    relatedEntityType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Entity type for related entity (e.g., measurement, weighin)'
    },
    relatedEntityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Entity ID for related entity (e.g., client userId for overdue item)'
    },
    link: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: true,
  }
);

export default Notification;
