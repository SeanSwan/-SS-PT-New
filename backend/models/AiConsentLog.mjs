import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class AiConsentLog extends Model {}

AiConsentLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    action: {
      type: DataTypes.ENUM('granted', 'withdrawn', 'override_used'),
      allowNull: false,
    },
    sourceType: {
      type: DataTypes.ENUM('ai_privacy_profile', 'waiver_record', 'admin_override'),
      allowNull: false,
    },
    sourceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Polymorphic source id (ai_privacy_profiles.id or waiver_records.id)',
    },
    actorUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'AiConsentLog',
    tableName: 'ai_consent_logs',
    timestamps: true,
    indexes: [
      { fields: ['userId'], name: 'ai_consent_logs_userId' },
      { fields: ['sourceType', 'sourceId'], name: 'ai_consent_logs_sourceType_sourceId' },
    ],
  },
);

AiConsentLog.associate = (models) => {
  AiConsentLog.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
  });
  AiConsentLog.belongsTo(models.User, {
    foreignKey: 'actorUserId',
    as: 'actor',
  });
};

export default AiConsentLog;
