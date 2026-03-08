'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('custom_packages', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      clientId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'clientId',
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      createdByAdminId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'createdByAdminId',
        references: { model: 'users', key: 'id' },
      },
      basePackageType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'SwanStudios Special',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      paidSessions: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      bonusSessions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      totalSessions: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      pricePerSession: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      totalPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      effectiveHourlyRate: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      belowThresholdApproved: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      adminNote: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'active',
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      storefrontItemId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'storefront_items', key: 'id' },
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

    // Index for fast client lookup
    await queryInterface.addIndex('custom_packages', ['clientId', 'status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('custom_packages');
  }
};
