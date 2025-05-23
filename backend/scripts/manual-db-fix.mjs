/**
 * Manual Database Fix: Add missing price column
 * 
 * This script manually adds the missing price column to production
 * without relying on Sequelize CLI migrations.
 */

import sequelize from '../database.mjs';

async function addPriceColumn() {
  console.log('🔧 Manually adding price column to storefront_items...');
  
  try {
    // First, check if the column already exists
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'storefront_items' 
      AND table_schema = current_schema()
      AND column_name = 'price'
    `);
    
    if (results.length > 0) {
      console.log('✅ Price column already exists!');
      return true;
    }
    
    console.log('➕ Adding price column...');
    
    // Add the price column
    await sequelize.query(`
      ALTER TABLE storefront_items 
      ADD COLUMN price DECIMAL(10,2)
    `);
    
    console.log('✅ Price column added successfully!');
    
    // Update existing records to copy total_cost to price
    console.log('🔄 Updating existing records...');
    
    const [updateResult] = await sequelize.query(`
      UPDATE storefront_items 
      SET price = total_cost 
      WHERE price IS NULL AND total_cost IS NOT NULL
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount || 0} records`);
    
    // Now try to seed some basic packages
    console.log('🌱 Attempting to seed basic packages...');
    
    await sequelize.query(`
      INSERT INTO storefront_items (
        name, 
        description, 
        package_type, 
        sessions, 
        price_per_session, 
        total_cost, 
        price,
        is_active,
        display_order,
        created_at,
        updated_at
      ) VALUES 
      (
        'Single Session', 
        'One-on-one personal training session', 
        'fixed', 
        1, 
        150.00, 
        150.00, 
        150.00,
        true,
        1,
        NOW(),
        NOW()
      ),
      (
        '4-Session Package', 
        'Package of 4 personal training sessions', 
        'fixed', 
        4, 
        140.00, 
        560.00, 
        560.00,
        true,
        2,
        NOW(),
        NOW()
      ),
      (
        '8-Session Package', 
        'Package of 8 personal training sessions with discount', 
        'fixed', 
        8, 
        135.00, 
        1080.00, 
        1080.00,
        true,
        3,
        NOW(),
        NOW()
      )
      ON CONFLICT (name) DO NOTHING
    `);
    
    console.log('✅ Basic packages seeded!');
    console.log('🎉 Database fix completed successfully!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during manual fix:', error.message);
    
    // Check if it's because the column already exists
    if (error.message.includes('already exists') || error.message.includes('duplicate column')) {
      console.log('✅ Column already exists - that\'s fine!');
      return true;
    }
    
    throw error;
  }
}

// Run the fix if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addPriceColumn()
    .then(() => {
      console.log('🎯 Manual database fix completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Manual fix failed:', error);
      process.exit(1);
    })
    .finally(() => {
      sequelize.close();
    });
}

export { addPriceColumn };
