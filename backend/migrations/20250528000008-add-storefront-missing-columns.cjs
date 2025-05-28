'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('📸 Adding missing imageUrl column to storefront_items table...');
    
    try {
      // Check if column already exists
      const [columnExists] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'storefront_items' AND column_name = 'imageUrl';
      `);
      
      if (columnExists.length === 0) {
        await queryInterface.addColumn('storefront_items', 'imageUrl', {
          type: Sequelize.STRING,
          allowNull: true,
        });
        console.log('✅ imageUrl column added to storefront_items');
      } else {
        console.log('✅ imageUrl column already exists in storefront_items');
      }
      
      // Also check for includedFeatures column while we're at it
      const [includedFeaturesExists] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'storefront_items' AND column_name = 'includedFeatures';
      `);
      
      if (includedFeaturesExists.length === 0) {
        await queryInterface.addColumn('storefront_items', 'includedFeatures', {
          type: Sequelize.TEXT,
          allowNull: true,
        });
        console.log('✅ includedFeatures column added to storefront_items');
      } else {
        console.log('✅ includedFeatures column already exists in storefront_items');
      }
      
      console.log('🎉 STOREFRONT TABLE UPDATE COMPLETED SUCCESSFULLY!');
      
    } catch (error) {
      console.error('❌ Failed to add columns to storefront_items:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back storefront_items column additions...');
    
    try {
      await queryInterface.removeColumn('storefront_items', 'imageUrl');
      await queryInterface.removeColumn('storefront_items', 'includedFeatures');
      console.log('✅ Rollback completed');
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};
