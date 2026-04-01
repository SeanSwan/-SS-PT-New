/**
 * ⚠️  LEGACY SEEDER — DO NOT RUN
 * ================================
 * This seeder contains OLD pricing with volume discounts ($170-$140/session).
 * Current pricing: ALL sessions are $175/session flat, no discounts.
 * Use luxury-swan-packages-production.mjs for current packages.
 *
 * OLD Fixed Session Packages (RETIRED):
 * - 8 sessions @ $170, 20 @ $165, 50 @ $160
 * OLD Monthly Packages (RETIRED):
 * - 3mo @ $155, 6mo @ $150, 9mo @ $145, 12mo @ $140
 *
 * CURRENT (2026-03-31): 1, 10, 24 sessions + 3/6/12 month + 30-min 10-pack
 * All at $175/session (1hr) or $87.50/session (30min)
 */

import StorefrontItem from '../models/StorefrontItem.mjs';
import logger from '../utils/logger.mjs';

async function seedCorrectSessionPackages() {
  try {
    logger.info('🎯 Setting up SwanStudios session packages with correct pricing...');
    
    // First, clear existing packages to avoid duplicates
    const existingCount = await StorefrontItem.count();
    if (existingCount > 0) {
      logger.info(`🔄 Clearing ${existingCount} existing packages...`);
      await StorefrontItem.destroy({ where: {}, truncate: true });
      logger.info('✅ Existing packages cleared');
    }
    
    // Define the exact packages with correct pricing
    const sessionPackages = [
      // Fixed Session Packages
      {
        packageType: 'fixed',
        name: '1 Session Package',
        description: 'Single personal training session with Sean Swan',
        sessions: 1,
        pricePerSession: 175.00,
        totalCost: 175.00,
        price: 175.00,
        theme: 'cosmic',
        isActive: true,
        displayOrder: 1
      },
      {
        packageType: 'fixed',
        name: '8 Session Package',
        description: 'Package of 8 personal training sessions',
        sessions: 8,
        pricePerSession: 170.00,
        totalCost: 1360.00,
        price: 1360.00,
        theme: 'purple',
        isActive: true,
        displayOrder: 2
      },
      {
        packageType: 'fixed',
        name: '20 Session Package',
        description: 'Package of 20 personal training sessions - Great Value!',
        sessions: 20,
        pricePerSession: 165.00,
        totalCost: 3300.00,
        price: 3300.00,
        theme: 'emerald',
        isActive: true,
        displayOrder: 3
      },
      {
        packageType: 'fixed',
        name: '50 Session Package',
        description: 'Package of 50 personal training sessions - Best Value!',
        sessions: 50,
        pricePerSession: 160.00,
        totalCost: 8000.00,
        price: 8000.00,
        theme: 'ruby',
        isActive: true,
        displayOrder: 4
      },
      
      // Monthly Packages (4x per week)
      {
        packageType: 'monthly',
        name: '3 Month Package (4x/week)',
        description: '3 months of training - 4 sessions per week',
        months: 3,
        sessionsPerWeek: 4,
        totalSessions: 52, // ~13 weeks × 4 sessions
        pricePerSession: 155.00,
        totalCost: 8060.00,
        price: 8060.00,
        theme: 'cosmic',
        isActive: true,
        displayOrder: 5
      },
      {
        packageType: 'monthly',
        name: '6 Month Package (4x/week)',
        description: '6 months of training - 4 sessions per week',
        months: 6,
        sessionsPerWeek: 4,
        totalSessions: 104, // ~26 weeks × 4 sessions
        pricePerSession: 150.00,
        totalCost: 15600.00,
        price: 15600.00,
        theme: 'purple',
        isActive: true,
        displayOrder: 6
      },
      {
        packageType: 'monthly',
        name: '9 Month Package (4x/week)',
        description: '9 months of training - 4 sessions per week',
        months: 9,
        sessionsPerWeek: 4,
        totalSessions: 156, // ~39 weeks × 4 sessions
        pricePerSession: 145.00,
        totalCost: 22620.00,
        price: 22620.00,
        theme: 'emerald',
        isActive: true,
        displayOrder: 7
      },
      {
        packageType: 'monthly',
        name: '12 Month Package (4x/week)',
        description: '12 months of training - 4 sessions per week - Ultimate Value!',
        months: 12,
        sessionsPerWeek: 4,
        totalSessions: 208, // ~52 weeks × 4 sessions
        pricePerSession: 140.00,
        totalCost: 29120.00,
        price: 29120.00,
        theme: 'ruby',
        isActive: true,
        displayOrder: 8
      }
    ];
    
    logger.info('📦 Creating session packages...');
    
    // Create packages one by one with error handling
    const createdPackages = [];
    for (let i = 0; i < sessionPackages.length; i++) {
      const pkg = sessionPackages[i];
      try {
        const created = await StorefrontItem.create(pkg);
        createdPackages.push(created);
        
        const sessionsText = pkg.packageType === 'fixed' 
          ? `${pkg.sessions} sessions` 
          : `${pkg.totalSessions} sessions (${pkg.months} months)`;
        
        logger.info(`✅ Created: ${pkg.name} - $${pkg.totalCost} (${sessionsText} @ $${pkg.pricePerSession}/session)`);
      } catch (error) {
        logger.error(`❌ Error creating ${pkg.name}:`, error.message);
        throw error;
      }
    }
    
    logger.info(`\n🎉 Successfully created ${createdPackages.length} session packages!`);
    logger.info('\n📋 SwanStudios Session Package Summary:');
    logger.info('=====================================');
    
    // Display summary
    createdPackages.forEach(pkg => {
      const sessionsText = pkg.packageType === 'fixed' 
        ? `${pkg.sessions} sessions` 
        : `${pkg.totalSessions} sessions (${pkg.months} months)`;
      
      logger.info(`${pkg.name}: $${pkg.totalCost} (${sessionsText} @ $${pkg.pricePerSession}/session)`);
    });
    
    logger.info('\n💰 Pricing Progression:');
    logger.info('- Single sessions start at $175');
    logger.info('- Bulk packages offer discounts down to $160/session');
    logger.info('- Monthly packages offer the best rates at $140-155/session');
    logger.info('- 12-month package offers maximum value at $140/session');
    
    return {
      success: true,
      packagesCreated: createdPackages.length,
      packages: createdPackages
    };
    
  } catch (error) {
    logger.error('💥 Error seeding session packages:', error);
    throw error;
  }
}

// Export for use as a module
export default seedCorrectSessionPackages;

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  seedCorrectSessionPackages()
    .then((result) => {
      logger.info('🚀 Session package seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Session package seeding failed:', error);
      process.exit(1);
    });
}
