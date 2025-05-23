/**
 * Storefront Items Seeder - Production Safe
 * =====================================
 * This module provides the SwanStudios luxury package collection with elegant
 * rare element + swan theme branding and exact pricing.
 */

import logger from './utils/logger.mjs';
import seedLuxuryPackagesProduction from './seeders/luxury-swan-packages-production.mjs';

/**
 * Production-safe seeder that creates the SwanStudios luxury package collection
 * Uses the comprehensive seeder with elegant branding and exact pricing
 */
async function seedStorefrontItems() {
  try {
    logger.info('🦢 Starting SwanStudios luxury package collection seeding...');
    
    // Use the production-compatible luxury package seeder with elegant branding
    const result = await seedLuxuryPackagesProduction();
    
    if (result.success) {
      logger.info(`✅ Successfully seeded ${result.packagesCreated} luxury packages`);
      return { 
        seeded: true, 
        count: result.packagesCreated, 
        reason: 'SwanStudios luxury collection created',
        packages: result.packages
      };
    } else {
      logger.warn('⚠️  Luxury package seeding returned unsuccessful result');
      return { seeded: false, count: 0, reason: 'Luxury seeder returned unsuccessful' };
    }
    
  } catch (error) {
    // In production, we don't want seeding errors to crash the server
    logger.error('⚠️  Error during storefront seeding (non-critical):', {
      message: error.message,
      code: error.code,
      name: error.name
    });
    
    // Check if this is a database connection issue
    if (error.message?.includes('connect') || error.code === 'ECONNREFUSED') {
      logger.warn('🔌 Database connection issue during seeding - normal on Render during deployment');
    }
    
    // Don't throw error - allow server to continue starting
    logger.info('🚀 Continuing server startup despite seeding issue');
    logger.info('💡 Packages can be managed via Admin Dashboard or manual seeding');
    
    return { seeded: false, count: 0, reason: 'Error occurred', error: error.message };
  }
}

export default seedStorefrontItems;