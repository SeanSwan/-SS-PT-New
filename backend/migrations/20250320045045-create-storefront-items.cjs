'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('storefront_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
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
      // Add the price field that was missing
      price: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      sessions: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      pricePerSession: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      months: {
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
      imageUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      theme: {
        type: Sequelize.ENUM('cosmic', 'purple', 'ruby', 'emerald'),
        allowNull: true,
        defaultValue: 'cosmic',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      }
    });

    // Add any needed indexes
    await queryInterface.addIndex('storefront_items', ['packageType']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('storefront_items');
  }
};