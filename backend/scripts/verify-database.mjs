// backend/scripts/verify-database.mjs
import sequelize from '../database.mjs';
import User from '../models/User.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';
import logger from '../utils/logger.mjs';

async function verifyDatabase() {
  try {
    logger.info('----- Database Verification Script -----');
    
    // 1. Test database connection
    logger.info('1. Testing database connection...');
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully.');
    
    // 2. Check if tables exist
    logger.info('2. Checking if tables exist...');
    const [tables] = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    const tableNames = tables.map(t => t.table_name);
    
    logger.info(`Found ${tableNames.length} tables: ${tableNames.join(', ')}`);
    
    const requiredTables = [
      'users', 
      'storefront_items',
      'shopping_carts',
      'cart_items'
    ];
    
    for (const table of requiredTables) {
      if (tableNames.includes(table)) {
        logger.info(`✅ Table '${table}' exists.`);
      } else {
        logger.error(`❌ Table '${table}' MISSING!`);
      }
    }
    
    // 3. Check for admin user
    logger.info('3. Checking for admin user...');
    const adminUser = await User.findOne({ where: { username: 'admin' } });
    
    if (adminUser) {
      logger.info(`✅ Admin user exists! ID: ${adminUser.id}`);
      logger.info(`   Name: ${adminUser.firstName} ${adminUser.lastName}`);
      logger.info(`   Role: ${adminUser.role}`);
    } else {
      logger.error('❌ Admin user NOT found!');
    }
    
    // 4. Check for storefront items
    logger.info('4. Checking for storefront items...');
    const storefrontItems = await StorefrontItem.findAll();
    
    if (storefrontItems.length > 0) {
      logger.info(`✅ Found ${storefrontItems.length} storefront items!`);
      // Log the first 3 items with key details
      storefrontItems.slice(0, 3).forEach(item => {
        logger.info(`   ID: ${item.id}, Name: ${item.name}, Price: $${item.price}, Type: ${item.packageType}`);
      });
    } else {
      logger.error('❌ No storefront items found!');
    }
    
    // 5. Check data type consistency
    logger.info('5. Checking data type consistency...');
    const [priceColumn] = await sequelize.query(
      "SELECT data_type FROM information_schema.columns WHERE table_name = 'storefront_items' AND column_name = 'price'"
    );
    
    if (priceColumn.length > 0) {
      const dataType = priceColumn[0].data_type;
      if (dataType === 'double precision' || dataType === 'real') {
        logger.info(`✅ Price column data type is ${dataType} (maps to FLOAT in Sequelize)`);
      } else {
        logger.warn(`⚠️ Price column data type is ${dataType}, which doesn't match FLOAT in Sequelize!`);
      }
    } else {
      logger.error('❌ Could not determine price column data type!');
    }
    
    logger.info('----- Database Verification Complete -----');
  } catch (error) {
    logger.error('Database verification failed:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

verifyDatabase();
