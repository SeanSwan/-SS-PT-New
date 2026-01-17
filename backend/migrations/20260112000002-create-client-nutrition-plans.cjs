'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('client_nutrition_plans', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      planName: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      dailyCalories: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      proteinGrams: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
      },
      carbsGrams: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
      },
      fatGrams: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
      },
      fiberGrams: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
      },
      mealsJson: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      groceryListJson: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      dietaryRestrictions: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      allergies: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      hydrationTarget: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true,
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      source: {
        type: Sequelize.ENUM('manual', 'ai_generated'),
        allowNull: false,
        defaultValue: 'manual',
      },
      status: {
        type: Sequelize.ENUM('active', 'completed', 'archived'),
        allowNull: false,
        defaultValue: 'active',
      },
      masterPromptVersion: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: '3.0',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('client_nutrition_plans', ['userId']);
    await queryInterface.addIndex('client_nutrition_plans', ['status']);
    await queryInterface.addIndex('client_nutrition_plans', ['startDate']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('client_nutrition_plans');
  },
};
