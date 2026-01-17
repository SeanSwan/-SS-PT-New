import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class ClientNutritionPlan extends Model {}

ClientNutritionPlan.init(
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
    planName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        len: [1, 150],
      },
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dailyCalories: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    proteinGrams: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    carbsGrams: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    fatGrams: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    fiberGrams: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    mealsJson: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    groceryListJson: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    dietaryRestrictions: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    allergies: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    hydrationTarget: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
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
    source: {
      type: DataTypes.ENUM('manual', 'ai_generated'),
      allowNull: false,
      defaultValue: 'manual',
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'archived'),
      allowNull: false,
      defaultValue: 'active',
    },
    masterPromptVersion: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '3.0',
      validate: {
        len: [1, 20],
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'ClientNutritionPlan',
    tableName: 'client_nutrition_plans',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['status'] },
      { fields: ['startDate'] },
    ],
  }
);

ClientNutritionPlan.associate = (models) => {
  ClientNutritionPlan.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  ClientNutritionPlan.belongsTo(models.User, { foreignKey: 'createdBy', as: 'createdByUser' });
};

export default ClientNutritionPlan;
