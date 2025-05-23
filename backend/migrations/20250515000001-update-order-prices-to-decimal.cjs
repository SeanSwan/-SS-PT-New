'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('Updating Order and OrderItem price fields from FLOAT to DECIMAL...');

      // Update totalAmount in orders table
      await queryInterface.changeColumn('orders', 'totalAmount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      }, { transaction });

      // Update price and subtotal in order_items table
      await queryInterface.changeColumn('order_items', 'price', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      }, { transaction });

      await queryInterface.changeColumn('order_items', 'subtotal', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      }, { transaction });

      await transaction.commit();
      console.log('Successfully updated Order and OrderItem price fields to DECIMAL');
    } catch (error) {
      await transaction.rollback();
      console.error('Error updating Order and OrderItem price fields:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('Reverting Order and OrderItem price fields to FLOAT...');

      // Revert totalAmount in orders table
      await queryInterface.changeColumn('orders', 'totalAmount', {
        type: Sequelize.FLOAT,
        allowNull: false,
      }, { transaction });

      // Revert price and subtotal in order_items table
      await queryInterface.changeColumn('order_items', 'price', {
        type: Sequelize.FLOAT,
        allowNull: false,
      }, { transaction });

      await queryInterface.changeColumn('order_items', 'subtotal', {
        type: Sequelize.FLOAT,
        allowNull: false,
      }, { transaction });

      await transaction.commit();
      console.log('Successfully reverted Order and OrderItem price fields to FLOAT');
    } catch (error) {
      await transaction.rollback();
      console.error('Error reverting Order and OrderItem price fields:', error);
      throw error;
    }
  }
};