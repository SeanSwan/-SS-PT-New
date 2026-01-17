'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('client_onboarding_questionnaires', {
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
      questionnaireVersion: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: '3.0',
      },
      status: {
        type: Sequelize.ENUM('in_progress', 'submitted', 'completed', 'archived'),
        allowNull: false,
        defaultValue: 'in_progress',
      },
      responsesJson: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      primaryGoal: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      trainingTier: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      commitmentLevel: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      healthRisk: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      nutritionPrefs: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      completedAt: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('client_onboarding_questionnaires', ['userId']);
    await queryInterface.addIndex('client_onboarding_questionnaires', ['status']);
    await queryInterface.addIndex('client_onboarding_questionnaires', ['completedAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('client_onboarding_questionnaires');
  },
};
