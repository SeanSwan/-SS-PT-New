import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class AutomationLog extends Model {}

AutomationLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    sequenceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'automation_sequences',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    // Nurture target when this log belongs to a captured Lead (no User yet). Soft
    // reference (no FK) so a lead delete never blocks; userId XOR leadId in practice.
    leadId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    stepIndex: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    channel: {
      type: DataTypes.ENUM('sms', 'email', 'push'),
      allowNull: false,
      defaultValue: 'sms'
    },
    status: {
      // 'processing' = atomically claimed by a drip runner and mid-send (TOCTOU guard,
      // see migration 20260616140000 + NURTURE-PRE-ARM-AUDIT-2026-06-16 BLOCKER 2).
      type: DataTypes.ENUM('pending', 'processing', 'sent', 'failed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    scheduledFor: {
      type: DataTypes.DATE,
      allowNull: false
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    templateName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    recipient: {
      type: DataTypes.STRING,
      allowNull: true
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    payloadJson: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'AutomationLog',
    tableName: 'automation_logs',
    timestamps: true,
    indexes: [
      { fields: ['sequenceId'] },
      { fields: ['userId'] },
      { fields: ['leadId'] },
      { fields: ['status'] },
      { fields: ['scheduledFor'] }
    ]
  }
);

AutomationLog.associate = (models) => {
  AutomationLog.belongsTo(models.AutomationSequence, {
    foreignKey: 'sequenceId',
    as: 'sequence'
  });
  AutomationLog.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  if (models.Lead) {
    AutomationLog.belongsTo(models.Lead, { foreignKey: 'leadId', as: 'lead', constraints: false });
  }
};

export default AutomationLog;
