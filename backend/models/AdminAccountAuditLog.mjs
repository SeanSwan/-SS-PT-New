/**
 * AdminAccountAuditLog model.
 * Append-only forensics trail for owner-gated account-control actions.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

const APPEND_ONLY_MESSAGE = 'AdminAccountAuditLog is append-only: rows cannot be updated or deleted.';

class AdminAccountAuditLog extends Model {}

AdminAccountAuditLog.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    actorUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    targetUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    previousState: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    nextState: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'AdminAccountAuditLog',
    tableName: 'admin_account_audit_logs',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['actorUserId', 'createdAt'] },
      { fields: ['targetUserId', 'createdAt'] },
      { fields: ['action'] },
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

AdminAccountAuditLog.associate = (models) => {
  AdminAccountAuditLog.belongsTo(models.User, {
    foreignKey: 'actorUserId',
    as: 'actor',
  });
  AdminAccountAuditLog.belongsTo(models.User, {
    foreignKey: 'targetUserId',
    as: 'target',
  });
};

export default AdminAccountAuditLog;
