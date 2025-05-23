/**
 * SwanStudios Session Packages - Simplified Seeder
 * ==============================================
 * Debug version with better error handling and direct console logging
 */

import StorefrontItem from '../models/StorefrontItem.mjs';

async function seedCorrectSessionPackages() {
  console.log('🎯 Starting SwanStudios session package seeding...');
  
  try {
    // Check if database connection is working
    console.log('🔍 Testing database connection...');
    const testCount = await StorefrontItem.count();
    console.log(`✅ Database connection working. Current package count: ${testCount}`);
    
    // Clear existing packages
    if (testCount > 0) {
      console.log(`🔄 Clearing ${testCount} existing packages...`);
      await StorefrontItem.destroy({ where: {}, truncate: true });
      console.log('✅ Existing packages cleared');
    }
    
    // Define packages
    const sessionPackages = [
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
      {
        packageType: 'monthly',
        name: '3 Month Package (4x/week)',
        description: '3 months of training - 4 sessions per week',
        months: 3,
        sessionsPerWeek: 4,
        totalSessions: 52,
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
        totalSessions: 104,
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
        totalSessions: 156,
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
        totalSessions: 208,
        pricePerSession: 140.00,
        totalCost: 29120.00,
        price: 29120.00,
        theme: 'ruby',
        isActive: true,
        displayOrder: 8
      }
    ];
    
    console.log(`📦 Creating ${sessionPackages.length} session packages...`);
    
    // Create packages one by one
    const createdPackages = [];
    for (let i = 0; i < sessionPackages.length; i++) {
      const pkg = sessionPackages[i];
      console.log(`\n📝 Creating package ${i + 1}/${sessionPackages.length}: ${pkg.name}`);
      
      try {
        const created = await StorefrontItem.create(pkg);
        createdPackages.push(created);
        
        const sessionsText = pkg.packageType === 'fixed' 
          ? `${pkg.sessions} sessions` 
          : `${pkg.totalSessions} sessions (${pkg.months} months)`;
        
        console.log(`✅ Created: ${pkg.name} - $${pkg.totalCost} (${sessionsText} @ $${pkg.pricePerSession}/session)`);
      } catch (createError) {
        console.error(`❌ Error creating ${pkg.name}:`, createError.message);
        console.error('📋 Package data:', JSON.stringify(pkg, null, 2));
        throw createError;
      }
    }
    
    console.log(`\n🎉 Successfully created ${createdPackages.length} session packages!`);
    
    // Verify creation
    const finalCount = await StorefrontItem.count();
    console.log(`✅ Final package count in database: ${finalCount}`);
    
    // Display summary
    console.log('\n📋 SwanStudios Session Package Summary:');
    console.log('=====================================');
    
    const allPackages = await StorefrontItem.findAll({
      order: [['displayOrder', 'ASC']]
    });
    
    allPackages.forEach(pkg => {
      const sessionsText = pkg.packageType === 'fixed' 
        ? `${pkg.sessions} sessions` 
        : `${pkg.totalSessions} sessions (${pkg.months} months)`;
      
      console.log(`${pkg.name}: $${pkg.totalCost} (${sessionsText} @ $${pkg.pricePerSession}/session)`);
    });
    
    console.log('\n💰 Pricing Progression:');
    console.log('- Single sessions start at $175');
    console.log('- Bulk packages offer discounts down to $160/session');
    console.log('- Monthly packages offer the best rates at $140-155/session');
    console.log('- 12-month package offers maximum value at $140/session');
    
    return {
      success: true,
      packagesCreated: createdPackages.length,
      packages: createdPackages
    };
    
  } catch (error) {
    console.error('💥 Error seeding session packages:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Export for use as a module
export default seedCorrectSessionPackages;

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting direct execution of session package seeder...');
  
  seedCorrectSessionPackages()
    .then((result) => {
      console.log('🎉 Session package seeding completed successfully!');
      console.log(`📊 Result: ${result.packagesCreated} packages created`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Session package seeding failed:', error.message);
      console.error('Full error:', error);
      process.exit(1);
    });
}
