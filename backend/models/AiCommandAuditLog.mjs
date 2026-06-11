/**
 * AiCommandAuditLog Model
 * =======================
 * Append-only audit trail for the Swan Coach command lane.
 * One row per command outcome: success, failure, RBAC denial, confirmation
 * minting/execution, cancellation, kill-switch block.
 *
 * APPEND-ONLY: update/destroy (single and bulk) throw at the model layer.
 * No updatedAt column. Rows are admin-forensics data — never sent to any LLM.
 *
 * Params are stored ONLY as (a) a SHA-256 hash and (b) a PII-redacted copy
 * produced by services/ai/commandAudit.mjs. Raw params never land here.
 *
 * Slice F1 — Command-Lane Security Foundation (2026-06-10)
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

const APPEND_ONLY_MESSAGE = 'AiCommandAuditLog is append-only: rows cannot be updated or deleted.';

class AiCommandAuditLog extends Model {}

AiCommandAuditLog.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'FK to "Users" — the actor who issued the command',
    },
    userRole: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Actor role at execution time (admin/trainer/client/user)',
    },
    commandType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Command registry key; null when unknown (e.g. cancel by operationId)',
    },
    targetClientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Resolved client the command targeted, when applicable',
    },
    destructive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    requiresConfirmation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    confirmationState: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'none',
      comment: 'none | pending | confirmed | cancelled',
    },
    operationId: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: 'Pending-operation id linking the confirmation chain',
    },
    outcome: {
      type: DataTypes.STRING(30),
      allowNull: false,
      comment: 'success | failed | denied | not_wired | confirmation_required | cancelled | blocked_killswitch | debate_started',
    },
    errorCode: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    paramsHash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: 'SHA-256 of canonicalized params JSON',
    },
    paramsRedacted: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Params after PII masking + long-text stripping (commandAudit.mjs)',
    },
    durationMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'AiCommandAuditLog',
    tableName: 'ai_command_audit_logs',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['userId', 'createdAt'] },
      { fields: ['commandType'] },
      { fields: ['outcome'] },
      { fields: ['targetClientId'] },
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

AiCommandAuditLog.associate = (models) => {
  AiCommandAuditLog.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
  });
};

export default AiCommandAuditLog;
