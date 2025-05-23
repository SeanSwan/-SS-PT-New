/**
 * Smart Package Cleanup Script
 * 
 * This script:
 * 1. Identifies the correct 8 packages by ID (1-8)
 * 2. If they exist with those IDs, updates them to the correct values
 * 3. If packages with other IDs exist, removes them
 * 4. If any packages are missing in the ID range 1-8, creates them
 * 
 * This ensures we always have exactly 8 packages with IDs 1-8 and
 * with the correct values, regardless of what was in the database before.
 */

import StorefrontItem from '../models/StorefrontItem.mjs';
import logger from '../utils/logger.mjs';
import '../models/index.mjs'; // Ensure all models are loaded

// Define the exact 8 packages with graduated pricing (without includedFeatures)
const CORRECT_PACKAGES = [
  // === FIXED SESSION PACKAGES ===
  {
    id: 1,
    packageType: 'fixed',
    name: 'Single Session',
    description: 'Try a premium training session with Sean Swan.',
    sessions: 1,
    pricePerSession: 175.00,
    price: 175.00,
    displayPrice: 175.00,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 1,
    totalCost: 175.00,
    imageUrl: '/assets/images/single-session.jpg',
    theme: 'ruby',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 1
  },
  {
    id: 2,
    packageType: 'fixed',
    name: 'Silver Package',
    description: 'Perfect starter package with 8 premium training sessions.',
    sessions: 8,
    pricePerSession: 165.00,
    price: 1320.00,
    displayPrice: 1320.00,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 8,
    totalCost: 1320.00,
    imageUrl: '/assets/images/silver-package.jpg',
    theme: 'emerald',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 2
  },
  {
    id: 3,
    packageType: 'fixed',
    name: 'Gold Package',
    description: 'Comprehensive training with 20 sessions for serious results.',
    sessions: 20,
    pricePerSession: 155.00,
    price: 3100.00,
    displayPrice: 3100.00,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 20,
    totalCost: 3100.00,
    imageUrl: '/assets/images/gold-package.jpg',
    theme: 'cosmic',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 3
  },
  {
    id: 4,
    packageType: 'fixed',
    name: 'Platinum Package',
    description: 'Ultimate transformation with 50 premium sessions.',
    sessions: 50,
    pricePerSession: 150.00,
    price: 7500.00,
    displayPrice: 7500.00,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 50,
    totalCost: 7500.00,
    imageUrl: '/assets/images/platinum-package.jpg',
    theme: 'purple',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 4
  },
  
  // === MONTHLY PACKAGES ===
  {
    id: 5,
    packageType: 'monthly',
    name: '3-Month Excellence',
    description: 'Intensive 3-month program with 4 sessions per week.',
    sessions: null,
    pricePerSession: 145.00,
    price: 6960.00,
    displayPrice: 6960.00,
    months: 3,
    sessionsPerWeek: 4,
    totalSessions: 48,
    totalCost: 6960.00,
    imageUrl: '/assets/images/3-month-package.jpg',
    theme: 'emerald',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 5
  },
  {
    id: 6,
    packageType: 'monthly',
    name: '6-Month Mastery',
    description: 'Build lasting habits with 6 months of consistent training.',
    sessions: null,
    pricePerSession: 142.50,
    price: 13680.00,
    displayPrice: 13680.00,
    months: 6,
    sessionsPerWeek: 4,
    totalSessions: 96,
    totalCost: 13680.00,
    imageUrl: '/assets/images/6-month-package.jpg',
    theme: 'cosmic',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 6
  },
  {
    id: 7,
    packageType: 'monthly',
    name: '9-Month Transformation',
    description: 'Complete lifestyle transformation over 9 months.',
    sessions: null,
    pricePerSession: 141.25,
    price: 20340.00,
    displayPrice: 20340.00,
    months: 9,
    sessionsPerWeek: 4,
    totalSessions: 144,
    totalCost: 20340.00,
    imageUrl: '/assets/images/9-month-package.jpg',
    theme: 'ruby',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 7
  },
  {
    id: 8,
    packageType: 'monthly',
    name: '12-Month Elite Program',
    description: 'The ultimate yearly commitment for maximum results.',
    sessions: null,
    pricePerSession: 140.00,
    price: 26880.00,
    displayPrice: 26880.00,
    months: 12,
    sessionsPerWeek: 4,
    totalSessions: 192,
    totalCost: 26880.00,
    imageUrl: '/assets/images/12-month-package.jpg',
    theme: 'purple',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 8
  }
];

