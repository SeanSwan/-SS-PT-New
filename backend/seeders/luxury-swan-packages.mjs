/**
 * SwanStudios Session Packages - Luxury Swan & Rare Elements Theme
 * =============================================================
 * ⚠️  WARNING: This seeder is for DEVELOPMENT ONLY
 * ⚠️  For PRODUCTION, use luxury-swan-packages-production.mjs instead
 * ⚠️  Theme field has been removed for database compatibility
 * Creates 8 session packages with elegant names that combine rare elements
 * with swan themes, creating subtle aspiration toward higher tiers.
 * 
 * Package Progression (Subtle Value Ladder):
 * 1. Silver Swan Wing - 1 session @ $175 = $175
 * 2. Golden Swan Flight - 8 sessions @ $170 = $1,360
 * 3. Sapphire Swan Soar - 20 sessions @ $165 = $3,300
 * 4. Platinum Swan Grace - 50 sessions @ $160 = $8,000
 * 5. Emerald Swan Evolution - 3 months @ $155 = $8,060
 * 6. Diamond Swan Dynasty - 6 months @ $150 = $15,600
 * 7. Ruby Swan Reign - 9 months @ $145 = $22,620
 * 8. Rhodium Swan Royalty - 12 months @ $140 = $29,120
 */

// Create the main function and export it
async function seedLuxuryPackages() {
  console.log('🦢 CREATING SWANSTUDIOS LUXURY PACKAGE COLLECTION');
  console.log('==================================================');
  console.log('✨ Rare Elements × Swan Elegance × Premium Training');

  try {
    console.log('📂 Step 1: Importing database and models...');
    const { default: sequelize } = await import('../database.mjs');
    const { default: StorefrontItem } = await import('../models/StorefrontItem.mjs');
    console.log('✅ Database connection ready');
    
    console.log('🔍 Step 2: Checking current packages...');
    const currentCount = await StorefrontItem.count();
    console.log(`📊 Found ${currentCount} existing packages`);
    
    if (currentCount > 0) {
      console.log('🧹 Step 3: Clearing existing packages to make way for luxury collection...');
      await StorefrontItem.destroy({ where: {}, truncate: true });
      console.log('✅ Cleared - Ready for SwanStudios luxury collection');
    }
    
    console.log('🦢 Step 4: Creating SwanStudios Luxury Package Collection...');
    console.log('✨ Each package combines rare elements with swan elegance');
    
    // SwanStudios Luxury Package Collection
    const luxuryPackages = [
      {
        packageType: 'fixed',
        name: 'Silver Swan Wing',
        description: 'Your elegant introduction to premium personal training with Sean Swan',
        sessions: 1,
        pricePerSession: 175.00,
        totalCost: 175.00,
        price: 175.00,
        // theme: 'cosmic', // Removed for production compatibility
        isActive: true,
        displayOrder: 1
      },
      {
        packageType: 'fixed',
        name: 'Golden Swan Flight',
        description: 'Begin your transformation journey with 8 sessions of expert guidance',
        sessions: 8,
        pricePerSession: 170.00,
        totalCost: 1360.00,
        price: 1360.00,
        // theme: 'purple', // Removed for production compatibility
        isActive: true,
        displayOrder: 2
      },
      {
        packageType: 'fixed',
        name: 'Sapphire Swan Soar',
        description: 'Elevate your fitness with 20 sessions of premium training excellence',
        sessions: 20,
        pricePerSession: 165.00,
        totalCost: 3300.00,
        price: 3300.00,
        // theme: 'emerald', // Removed for production compatibility
        isActive: true,
        displayOrder: 3
      },
      {
        packageType: 'fixed',
        name: 'Platinum Swan Grace',
        description: 'Master your potential with 50 sessions of elite personal training',
        sessions: 50,
        pricePerSession: 160.00,
        totalCost: 8000.00,
        price: 8000.00,
        // theme: 'ruby', // Removed for production compatibility
        isActive: true,
        displayOrder: 4
      },
      {
        packageType: 'monthly',
        name: 'Emerald Swan Evolution',
        description: 'Transform your life with 3 months of dedicated training (4x per week)',
        months: 3,
        sessionsPerWeek: 4,
        totalSessions: 52,
        pricePerSession: 155.00,
        totalCost: 8060.00,
        price: 8060.00,
        // theme: 'cosmic', // Removed for production compatibility
        isActive: true,
        displayOrder: 5
      },
      {
        packageType: 'monthly',
        name: 'Diamond Swan Dynasty',
        description: 'Build lasting strength with 6 months of premium training mastery',
        months: 6,
        sessionsPerWeek: 4,
        totalSessions: 104,
        pricePerSession: 150.00,
        totalCost: 15600.00,
        price: 15600.00,
        // theme: 'purple', // Removed for production compatibility
        isActive: true,
        displayOrder: 6
      },
      {
        packageType: 'monthly',
        name: 'Ruby Swan Reign',
        description: 'Command your fitness destiny with 9 months of elite transformation',
        months: 9,
        sessionsPerWeek: 4,
        totalSessions: 156,
        pricePerSession: 145.00,
        totalCost: 22620.00,
        price: 22620.00,
        // theme: 'emerald', // Removed for production compatibility
        isActive: true,
        displayOrder: 7
      },
      {
        packageType: 'monthly',
        name: 'Rhodium Swan Royalty',
        description: 'The ultimate year-long journey to peak performance and royal fitness',
        months: 12,
        sessionsPerWeek: 4,
        totalSessions: 208,
        pricePerSession: 140.00,
        totalCost: 29120.00,
        price: 29120.00,
        // theme: 'ruby', // Removed for production compatibility
        isActive: true,
        displayOrder: 8
      }
    ];
    
    const createdPackages = [];
    
    for (let i = 0; i < luxuryPackages.length; i++) {
      const pkg = luxuryPackages[i];
      console.log(`\n💎 Creating package ${i + 1}/8: ${pkg.name}`);
      
      const sessionsText = pkg.packageType === 'fixed' 
        ? `${pkg.sessions} sessions` 
        : `${pkg.totalSessions} sessions over ${pkg.months} months`;
      
      console.log(`   ✨ ${sessionsText} @ $${pkg.pricePerSession}/session = $${pkg.totalCost}`);
      console.log(`   🦢 "${pkg.description}"`);
      
      try {
        const created = await StorefrontItem.create(pkg);
        createdPackages.push(created);
        console.log(`   ✅ SUCCESS: ${pkg.name} created with elegance`);
      } catch (createError) {
        console.error(`   ❌ FAILED: ${createError.message}`);
        throw createError;
      }
    }
    
    console.log(`\n🎉 SUCCESS: SwanStudios Luxury Collection Complete!`);
    console.log(`✨ Created ${createdPackages.length} premium packages`);
    
    // Display the luxury collection
    console.log('\n🦢 SWANSTUDIOS LUXURY PACKAGE COLLECTION');
    console.log('==========================================');
    console.log('💎 Rare Elements × Swan Elegance × Premium Training\n');
    
    const allPackages = await StorefrontItem.findAll({
      order: [['displayOrder', 'ASC']]
    });
    
    allPackages.forEach((pkg, index) => {
      const sessionsText = pkg.packageType === 'fixed' 
        ? `${pkg.sessions} sessions` 
        : `${pkg.totalSessions} sessions (${pkg.months} months)`;
      
      const element = pkg.name.split(' ')[0]; // Extract the element (Silver, Golden, etc.)
      
      console.log(`${index + 1}. 💎 ${pkg.name}`);
      console.log(`   💰 $${pkg.totalCost} • ${sessionsText} @ $${pkg.pricePerSession}/session`);
      console.log(`   ✨ ${element} elegance • 🎯 Premium positioning`);
      console.log('');
    });
    
    console.log('🦢 LUXURY PROGRESSION PSYCHOLOGY:');
    console.log('==================================');
    console.log('✨ Silver Wing → Golden Flight → Sapphire Soar → Platinum Grace');
    console.log('🔄 Evolution → Dynasty → Reign → Royalty');
    console.log('💎 Each tier represents increasing elegance and commitment');
    console.log('🎯 Subtle aspiration: clients naturally desire the "next level"');
    console.log('');
    console.log('🚀 SWANSTUDIOS LUXURY COLLECTION IS LIVE!');
    console.log('✨ Premium training meets rare element elegance');
    
    return {
      success: true,
      packagesCreated: createdPackages.length,
      packages: createdPackages
    };
    
  } catch (error) {
    console.error('\n💥 ERROR in luxury collection creation:', error.message);
    console.error('📚 Stack trace:', error.stack);
    throw error;
  }
}

// Export for use as a module
export default seedLuxuryPackages;

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting direct execution of luxury package seeder...');
  
  seedLuxuryPackages()
    .then((result) => {
      console.log('🎉 Luxury package seeding completed successfully!');
      console.log(`📊 Result: ${result.packagesCreated} luxury packages created`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Luxury package seeding failed:', error.message);
      console.error('Full error:', error);
      process.exit(1);
    });
}
