/**
 * Quick Fix: Add missing price column to production database
 * 
 * This script can be run manually to fix the storefront_items table
 * without waiting for a full redeployment.
 */

import sequelize from '../database.mjs';
import { DataTypes } from 'sequelize';

async function fixStorefrontTable() {
  console.log('🔧 Fixing storefront_items table schema...');
  
  try {
    // Check if price column exists
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'storefront_items' 
      AND column_name = 'price'
    `);
    
    if (results.length > 0) {
      console.log('✅ Price column already exists!');
      return;
    }
    
    console.log('➕ Adding missing price column...');
    
    // Add the price column
    await sequelize.query(`
      ALTER TABLE storefront_items 
      ADD COLUMN price DECIMAL(10,2)
    `);
    
    // Update existing records
    await sequelize.query(`
      UPDATE storefront_items 
      SET price = total_cost 
      WHERE price IS NULL AND total_cost IS NOT NULL
    `);
    
    console.log('✅ Successfully added price column!');
    console.log('🎉 Storefront table is now ready for seeding!');
    
  } catch (error) {
    console.error('❌ Error fixing table:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('✅ Column already exists - table is ready!');
    } else {
      throw error;
    }
  } finally {
    await sequelize.close();
  }
}

// Run the fix
fixStorefrontTable()
  .then(() => {
    console.log('🎯 Database fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  });
