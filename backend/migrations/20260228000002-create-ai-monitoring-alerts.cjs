'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ai_monitoring_alerts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      alertType: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      severity: {
        type: Sequelize.ENUM('info', 'warning', 'critical'),
        allowNull: false,
      },
      feature: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      message: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: '{}',
      },
      status: {
        type: Sequelize.ENUM('active', 'resolved', 'acknowledged'),
        allowNull: false,
        defaultValue: 'active',
      },
      resolvedAt: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('ai_monitoring_alerts', ['status']);
    await queryInterface.addIndex('ai_monitoring_alerts', ['alertType', 'status']);
    await queryInterface.addIndex('ai_monitoring_alerts', ['feature', 'status']);
    await queryInterface.addIndex('ai_monitoring_alerts', ['createdAt']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ai_monitoring_alerts');
  },
};
