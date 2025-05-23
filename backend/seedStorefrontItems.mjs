/**
 * Storefront Items Seeder - Production Safe
 * =====================================
 * This module provides a lightweight seeder that only creates packages if the database is empty.
 * It's designed to be safe for Render production deployment and won't interfere with existing data.
 */

import logger from './utils/logger.mjs';
import StorefrontItem from './models/StorefrontItem.mjs';

/**
 * Minimal seeder that only runs if the StorefrontItem table is completely empty
 * This ensures we don't conflict with existing packages or create duplicates
 * Safe for production Render deployment
 */
async function seedStorefrontItems() {
  try {
    logger.info('🔍 Checking if storefront seeding is needed...');
    
    // First, check if ANY storefront items exist at all
    const existingCount = await StorefrontItem.count();
    
    if (existingCount > 0) {
      logger.info(`✅ Database already has ${existingCount} storefront items, skipping seed`);
      logger.info('🏪 Storefront packages are managed via hardcoded data or admin interface');
      return { seeded: false, count: existingCount, reason: 'Database not empty' };
    }
    
    // Only seed if database is completely empty
    logger.info('📦 Database is empty, creating minimal default packages...');
    
    // Create only essential packages for initial setup
    // These will be overridden by admin management or hardcoded data
    const defaultPackages = [
      {
        packageType: 'fixed',
        sessions: 1,
        pricePerSession: 175,
        totalCost: 175,
        price: 175,
        name: "Single Session",
        description: "Experience premium training with Sean Swan.",
        theme: 'cosmic',
        isActive: true
      },
      {
        packageType: 'fixed',
        sessions: 8,
        pricePerSession: 170,
        totalCost: 1360,
        price: 1360,
        name: "Starter Package",
        description: "Perfect introduction to premium training.",
        theme: 'emerald',
        isActive: true
      }
    ];

    // Use bulkCreate with ignoreDuplicates for extra safety
    const createdItems = await StorefrontItem.bulkCreate(defaultPackages, {
      ignoreDuplicates: true,
      returning: true
    });

    const actualCount = createdItems.length;
    
    if (actualCount > 0) {
      logger.info(`✅ Seeded ${actualCount} default storefront items for initial setup`);
      logger.info('ℹ️  These can be managed via Admin Dashboard or replaced by hardcoded data');
      return { seeded: true, count: actualCount, reason: 'Initial setup' };
    } else {
      logger.info('ℹ️  No items were created (likely due to race condition or existing data)');
      return { seeded: false, count: 0, reason: 'No items created' };
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
      logger.warn('🔌 Database connection issue during seeding - this is normal on Render during deployment');
    }
    
    // Don't throw error - allow server to continue starting
    logger.info('🚀 Continuing server startup despite seeding issue');
    logger.info('💡 Packages can be managed via Admin Dashboard or are available via hardcoded data');
    
    return { seeded: false, count: 0, reason: 'Error occurred', error: error.message };
  }
}

export default seedStorefrontItems;