async function smartPackageCleanup() {
  try {
    console.log('🧹 Starting smart package cleanup...\n');
    
    // Get all existing packages
    const existingPackages = await StorefrontItem.findAll();
    console.log(`📦 Current packages in database: ${existingPackages.length}`);
    
    // Identify packages outside our expected ID range (1-8)
    const outsideRangePackages = existingPackages.filter(pkg => pkg.id < 1 || pkg.id > 8);
    
    // Delete packages outside our range
    if (outsideRangePackages.length > 0) {
      console.log(`\n🗑️ Removing ${outsideRangePackages.length} packages outside ID range 1-8...`);
      
      for (const pkg of outsideRangePackages) {
        console.log(`  • Removing: [ID: ${pkg.id}] ${pkg.name}`);
        await pkg.destroy();
      }
    }
    
    // For each of our expected 8 packages
    console.log('\n🔄 Checking/updating packages with IDs 1-8...');
    
    for (const correctPkg of CORRECT_PACKAGES) {
      const existingPkg = existingPackages.find(p => p.id === correctPkg.id);
      
      if (existingPkg) {
        // Package exists with this ID, update it to correct values
        console.log(`  • Updating: [ID: ${correctPkg.id}] ${existingPkg.name} → ${correctPkg.name}`);
        
        // Update all fields
        for (const [key, value] of Object.entries(correctPkg)) {
          if (key !== 'id' && key !== 'createdAt') {
            existingPkg[key] = value;
          }
        }
        
        // Set timestamps
        existingPkg.updatedAt = new Date();
        
        // Save the updated package
        await existingPkg.save();
      } else {
        // Package doesn't exist with this ID, create it
        console.log(`  • Creating: [ID: ${correctPkg.id}] ${correctPkg.name}`);
        
        // Set timestamps
        const pkgToCreate = {
          ...correctPkg,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Create the package
        await StorefrontItem.create(pkgToCreate);
      }
    }
    
    // Verify final state
    const finalPackages = await StorefrontItem.findAll({
      order: [['displayOrder', 'ASC']]
    });
    
    console.log('\n📋 Final package state:');
    finalPackages.forEach((pkg) => {
      console.log(`  • [ID: ${pkg.id}] ${pkg.name} (${pkg.packageType}) - $${pkg.pricePerSession}/session`);
    });
    
    if (finalPackages.length === 8) {
      console.log('\n🎉 SUCCESS: Exactly 8 packages with IDs 1-8 exist in the database!');
      logger.info('Smart package cleanup completed successfully - exactly 8 packages with IDs 1-8 exist');
    } else {
      console.log(`\n⚠️ Warning: Expected 8 packages but found ${finalPackages.length}`);
      logger.warn(`Smart package cleanup incomplete - ${finalPackages.length} packages exist`);
    }
    
    // Check for missing correct packages
    const missingPackages = CORRECT_PACKAGES.filter(
      correctPkg => !finalPackages.some(pkg => pkg.id === correctPkg.id && pkg.name === correctPkg.name)
    );
    
    if (missingPackages.length > 0) {
      console.log(`\n⚠️ Warning: ${missingPackages.length} correct packages are missing or incorrect:`);
      missingPackages.forEach(pkg => {
        console.log(`  • [ID: ${pkg.id}] ${pkg.name}`);
      });
    }
    
    return finalPackages;
    
  } catch (error) {
    console.error('❌ Error during smart package cleanup:', error);
    logger.error('Smart package cleanup failed:', error);
    throw error;
  }
}

// Allow script to be run directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  // Ensure database is initialized
  import('../models/index.mjs').then(() => {
    return smartPackageCleanup();
  })
    .then(() => {
      console.log('\n✅ Smart package cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Smart package cleanup failed:', error);
      process.exit(1);
    });
}

export default smartPackageCleanup;
