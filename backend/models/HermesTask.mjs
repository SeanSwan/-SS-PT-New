/**
 * HermesTask model.
 *
 * Durable operator queue for Hermes/Swan Coach follow-up tasks. Task bodies may
 * contain sensitive operational context, so API list views must keep returning
 * summaries only unless a scoped detail endpoint is explicitly requested.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

export const HERMES_TASK_AGENT_TYPES = Object.freeze([
  'dev',
  'coach',
  'content',
  'marketer',
  'platform',
  'ops',
  'nutrition',
  'life',
]);

export const HERMES_TASK_STATUSES = Object.freeze([
  'pending',
  'in_progress',
  'completed',
  'failed',
  'cancelled',
]);

class HermesTask extends Model {}

HermesTask.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    agentType: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: 'agent_type',
      validate: { isIn: [HERMES_TASK_AGENT_TYPES] },
    },
    taskTitle: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'task_title',
      validate: { len: [1, 200] },
    },
    taskDescription: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'task_description',
    },
    priority: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'normal',
      validate: { isIn: [['low', 'normal', 'high']] },
    },
    requestedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'requested_by',
      references: { model: 'Users', key: 'id' },
    },
    status: {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: 'pending',
      validate: { isIn: [HERMES_TASK_STATUSES] },
    },
    completedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'completed_by',
      references: { model: 'Users', key: 'id' },
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
    },
    terminalReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'terminal_reason',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'HermesTask',
    tableName: 'hermes_tasks',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['agent_type', 'status'] },
      { fields: ['requested_by'] },
      { fields: ['status'] },
      { fields: ['created_at'] },
    ],
  }
);

export default HermesTask;
