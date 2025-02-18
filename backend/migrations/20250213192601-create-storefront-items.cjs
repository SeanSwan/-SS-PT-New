'use strict';

/**
 * Migration: Create StorefrontItems Table
 *
 * This table holds packages offered in the storefront.
 * It supports two types:
 *  - 'fixed': One-time purchase packages.
 *  - 'monthly': Recurring packages with details like months and sessions per week.
 *
 * This migration uses CommonJS syntax, so it works even with "type": "module" in package.json.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('storefront_items', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      packageType: {
        type: Sequelize.ENUM('fixed', 'monthly'),
        allowNull: false,
        defaultValue: 'fixed',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      sessions: {
        // For fixed packages only.
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      pricePerSession: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      months: {
        // For monthly packages only.
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      sessionsPerWeek: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      totalSessions: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      totalCost: {
        type: Sequelize.FLOAT,
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
    await queryInterface.dropTable('storefront_items');
    // Clean up the ENUM type if necessary.
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_storefront_items_packageType";');
  }
};
