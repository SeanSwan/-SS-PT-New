'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('Adding displayOrder column to storefront_items...');

      // Check if displayOrder column already exists
      const columns = await queryInterface.describeTable('storefront_items', { transaction });
      
      if (!columns.displayOrder) {
        await queryInterface.addColumn('storefront_items', 'displayOrder', {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0,
        }, { transaction });
        
        // Add an index for better performance when sorting
        await queryInterface.addIndex('storefront_items', ['displayOrder'], { transaction });
        
        console.log('DisplayOrder column and index added successfully');
      } else {
        console.log('DisplayOrder column already exists');
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('Error adding displayOrder column:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('Removing displayOrder column from storefront_items...');
      
      // Remove the index first
      await queryInterface.removeIndex('storefront_items', ['displayOrder'], { transaction });
      
      // Remove the column
      await queryInterface.removeColumn('storefront_items', 'displayOrder', { transaction });
      
      await transaction.commit();
      console.log('DisplayOrder column and index removed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Error removing displayOrder column:', error);
      throw error;
    }
  }
};