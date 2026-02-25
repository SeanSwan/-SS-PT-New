'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ai_interaction_logs', {
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
      provider: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      model: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      requestType: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      payloadHash: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      outputHash: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
      },
      errorCode: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      durationMs: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('ai_interaction_logs', ['userId']);
    await queryInterface.addIndex('ai_interaction_logs', ['requestType']);
    await queryInterface.addIndex('ai_interaction_logs', ['status']);
    await queryInterface.addIndex('ai_interaction_logs', ['createdAt']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ai_interaction_logs');
  },
};
