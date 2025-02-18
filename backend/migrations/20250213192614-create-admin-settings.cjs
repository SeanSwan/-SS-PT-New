'use strict';

/**
 * Migration: Create AdminSettings Table
 * 
 * This table stores configuration and settings for admin-specific features.
 * The settings are stored as JSON.
 *
 * Best practices:
 * - Use JSON fields for flexible configuration storage.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('admin_settings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      settings: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('admin_settings');
  }
};
