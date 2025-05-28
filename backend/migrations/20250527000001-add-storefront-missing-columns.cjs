'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Add isActive column if it doesn't exist
      await queryInterface.addColumn('storefront_items', 'isActive', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
      
      console.log('✅ Added isActive column to storefront_items');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate column')) {
        console.log('ℹ️  isActive column already exists, skipping...');
      } else {
        throw error;
      }
    }

    try {
      // Add displayOrder column if it doesn't exist  
      await queryInterface.addColumn('storefront_items', 'displayOrder', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      });
      
      console.log('✅ Added displayOrder column to storefront_items');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate column')) {
        console.log('ℹ️  displayOrder column already exists, skipping...');
      } else {
        throw error;
      }
    }

    // Update existing records to be active
    await queryInterface.sequelize.query(
      "UPDATE storefront_items SET \"isActive\" = true WHERE \"isActive\" IS NULL;"
    );
    
    console.log('✅ Updated existing storefront items to active status');
  },

  async down(queryInterface, Sequelize) {
    // Remove the columns if needed
    await queryInterface.removeColumn('storefront_items', 'isActive');
    await queryInterface.removeColumn('storefront_items', 'displayOrder');
    console.log('✅ Removed isActive and displayOrder columns from storefront_items');
  }
};
