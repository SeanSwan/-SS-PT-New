'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('notification_settings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      notificationType: {
        type: Sequelize.ENUM('ADMIN', 'ORIENTATION', 'ORDER', 'SYSTEM', 'ALL'),
        allowNull: false,
        defaultValue: 'ALL'
      },
      isPrimary: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add index for faster lookups
    await queryInterface.addIndex('notification_settings', ['isActive', 'notificationType']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('notification_settings');
  }
};
