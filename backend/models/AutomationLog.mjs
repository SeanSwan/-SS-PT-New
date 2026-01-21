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
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
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
      type: DataTypes.ENUM('pending', 'sent', 'failed', 'cancelled'),
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
};

export default AutomationLog;
