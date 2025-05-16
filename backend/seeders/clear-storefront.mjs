import StorefrontItem from '../models/StorefrontItem.mjs';
import logger from '../utils/logger.mjs';

/**
 * Empty Storefront Seeder
 * Clears all packages from the StoreFront
 * Use this when you want a completely empty StoreFront
 */

export async function clearStorefrontItems() {
  try {
    logger.info('Clearing all storefront items...');

    // Get current count
    const currentCount = await StorefrontItem.count();
    logger.info(`Current packages: ${currentCount}`);

    // Clear all existing data
    const deleteResult = await StorefrontItem.destroy({ where: {} });
    logger.info(`Removed ${deleteResult} storefront items`);

    // Verify empty
    const finalCount = await StorefrontItem.count();
    logger.info(`Final packages: ${finalCount}`);
    
    if (finalCount === 0) {
      logger.info('✅ StoreFront is now completely empty');
    } else {
      logger.warn(`⚠️ Warning: ${finalCount} packages still remain`);
    }

    console.log('\n🎯 StoreFront Status:');
    console.log('   • Fixed packages: 0');
    console.log('   • Monthly packages: 0');
    console.log('   • Total packages: 0');
    console.log('\n📝 The StoreFront will display:');
    console.log('   • Empty state message');
    console.log('   • "Contact Us for Custom Training" button');
    console.log('   • Consultation booking option');

    return { removed: deleteResult, remaining: finalCount };
  } catch (error) {
    logger.error('Error clearing storefront items:', error);
    throw error;
  }
}

// Self-executing function if run directly
if (process.argv[1] && import.meta.url.includes(process.argv[1].split('/').pop())) {
  import('../models/index.mjs').then(() => {
    return clearStorefrontItems();
  })
    .then((result) => {
      console.log(`\n✨ StoreFront cleared successfully!`);
      console.log(`   Removed: ${result.removed} packages`);
      console.log(`   Remaining: ${result.remaining} packages`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Clearing failed:', error);
      process.exit(1);
    });
}

export default clearStorefrontItems;