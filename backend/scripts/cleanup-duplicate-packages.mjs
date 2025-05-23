/**
 * Comprehensive Package Cleanup Script
 * Smart cleanup of packages - preserves IDs 1-8 if they exist
 * and removes any other packages
 */

import StorefrontItem from '../models/StorefrontItem.mjs';
import logger from '../utils/logger.mjs';
import '../models/index.mjs'; // Ensure all models are loaded
import { Sequelize } from 'sequelize';

async function cleanupAllPackages() {
  try {
    console.log('🧹 Starting smart package cleanup...\n');
    
    // Get current package count
    const beforeCount = await StorefrontItem.count();
    console.log(`📦 Current packages in database: ${beforeCount}`);
    
    if (beforeCount === 0) {
      console.log('✅ No packages found. Database is already clean.');
      return;
    }
    
    // Get all existing packages
    const existingPackages = await StorefrontItem.findAll({
      attributes: ['id', 'name', 'packageType', 'pricePerSession'],
      order: [['id', 'ASC']]
    });
    
    // Split packages into core (IDs 1-8) and extras
    const corePackages = existingPackages.filter(pkg => pkg.id >= 1 && pkg.id <= 8);
    const extraPackages = existingPackages.filter(pkg => pkg.id < 1 || pkg.id > 8);
    
    console.log(`\n📊 Package analysis:`);
    console.log(`- Core packages (IDs 1-8): ${corePackages.length} found`);
    console.log(`- Extra packages to remove: ${extraPackages.length} found`);
    
    if (corePackages.length > 0) {
      console.log('\n📋 Core packages (will be preserved but updated later):');
      corePackages.forEach(pkg => {
        console.log(`- [ID: ${pkg.id}] ${pkg.name} (${pkg.packageType}) - ${pkg.pricePerSession}/session`);
      });
    }
    
    if (extraPackages.length > 0) {
      console.log('\n📋 Extra packages to be removed:');
      extraPackages.forEach(pkg => {
        console.log(`- [ID: ${pkg.id}] ${pkg.name} (${pkg.packageType}) - ${pkg.pricePerSession}/session`);
      });
      
      // Remove extra packages
      console.log('\n🗑️  Removing extra packages...');
      const deletedCount = await StorefrontItem.destroy({
        where: {
          id: { [Sequelize.Op.notBetween]: [1, 8] }
        }
      });
      console.log(`✅ Successfully removed ${deletedCount} extra packages`);
    } else {
      console.log('\n✅ No extra packages to remove');
    }
    
    // Check if we need to create missing core packages
    const missingIds = [];
    for (let i = 1; i <= 8; i++) {
      if (!corePackages.some(pkg => pkg.id === i)) {
        missingIds.push(i);
      }
    }
    
    if (missingIds.length > 0) {
      console.log(`\n⚠️ Missing core packages with IDs: ${missingIds.join(', ')}`);
      console.log('These will be created by the seeder.');
    } else if (corePackages.length === 8) {
      console.log('\n✅ All 8 core packages exist (IDs 1-8) and will be updated');
    }
    
    // Reset ID sequence if needed
    if (extraPackages.length > 0 || missingIds.length > 0) {
      // Get max ID
      const maxId = Math.max(...existingPackages.map(pkg => pkg.id));
      if (maxId > 8) {
        console.log(`\n🔄 Resetting ID sequence to start after 8 (current max: ${maxId})`);
        // Need to use raw query for this
        const sequelize = StorefrontItem.sequelize;
        await sequelize.query(`ALTER SEQUENCE storefront_items_id_seq RESTART WITH 9;`);
        console.log('✅ ID sequence reset successfully');
      }
    }
    
  } catch (error) {
    console.error('❌ Error during package cleanup:', error);
    logger.error('Package cleanup failed:', error);
    throw error;
  }
}

// Allow script to be run directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  cleanupAllPackages()
    .then(() => {
      console.log('\n✅ Cleanup script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Cleanup script failed:', error);
      process.exit(1);
    });
}

export default cleanupAllPackages;