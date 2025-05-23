'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('Updating CartItem price field from FLOAT to DECIMAL...');

      // Update price in cart_items table
      await queryInterface.changeColumn('cart_items', 'price', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      }, { transaction });

      await transaction.commit();
      console.log('Successfully updated CartItem price field to DECIMAL');
    } catch (error) {
      await transaction.rollback();
      console.error('Error updating CartItem price field:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('Reverting CartItem price field to FLOAT...');

      // Revert price in cart_items table
      await queryInterface.changeColumn('cart_items', 'price', {
        type: Sequelize.FLOAT,
        allowNull: false,
      }, { transaction });

      await transaction.commit();
      console.log('Successfully reverted CartItem price field to FLOAT');
    } catch (error) {
      await transaction.rollback();
      console.error('Error reverting CartItem price field:', error);
      throw error;
    }
  }
};