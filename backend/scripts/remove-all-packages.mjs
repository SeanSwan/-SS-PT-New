/**
 * Script to remove the remaining three packages:
 * - Single Session Assessment ($150/session)
 * - Bronze Performance Package ($125/session)  
 * - Silver Elite Training ($100/session)
 */

import { StorefrontItem } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

async function removeRemainingPackages() {
  try {
    console.log('🔍 Finding remaining packages to remove...\n');
    
    // Find the specific packages to remove by name and price
    const packagesToRemove = [
      'Single Session Assessment',
      'Bronze Performance Package', 
      'Silver Elite Training'
    ];
    
    // Find all these packages
    const foundPackages = await StorefrontItem.findAll({
      where: { 
        name: packagesToRemove 
      },
      order: [['displayOrder', 'ASC']]
    });
    
    if (foundPackages.length === 0) {
      console.log('✅ No packages found to remove. StoreFront is already empty.');
      return;
    }
    
    console.log(`📦 Found ${foundPackages.length} packages to remove:`);
    foundPackages.forEach((pkg, index) => {
      console.log(`   ${index + 1}. ${pkg.name}`);
      console.log(`      Price: $${pkg.displayPrice || pkg.price} ($${pkg.pricePerSession}/session)`);
      console.log(`      ID: ${pkg.id}, Sessions: ${pkg.sessions}`);
    });
    
    console.log(`\n🗑️ Removing all ${foundPackages.length} packages...`);
    
    // Remove all packages
    const deleteResult = await StorefrontItem.destroy({
      where: { 
        name: packagesToRemove 
      }
    });
    
    console.log(`✅ Successfully removed ${deleteResult} packages`);
    
    // Verify complete removal
    const remainingPackages = await StorefrontItem.findAll();
    
    console.log(`\n📊 Final status:`);
    console.log(`   Packages removed: ${deleteResult}`);
    console.log(`   Packages remaining: ${remainingPackages.length}`);
    
    if (remainingPackages.length === 0) {
      console.log(`\n🎉 Success! StoreFront is now completely empty.`);
      console.log(`   - No fixed packages`);
      console.log(`   - No monthly packages`);
      console.log(`   - Total packages: 0`);
    } else {
      console.log(`\n⚠️ Warning: ${remainingPackages.length} package(s) still remain:`);
      remainingPackages.forEach((pkg, index) => {
        console.log(`   ${index + 1}. ${pkg.name} - $${pkg.displayPrice || pkg.price}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error removing packages:', error);
    throw error;
  }
}

// Run if called directly
if (process.argv[1] && import.meta.url.includes(process.argv[1].split('/').pop())) {
  removeRemainingPackages()
    .then(() => {
      console.log('\n✨ Package removal completed. StoreFront is now empty.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Package removal failed:', error);
      process.exit(1);
    });
}

export default removeRemainingPackages;