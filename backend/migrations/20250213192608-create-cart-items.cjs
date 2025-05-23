'use strict';

/**
 * Migration: Create CartItems Table
 * 
 * This table stores individual items within a shopping cart.
 * Each item references:
 * - The cart it belongs to.
 * - The storefront item (product) being purchased.
 * 
 * Best practices:
 * - Add foreign key constraints with ON UPDATE and ON DELETE CASCADE.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('cart_items', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      cartId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'shopping_carts',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      storefrontItemId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'storefront_items',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      price: {
        // Price per unit at the time of adding to cart.
        type: Sequelize.FLOAT,
        allowNull: false,
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
    await queryInterface.dropTable('cart_items');
  }
};