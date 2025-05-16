import sequelize from './database.mjs';
import logger from './utils/logger.mjs';

async function runDisplayOrderMigration() {
  try {
    logger.info('Running displayOrder migration manually...');
    
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'storefront_items' 
      AND column_name = 'displayOrder';
    `);
    
    if (results.length === 0) {
      logger.info('Adding displayOrder column...');
      await sequelize.query(`
        ALTER TABLE storefront_items 
        ADD COLUMN "displayOrder" INTEGER DEFAULT 0;
      `);
      
      logger.info('Creating index on displayOrder...');
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS "storefront_items_display_order_idx" 
        ON storefront_items("displayOrder");
      `);
      
      logger.info('DisplayOrder column and index added successfully');
    } else {
      logger.info('DisplayOrder column already exists');
    }
    
  } catch (error) {
    logger.error('Error running displayOrder migration:', error);
    throw error;
  }
}

export default runDisplayOrderMigration;