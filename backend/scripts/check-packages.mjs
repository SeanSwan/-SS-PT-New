/**
 * Quick Package Check Script
 * =========================
 * Simple script to check what packages exist in the database
 */

import StorefrontItem from '../models/StorefrontItem.mjs';
import logger from '../utils/logger.mjs';

async function checkPackages() {
  try {
    logger.info('🔍 Checking existing packages in database...');
    
    const packages = await StorefrontItem.findAll({
      order: [['displayOrder', 'ASC'], ['id', 'ASC']]
    });
    
    logger.info(`📦 Found ${packages.length} packages:`);
    
    if (packages.length === 0) {
      logger.warn('❌ No packages found in database!');
      logger.info('💡 Run "npm run seed-correct-packages" to create packages');
      return false;
    }
    
    packages.forEach((pkg, index) => {
      const sessionsText = pkg.packageType === 'fixed' 
        ? `${pkg.sessions} sessions` 
        : `${pkg.totalSessions || pkg.sessions} sessions (${pkg.months} months)`;
      
      logger.info(`${index + 1}. ${pkg.name}:`);
      logger.info(`   Type: ${pkg.packageType}`);
      logger.info(`   Sessions: ${sessionsText}`);
      logger.info(`   Price per session: $${pkg.pricePerSession}`);
      logger.info(`   Total cost: $${pkg.totalCost}`);
      logger.info(`   Price field: $${pkg.price}`);
      logger.info('');
    });
    
    return true;
    
  } catch (error) {
    logger.error('💥 Error checking packages:', error);
    return false;
  }
}

// Run the check
checkPackages()
  .then((success) => {
    if (success) {
      logger.info('✅ Package check completed');
    } else {
      logger.error('❌ Package check failed');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    logger.error('💥 Error:', error);
    process.exit(1);
  });
