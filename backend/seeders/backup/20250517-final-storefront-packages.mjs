/**
 * AUTHORITATIVE STOREFRONT PACKAGES SEEDER
 * Creates exactly 8 packages as specified:
 * - Fixed: 1, 8, 20, 50 sessions
 * - Monthly: 3, 6, 9, 12 months (4 sessions/week)
 * 
 * This is the SINGLE source of truth for all packages.
 * No other seeders should create storefront packages.
 */

import StorefrontItem from '../models/StorefrontItem.mjs';
import logger from '../utils/logger.mjs';
import cleanupAllPackages from '../scripts/cleanup-duplicate-packages.mjs';
import { Sequelize } from 'sequelize';

// Define the exact 8 packages with graduated pricing (without includedFeatures)
const FINAL_PACKAGES = [
  // === FIXED SESSION PACKAGES ===
  {
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
    packageType: 'fixed',
    name: 'Silver Package',
    description: 'Perfect starter package with 8 premium training sessions.',
    sessions: 8,
    pricePerSession: 170.00,  // $170 per session
    price: 1360.00,           // 8 x $170 = $1,360
    displayPrice: 1360.00,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 8,
    totalCost: 1360.00,
    imageUrl: '/assets/images/silver-package.jpg',
    theme: 'emerald',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 2
  },
  {
    packageType: 'fixed',
    name: 'Gold Package',
    description: 'Comprehensive training with 20 sessions for serious results.',
    sessions: 20,
    pricePerSession: 165.00,  // Updated to $165 per session
    price: 3300.00,           // 20 x $165 = $3,300
    displayPrice: 3300.00,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 20,
    totalCost: 3300.00,
    imageUrl: '/assets/images/gold-package.jpg',
    theme: 'cosmic',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 3
  },
  {
    packageType: 'fixed',
    name: 'Platinum Package',
    description: 'Ultimate transformation with 50 premium sessions.',
    sessions: 50,
    pricePerSession: 160.00,  // Updated to $160 per session
    price: 8000.00,           // 50 x $160 = $8,000
    displayPrice: 8000.00,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 50,
    totalCost: 8000.00,
    imageUrl: '/assets/images/platinum-package.jpg',
    theme: 'purple',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 4
  },
  
  // === MONTHLY PACKAGES ===
  {
    packageType: 'monthly',
    name: '3-Month Excellence',
    description: 'Intensive 3-month program with 4 sessions per week.',
    sessions: null,
    pricePerSession: 155.00,  // Updated to $155 per session
    price: 7440.00,           // 48 sessions x $155 = $7,440
    displayPrice: 7440.00,
    months: 3,
    sessionsPerWeek: 4,
    totalSessions: 48,
    totalCost: 7440.00,
    imageUrl: '/assets/images/3-month-package.jpg',
    theme: 'emerald',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 5
  },
  {
    packageType: 'monthly',
    name: '6-Month Mastery',
    description: 'Build lasting habits with 6 months of consistent training.',
    sessions: null,
    pricePerSession: 150.00,  // Updated to $150 per session
    price: 14400.00,          // 96 sessions x $150 = $14,400
    displayPrice: 14400.00,
    months: 6,
    sessionsPerWeek: 4,
    totalSessions: 96,
    totalCost: 14400.00,
    imageUrl: '/assets/images/6-month-package.jpg',
    theme: 'cosmic',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 6
  },
  {
    packageType: 'monthly',
    name: '9-Month Transformation',
    description: 'Complete lifestyle transformation over 9 months.',
    sessions: null,
    pricePerSession: 145.00,  // Updated to $145 per session
    price: 20880.00,          // 144 sessions x $145 = $20,880
    displayPrice: 20880.00,
    months: 9,
    sessionsPerWeek: 4,
    totalSessions: 144,
    totalCost: 20880.00,
    imageUrl: '/assets/images/9-month-package.jpg',
    theme: 'ruby',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 7
  },
  {
    packageType: 'monthly',
    name: '12-Month Elite Program',
    description: 'The ultimate yearly commitment for maximum results.',
    sessions: null,
    pricePerSession: 140.00,  // $140 per session
    price: 26880.00,          // 192 sessions x $140 = $26,880
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

/**
 * Seed the final 8 packages after cleanup
 */
async function seedFinalPackages() {
  try {
    console.log('🌱 Starting final package seeding...\n');
    
    // Verify we have exactly 8 packages in our definition
    if (FINAL_PACKAGES.length !== 8) {
      throw new Error(`Expected exactly 8 packages, but found ${FINAL_PACKAGES.length}`);
    }
    
    // Verify package types
    const fixedPackages = FINAL_PACKAGES.filter(p => p.packageType === 'fixed');
    const monthlyPackages = FINAL_PACKAGES.filter(p => p.packageType === 'monthly');
    
    if (fixedPackages.length !== 4 || monthlyPackages.length !== 4) {
      throw new Error(`Expected 4 fixed and 4 monthly packages, got ${fixedPackages.length} fixed and ${monthlyPackages.length} monthly`);
    }
    
    // First run smart cleanup to remove duplicates but preserve IDs 1-8
    console.log('🧹 Running smart cleanup before seeding...');
    await cleanupAllPackages();
    console.log('✅ Cleanup completed\n');
    
    // Check if any packages with IDs 1-8 already exist
    const existingPackages = await StorefrontItem.findAll({
      where: {
        id: { [Sequelize.Op.between]: [1, 8] }
      }
    });
    
    // Create maps to track packages by ID for easier operations
    const existingPackageMap = new Map();
    existingPackages.forEach(pkg => existingPackageMap.set(pkg.id, pkg));
    
    // Create an array to track operations we need to perform
    const packagesToCreate = [];
    const packagesToUpdate = [];
    
    // For each of our 8 defined packages, determine if we need to create or update
    FINAL_PACKAGES.forEach((packageDef, index) => {
      const targetId = index + 1; // Target IDs 1-8
      
      if (existingPackageMap.has(targetId)) {
        // Package exists with this ID, we'll update it
        packageDef.id = targetId; // Ensure ID is set for update
        packagesToUpdate.push(packageDef);
      } else {
        // No package with this ID, we'll create it
        packageDef.id = targetId; // Ensure ID is set for creation
        packagesToCreate.push(packageDef);
      }
    });
    
    // Log operations
    console.log(`\n💡 Package operations:`);
    console.log(`- Packages to update: ${packagesToUpdate.length}`);
    console.log(`- Packages to create: ${packagesToCreate.length}`);
    
    // Perform updates if needed
    let updatedItems = [];
    if (packagesToUpdate.length > 0) {
      console.log('\n🔄 Updating existing packages...');
      
      // Since bulkUpdate doesn't work well with custom fields, we'll update each package individually
      for (const packageDef of packagesToUpdate) {
        const existingPackage = existingPackageMap.get(packageDef.id);
        await existingPackage.update(packageDef);
        updatedItems.push(existingPackage);
      }
      
      console.log(`✅ Successfully updated ${updatedItems.length} packages`);
    }
    
    // Create new packages if needed
    let createdItems = [];
    if (packagesToCreate.length > 0) {
      console.log('\n📦 Creating new packages...');
      createdItems = await StorefrontItem.bulkCreate(packagesToCreate, {
        validate: true,
        individualHooks: true, // Ensure hooks run for calculations
        updateOnDuplicate: ['id'] // In case ID already exists, update rather than error
      });
      console.log(`✅ Successfully created ${createdItems.length} packages`);
    }
    
    // Combine all items for verification
    const allItems = [...updatedItems, ...createdItems];
    
    console.log(`\n✅ Successfully processed all 8 packages\n`);
    
    // Verify the results
    console.log('=== VERIFICATION: FINAL 8 PACKAGES ===\n');
    
    console.log('📦 Fixed Session Packages:');
    // Query all packages from the database to ensure we have the latest data
    const allPackages = await StorefrontItem.findAll({
      where: { id: { [Sequelize.Op.between]: [1, 8] } },
      order: [['id', 'ASC']]
    });
    
    const fixedPackagesResult = allPackages.filter(item => item.packageType === 'fixed')
      .sort((a, b) => (a.sessions || 0) - (b.sessions || 0));
    fixedPackagesResult.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}: ${item.sessions} sessions @ ${item.pricePerSession}/session = ${item.price}`);
    });
    
    console.log('\n📅 Monthly Packages:');
    const monthlyPackagesResult = allPackages.filter(item => item.packageType === 'monthly')
      .sort((a, b) => (a.months || 0) - (b.months || 0));
    monthlyPackagesResult.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}: ${item.months} months (${item.totalSessions} sessions) @ ${item.pricePerSession}/session = ${item.price}`);
    });
    
    // Final verification
    const finalCount = await StorefrontItem.count({
      where: { id: { [Sequelize.Op.between]: [1, 8] } }
    });
    console.log(`\n📊 Total core packages in database: ${finalCount}`);
    
    // Check if there are any other packages outside our expected range
    const extraCount = await StorefrontItem.count({
      where: { id: { [Sequelize.Op.notBetween]: [1, 8] } }
    });
    
    if (extraCount > 0) {
      console.log(`⚠️ Warning: Found ${extraCount} additional packages outside the core ID range (1-8)`);
    }
    
    if (finalCount === 8) {
      console.log('🎉 SUCCESS: Exactly 8 core packages created/updated as specified!');
      logger.info('Final package seeding completed successfully - exactly 8 packages with IDs 1-8');
    } else {
      throw new Error(`Expected 8 packages with IDs 1-8 but found ${finalCount} in database`);
    }
    
    return allPackages;
    
  } catch (error) {
    console.error('❌ Error during package seeding:', error);
    logger.error('Final package seeding failed:', error);
    throw error;
  }
}

// Allow script to be run directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  // Ensure database is initialized
  import('../models/index.mjs').then(() => {
    return seedFinalPackages();
  })
    .then(() => {
      console.log('\n✅ Final package seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Final package seeding failed:', error);
      process.exit(1);
    });
}

export default seedFinalPackages;