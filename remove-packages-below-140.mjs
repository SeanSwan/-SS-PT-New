#!/usr/bin/env node
/**
 * Remove packages with price per session below $140
 */

import StorefrontItem from './backend/models/StorefrontItem.mjs';
import sequelize from './backend/database.mjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function removePackagesBelow140() {
  try {
    console.log('🗑️ Removing packages with price per session below $140...\n');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('📦 Database connection established');

    // Find all packages with price per session below $140
    const packagesBelow140 = await StorefrontItem.findAll({
      where: {
        pricePerSession: {
          [sequelize.Sequelize.Op.lt]: 140
        }
      }
    });

    if (packagesBelow140.length === 0) {
      console.log('✅ No packages with price per session below $140 found.');
      console.log('   All packages meet the minimum $140/session requirement.\n');
      
      // Show all current packages for verification
      const allPackages = await StorefrontItem.findAll({
        order: [['pricePerSession', 'ASC']]
      });
      
      console.log('📋 Current packages:');
      allPackages.forEach((pkg, index) => {
        console.log(`${index + 1}. ${pkg.name} - $${pkg.pricePerSession}/session (${pkg.packageType})`);
      });
      
      return;
    }

    console.log(`❌ Found ${packagesBelow140.length} packages to remove:\n`);

    // Show packages that will be removed
    packagesBelow140.forEach((pkg, index) => {
      console.log(`${index + 1}. ${pkg.name}`);
      console.log(`   - ID: ${pkg.id}`);
      console.log(`   - Price per session: $${pkg.pricePerSession}`);
      console.log(`   - Package type: ${pkg.packageType}`);
      console.log('');
    });

    // Ask for confirmation in production (skip for automated scripts)
    const confirmed = process.env.AUTO_CONFIRM === 'true' || process.argv.includes('--confirm');
    
    if (!confirmed) {
      console.log('⚠️ To proceed with deletion, run the script with --confirm flag:');
      console.log('   node remove-packages-below-140.mjs --confirm');
      console.log('   Or set AUTO_CONFIRM=true in environment');
      return;
    }

    // Remove packages
    console.log('🗑️ Removing packages...\n');
    
    for (const pkg of packagesBelow140) {
      try {
        await pkg.destroy();
        console.log(`✅ Removed: ${pkg.name} (ID: ${pkg.id})`);
      } catch (error) {
        console.error(`❌ Error removing ${pkg.name} (ID: ${pkg.id}):`, error.message);
      }
    }

    console.log(`\n✅ Successfully removed ${packagesBelow140.length} packages below $140/session`);

    // Show remaining packages
    const remainingPackages = await StorefrontItem.findAll({
      order: [['pricePerSession', 'ASC']]
    });

    console.log(`\n📋 Remaining packages (${remainingPackages.length} total):`);
    remainingPackages.forEach((pkg, index) => {
      console.log(`${index + 1}. ${pkg.name} - $${pkg.pricePerSession}/session (${pkg.packageType})`);
    });

  } catch (error) {
    console.error('❌ Error removing packages:', error);
  } finally {
    await sequelize.close();
  }
}

// If this script is run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  removePackagesBelow140()
    .then(() => {
      console.log('\n🏁 Process completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Process failed:', error);
      process.exit(1);
    });
}

export default removePackagesBelow140;