import sequelize from './database.mjs';
import StorefrontItem from './models/StorefrontItem.mjs';
import logger from './utils/logger.mjs';

async function cleanupDuplicatePackages() {
  try {
    logger.info('Cleaning up duplicate storefront packages...');
    
    // Get all items
    const allItems = await StorefrontItem.findAll({
      order: [['id', 'ASC']]
    });
    
    logger.info(`Found ${allItems.length} total items`);
    
    // Log what we have
    allItems.forEach(item => {
      logger.info(`ID: ${item.id}, Name: ${item.name}, DisplayOrder: ${item.displayOrder}`);
    });
    
    // Delete items with IDs 1-14 (keep the newer ones 15-22 which have proper displayOrder)
    const deleteResult = await StorefrontItem.destroy({
      where: {
        id: {
          [sequelize.Op.lte]: 14
        }
      }
    });
    
    logger.info(`Deleted ${deleteResult} old duplicate items`);
    
    // Verify remaining items
    const remainingItems = await StorefrontItem.findAll({
      order: [['displayOrder', 'ASC']]
    });
    
    logger.info(`Remaining items: ${remainingItems.length}`);
    remainingItems.forEach(item => {
      logger.info(`✅ ${item.name} - DisplayOrder: ${item.displayOrder}`);
    });
    
    logger.info('Cleanup completed successfully!');
    
  } catch (error) {
    logger.error('Error cleaning up packages:', error);
    throw error;
  }
}

cleanupDuplicatePackages().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});