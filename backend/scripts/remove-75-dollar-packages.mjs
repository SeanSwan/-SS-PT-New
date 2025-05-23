/**
 * Script to remove all packages with $75 per session
 * This includes Gold Transformation Program and all monthly packages
 */

import { StorefrontItem } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

async function remove75DollarPackages() {
  try {
    console.log('🔍 Finding packages with $75 per session...\n');
    
    // Find all packages with $75 per session
    const packagesTo75 = await StorefrontItem.findAll({
      where: { 
        pricePerSession: 75.00 
      },
      order: [['packageType', 'ASC'], ['displayOrder', 'ASC']]
    });
    
    if (packagesTo75.length === 0) {
      console.log('✅ No packages with $75 per session found.');
      return;
    }
    
    console.log(`📦 Found ${packagesTo75.length} packages with $75 per session:`);
    packagesTo75.forEach((pkg, index) => {
      console.log(`   ${index + 1}. ${pkg.name} (${pkg.packageType}) - ID: ${pkg.id}`);
      console.log(`      Price: $${pkg.displayPrice || pkg.price}, Sessions: ${pkg.sessions || pkg.totalSessions}`);
    });
    
    console.log(`\n🗑️ Removing ${packagesTo75.length} packages...`);
    
    // Get IDs to delete
    const idsToDelete = packagesTo75.map(pkg => pkg.id);
    
    // Remove packages
    const deleteResult = await StorefrontItem.destroy({
      where: { 
        pricePerSession: 75.00 
      }
    });
    
    console.log(`✅ Successfully removed ${deleteResult} packages with $75 per session`);
    
    // Verify removal
    const remainingPackages = await StorefrontItem.findAll({
      order: [['packageType', 'ASC'], ['displayOrder', 'ASC']]
    });
    
    console.log(`\n📊 Remaining packages summary:`);
    console.log(`   Total packages remaining: ${remainingPackages.length}`);
    
    const fixed = remainingPackages.filter(pkg => pkg.packageType === 'fixed');
    const monthly = remainingPackages.filter(pkg => pkg.packageType === 'monthly');
    
    console.log(`   Fixed packages: ${fixed.length}`);
    console.log(`   Monthly packages: ${monthly.length}`);
    
    console.log(`\n📋 Remaining packages:`);
    remainingPackages.forEach((pkg, index) => {
      console.log(`   ${index + 1}. ${pkg.name} (${pkg.packageType})`);
      console.log(`      $${pkg.displayPrice || pkg.price} - $${pkg.pricePerSession}/session`);
    });
    
    // Check if any $75 packages remain
    const remaining75 = await StorefrontItem.findAll({
      where: { pricePerSession: 75.00 }
    });
    
    if (remaining75.length === 0) {
      console.log(`\n🎉 Success! All $75 packages have been removed.`);
    } else {
      console.log(`\n⚠️ Warning: ${remaining75.length} packages with $75 still remain.`);
    }
    
  } catch (error) {
    console.error('❌ Error removing $75 packages:', error);
    throw error;
  }
}

// Run if called directly
if (process.argv[1] && import.meta.url.includes(process.argv[1].split('/').pop())) {
  remove75DollarPackages()
    .then(() => {
      console.log('\n✨ $75 package removal completed. Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 $75 package removal failed:', error);
      process.exit(1);
    });
}

export default remove75DollarPackages;