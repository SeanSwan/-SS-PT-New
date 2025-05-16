import sequelize from './database.mjs';
import runDisplayOrderMigration from './run-display-order-migration.mjs';
import { seedStorefrontItems } from './seeders/20250516-storefront-items.mjs';
import logger from './utils/logger.mjs';

async function runStorefrontFix() {
  try {
    logger.info('Starting StoreFront fix process...');
    
    // 1. Run the custom migration to add displayOrder column
    logger.info('Step 1: Running migration to add displayOrder column...');
    await runDisplayOrderMigration();
    logger.info('Migration completed successfully');
    
    // 2. Ensure database connection
    logger.info('Step 2: Testing database connection...');
    await sequelize.authenticate();
    logger.info('Database connection established');
    
    // 3. Run the seeder
    logger.info('Step 3: Seeding storefront items...');
    await seedStorefrontItems();
    logger.info('Storefront items seeded successfully');
    
    // 4. Test API endpoint
    logger.info('Step 4: Testing API endpoint...');
    const axios = (await import('axios')).default;
    
    try {
      const response = await axios.get('http://localhost:5000/api/storefront');
      logger.info('API Response Status:', response.status);
      logger.info('API Response Data:', JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.items) {
        logger.info(`✅ Total items: ${response.data.items.length}`);
        
        // Check package types
        const fixed = response.data.items.filter(item => item.packageType === 'fixed');
        const monthly = response.data.items.filter(item => item.packageType === 'monthly');
        
        logger.info(`✅ Fixed packages: ${fixed.length}`);
        logger.info(`✅ Monthly packages: ${monthly.length}`);
        
        // Log each item
        response.data.items.forEach((item, index) => {
          logger.info(`Item ${index + 1}:`, {
            id: item.id,
            name: item.name,
            packageType: item.packageType,
            displayPrice: item.displayPrice || item.price,
            displayOrder: item.displayOrder
          });
        });
      }
      
      logger.info('✅ StoreFront fix completed successfully!');
    } catch (apiError) {
      logger.error('❌ API test failed:', apiError.message);
      logger.info('The seeding was successful, but the API endpoint test failed.');
      logger.info('This might be because the server is not running on port 5000.');
    }
    
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ StoreFront fix failed:', error);
    process.exit(1);
  }
}

// Run the fix
runStorefrontFix();