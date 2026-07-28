/**
 * CommunicationAuditLog model.
 * Append-only forensics trail for communication and notification actions.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

const APPEND_ONLY_MESSAGE = 'CommunicationAuditLog is append-only: rows cannot be updated or deleted.';

class CommunicationAuditLog extends Model {}

CommunicationAuditLog.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    eventId: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    actorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    recipientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    notificationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    entityType: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    entityId: {
      type: DataTypes.STRING(120),
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
    modelName: 'CommunicationAuditLog',
    tableName: 'communication_audit_logs',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['action', 'createdAt'] },
      { fields: ['actorId', 'createdAt'] },
      { fields: ['recipientId', 'createdAt'] },
      { fields: ['notificationId'] },
      { fields: ['eventId'] },
    ],
    hooks: {
      beforeUpdate: () => {
        throw new Error(APPEND_ONLY_MESSAGE);
      },
      beforeDestroy: () => {
        throw new Error(APPEND_ONLY_MESSAGE);
      },
      beforeBulkUpdate: () => {
        throw new Error(APPEND_ONLY_MESSAGE);
      },
      beforeBulkDestroy: () => {
        throw new Error(APPEND_ONLY_MESSAGE);
      },
    },
  }
);

CommunicationAuditLog.associate = (models) => {
  CommunicationAuditLog.belongsTo(models.User, { foreignKey: 'actorId', as: 'actor' });
  CommunicationAuditLog.belongsTo(models.User, { foreignKey: 'recipientId', as: 'recipient' });
  CommunicationAuditLog.belongsTo(models.Notification, { foreignKey: 'notificationId', as: 'notification' });
};

export default CommunicationAuditLog;