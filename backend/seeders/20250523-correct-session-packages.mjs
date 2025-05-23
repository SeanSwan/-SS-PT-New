/**
 * SwanStudios Session Packages - Final Correct Pricing
 * ==================================================
 * Creates the exact 8 session packages with correct pricing as specified.
 * 
 * Fixed Session Packages:
 * - 1 session @ $175/session = $175 total
 * - 8 sessions @ $170/session = $1,360 total  
 * - 20 sessions @ $165/session = $3,300 total
 * - 50 sessions @ $160/session = $8,000 total
 * 
 * Monthly Packages (4x per week):
 * - 3 month package @ $155/session = 52 sessions = $8,060 total
 * - 6 month package @ $150/session = 104 sessions = $15,600 total
 * - 9 month package @ $145/session = 156 sessions = $22,620 total
 * - 12 month package @ $140/session = 208 sessions = $29,120 total
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
