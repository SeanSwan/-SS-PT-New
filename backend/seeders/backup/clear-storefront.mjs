/**
 * CLEAR ALL STOREFRONT PACKAGES
 * Use this to completely clear the storefront before seeding
 */

import StorefrontItem from '../models/StorefrontItem.mjs';
import logger from '../utils/logger.mjs';

async function clearStorefront() {
  try {
    console.log('🧹 Clearing all storefront packages...');
    
    // Get current count
    const beforeCount = await StorefrontItem.count();
    console.log(`Found ${beforeCount} packages to remove`);
    
    // Clear all packages using multiple methods to ensure complete deletion
    try {
      // Method 1: Sequelize destroy
      const deletedCount = await StorefrontItem.destroy({
        where: {},
        force: true,
        cascade: true
      });
      console.log(`Deleted ${deletedCount} packages with Sequelize`);
    } catch (error) {
      console.log('Sequelize delete failed, trying raw SQL...');
    }
    
    // Method 2: Raw SQL delete
    try {
      await StorefrontItem.sequelize.query('DELETE FROM storefront_items WHERE 1=1;');
      await StorefrontItem.sequelize.query('ALTER SEQUENCE storefront_items_id_seq RESTART WITH 1;');
      console.log('✅ Raw SQL delete completed');
    } catch (error) {
      console.log('Raw SQL delete failed, trying truncate...');
    }
    
    // Method 3: Truncate table
    try {
      await StorefrontItem.sequelize.query('TRUNCATE TABLE storefront_items RESTART IDENTITY CASCADE;');
      console.log('✅ Table truncated');
    } catch (error) {
      console.log('Truncate failed:', error.message);
    }
    
    // Verify deletion
    const afterCount = await StorefrontItem.count();
    console.log(`Packages remaining: ${afterCount}`);
    
    if (afterCount === 0) {
      console.log('✅ StoreFront completely cleared!');
      logger.info('StoreFront packages cleared successfully');
    } else {
      console.log(`⚠️ ${afterCount} packages still remain`);
    }
    
    return afterCount === 0;
    
  } catch (error) {
    console.error('❌ Error clearing storefront:', error);
    logger.error('Clear storefront failed:', error);
    throw error;
  }
}

export default clearStorefront;

// Allow script to be run directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  import('../models/index.mjs').then(() => {
    return clearStorefront();
  })
    .then((success) => {
      if (success) {
        console.log('✅ Clear completed successfully');
        process.exit(0);
      } else {
        console.log('❌ Clear incomplete');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Clear failed:', error);
      process.exit(1);
    });
}
