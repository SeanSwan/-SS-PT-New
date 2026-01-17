import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class ClientOnboardingQuestionnaire extends Model {}

ClientOnboardingQuestionnaire.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    questionnaireVersion: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '3.0',
      validate: {
        len: [1, 20],
      },
    },
    status: {
      type: DataTypes.ENUM('in_progress', 'submitted', 'completed', 'archived'),
      allowNull: false,
      defaultValue: 'in_progress',
    },
    responsesJson: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Raw 85-question responses from onboarding questionnaire',
    },
    primaryGoal: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    trainingTier: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    commitmentLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 10,
      },
    },
    healthRisk: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    nutritionPrefs: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'ClientOnboardingQuestionnaire',
    tableName: 'client_onboarding_questionnaires',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['status'] },
      { fields: ['completedAt'] },
    ],
  }
);

ClientOnboardingQuestionnaire.associate = (models) => {
  ClientOnboardingQuestionnaire.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
  });
  ClientOnboardingQuestionnaire.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'createdByUser',
  });
};

export default ClientOnboardingQuestionnaire;
