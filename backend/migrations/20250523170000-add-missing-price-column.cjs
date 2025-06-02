/**
 * Migration: Add missing price column to storefront_items table
 * 
 * This migration adds the price column that exists in the model
 * but is missing from the production database table.
 */

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Adding missing price column to storefront_items table...');
    
    try {
      // Check if price column already exists
      const tableDescription = await queryInterface.describeTable('storefront_items');
      
      if (tableDescription.price) {
        console.log('✅ Price column already exists, skipping addition');
        return;
      }
      
      // Add the missing price column
      await queryInterface.addColumn('storefront_items', 'price', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Price field to match StorefrontItem model'
      });
      
      // Check if totalCost column exists before updating
      if (tableDescription.totalCost) {
        // Update existing records to set price = totalCost where price is null
        await queryInterface.sequelize.query(`
          UPDATE storefront_items 
          SET price = "totalCost" 
          WHERE price IS NULL AND "totalCost" IS NOT NULL
        `);
        console.log('✅ Updated existing records: price = totalCost where applicable');
      } else {
        console.log('⚠️ totalCost column not found, skipping data migration');
      }
      
      console.log('✅ Successfully added price column to storefront_items table');
      
    } catch (error) {
      console.error('❌ Error adding price column:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔧 Removing price column from storefront_items table...');
    
    try {
      // Check if price column exists before trying to remove it
      const tableDescription = await queryInterface.describeTable('storefront_items');
      
      if (!tableDescription.price) {
        console.log('✅ Price column does not exist, skipping removal');
        return;
      }
      
      // Remove the price column
      await queryInterface.removeColumn('storefront_items', 'price');
      
      console.log('✅ Successfully removed price column from storefront_items table');
      
    } catch (error) {
      console.error('❌ Error removing price column:', error.message);
      throw error;
    }
  }
};
