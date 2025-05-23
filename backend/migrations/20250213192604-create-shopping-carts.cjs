'use strict';

/**
 * Migration: Create ShoppingCarts Table
 * 
 * This table stores active shopping carts for users. It includes:
 * - status: either 'active' (open cart) or 'completed' (after checkout).
 * - userId: a foreign key linking the cart to a user.
 *
 * Best practices:
 * - Use ENUM for the status field.
 * - Consider adding foreign key constraints if needed.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('shopping_carts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      status: {
        type: Sequelize.ENUM('active', 'completed'),
        allowNull: false,
        defaultValue: 'active',
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // Uncomment the following to enforce referential integrity:
        // references: { model: 'users', key: 'id' },
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
    await queryInterface.dropTable('shopping_carts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_shopping_carts_status";');
  }
};