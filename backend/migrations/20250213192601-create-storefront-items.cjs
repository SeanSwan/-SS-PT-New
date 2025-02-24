'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create ENUM type for packageType
    await queryInterface.sequelize.query(
      `CREATE TYPE "enum_storefront_items_packageType" AS ENUM ('fixed', 'monthly');`
    );

    await queryInterface.createTable('storefront_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      packageType: {
        type: 'enum_storefront_items_packageType',
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
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('storefront_items');
    await queryInterface.sequelize.query(
      'DROP TYPE "enum_storefront_items_packageType";'
    );
  },
};
