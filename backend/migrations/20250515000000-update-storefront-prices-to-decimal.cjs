'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('Updating price fields from FLOAT to DECIMAL...');

      // Update price column
      await queryInterface.changeColumn('storefront_items', 'price', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      }, { transaction });

      // Update totalCost column
      await queryInterface.changeColumn('storefront_items', 'totalCost', {
        type: Sequelize.DECIMAL(10, 2), 
        allowNull: true,
      }, { transaction });

      // Update pricePerSession column
      await queryInterface.changeColumn('storefront_items', 'pricePerSession', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      }, { transaction });

      await transaction.commit();
      console.log('Successfully updated price fields to DECIMAL');
    } catch (error) {
      await transaction.rollback();
      console.error('Error updating price fields:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('Reverting price fields to FLOAT...');

      // Revert price column
      await queryInterface.changeColumn('storefront_items', 'price', {
        type: Sequelize.FLOAT,
        allowNull: true,
      }, { transaction });

      // Revert totalCost column
      await queryInterface.changeColumn('storefront_items', 'totalCost', {
        type: Sequelize.FLOAT,
        allowNull: true,
      }, { transaction });

      // Revert pricePerSession column
      await queryInterface.changeColumn('storefront_items', 'pricePerSession', {
        type: Sequelize.FLOAT,
        allowNull: false,
      }, { transaction });

      await transaction.commit();
      console.log('Successfully reverted price fields to FLOAT');
    } catch (error) {
      await transaction.rollback();
      console.error('Error reverting price fields:', error);
      throw error;
    }
  }
};