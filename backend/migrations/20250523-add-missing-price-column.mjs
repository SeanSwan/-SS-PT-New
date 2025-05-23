/**
 * Migration: Add missing price column to storefront_items table
 * 
 * This migration adds the price column that exists in the model
 * but is missing from the production database table.
 */

import { DataTypes } from 'sequelize';

export const up = async (queryInterface, Sequelize) => {
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
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Price field to match StorefrontItem model'
    });
    
    // Update existing records to set price = totalCost where price is null
    await queryInterface.sequelize.query(`
      UPDATE storefront_items 
      SET price = total_cost 
      WHERE price IS NULL AND total_cost IS NOT NULL
    `);
    
    console.log('✅ Successfully added price column to storefront_items table');
    
  } catch (error) {
    console.error('❌ Error adding price column:', error.message);
    throw error;
  }
};

export const down = async (queryInterface, Sequelize) => {
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
};
