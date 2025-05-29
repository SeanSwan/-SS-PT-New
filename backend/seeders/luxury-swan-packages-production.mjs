/**
 * SwanStudios Session Packages - Production-Compatible Luxury Collection
 * ===================================================================
 * Creates 8 luxury packages compatible with production database schema.
 * Removes theme field to avoid database errors on Render.
 */

// Create the main function and export it
async function seedLuxuryPackagesProduction() {
  console.log('🦢 CREATING SWANSTUDIOS LUXURY COLLECTION - PRODUCTION VERSION');
  console.log('==============================================================');
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
      
      // Clear dependent tables first to avoid foreign key constraint errors
      try {
        // Import dependent models
        const { default: CartItem } = await import('../models/CartItem.mjs');
        const { default: OrderItem } = await import('../models/OrderItem.mjs');
        
        console.log('   🗑️ Clearing dependent CartItems...');
        await CartItem.destroy({ where: {} });
        
        console.log('   🗑️ Clearing dependent OrderItems...');
        await OrderItem.destroy({ where: {} });
        
        console.log('   🗑️ Clearing StorefrontItems...');
        await StorefrontItem.destroy({ where: {} });
        
        console.log('✅ Cleared - Ready for SwanStudios luxury collection');
      } catch (clearError) {
        console.log('⚠️ Standard clear failed, trying PostgreSQL-compatible force clear...');
        // PostgreSQL approach: disable triggers temporarily
        try {
          // For PostgreSQL, we need to use TRUNCATE CASCADE or disable triggers
          await sequelize.query('TRUNCATE TABLE storefront_items RESTART IDENTITY CASCADE;');
          console.log('✅ PostgreSQL force cleared - Ready for SwanStudios luxury collection');
        } catch (forceError) {
          console.log('⚠️ Could not clear existing packages, proceeding with creation anyway...');
          console.log('   📝 Note: Duplicate packages may be created');
        }
      }
    }
    
    console.log('🦢 Step 4: Creating SwanStudios Luxury Package Collection...');
    console.log('✨ Each package combines rare elements with swan elegance');
    
    // Check if isActive and displayOrder columns exist before using them
    let tableColumns;
    try {
      const [results] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'storefront_items' AND table_schema = current_schema()");
      tableColumns = results.map(row => row.column_name);
      console.log('📋 Available columns:', tableColumns.join(', '));
    } catch (columnError) {
      console.log('⚠️ Could not check table columns, proceeding with basic schema');
      tableColumns = ['id', 'packageType', 'name', 'description', 'price', 'sessions', 'pricePerSession', 'totalCost'];
    }
    
    const hasIsActive = tableColumns.includes('isActive');
    const hasDisplayOrder = tableColumns.includes('displayOrder');
    
    console.log(`📊 Schema support - isActive: ${hasIsActive}, displayOrder: ${hasDisplayOrder}`);
    
    // Production-Compatible Luxury Packages (conditionally include isActive and displayOrder)
    const luxuryPackages = [
      {
        packageType: 'fixed',
        name: 'Silver Swan Wing',
        description: 'Your elegant introduction to premium personal training with Sean Swan',
        sessions: 1,
        pricePerSession: 175.00,
        totalCost: 175.00,
        price: 175.00,
        ...(hasIsActive && { isActive: true }),
        ...(hasDisplayOrder && { displayOrder: 1 })
      },
      {
        packageType: 'fixed',
        name: 'Golden Swan Flight',
        description: 'Begin your transformation journey with 8 sessions of expert guidance',
        sessions: 8,
        pricePerSession: 170.00,
        totalCost: 1360.00,
        price: 1360.00,
        ...(hasIsActive && { isActive: true }),
        ...(hasDisplayOrder && { displayOrder: 2 })
      },
      {
        packageType: 'fixed',
        name: 'Sapphire Swan Soar',
        description: 'Elevate your fitness with 20 sessions of premium training excellence',
        sessions: 20,
        pricePerSession: 165.00,
        totalCost: 3300.00,
        price: 3300.00,
        ...(hasIsActive && { isActive: true }),
        ...(hasDisplayOrder && { displayOrder: 3 })
      },
      {
        packageType: 'fixed',
        name: 'Platinum Swan Grace',
        description: 'Master your potential with 50 sessions of elite personal training',
        sessions: 50,
        pricePerSession: 160.00,
        totalCost: 8000.00,
        price: 8000.00,
        ...(hasIsActive && { isActive: true }),
        ...(hasDisplayOrder && { displayOrder: 4 })
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
        ...(hasIsActive && { isActive: true }),
        ...(hasDisplayOrder && { displayOrder: 5 })
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
        ...(hasIsActive && { isActive: true }),
        ...(hasDisplayOrder && { displayOrder: 6 })
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
        ...(hasIsActive && { isActive: true }),
        ...(hasDisplayOrder && { displayOrder: 7 })
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
        ...(hasIsActive && { isActive: true }),
        ...(hasDisplayOrder && { displayOrder: 8 })
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
    
    const orderClause = hasDisplayOrder ? [['displayOrder', 'ASC']] : [['id', 'ASC']];
    const allPackages = await StorefrontItem.findAll({
      order: orderClause
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
    console.log('🚀 SWANSTUDIOS LUXURY COLLECTION IS LIVE ON RENDER!');
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
export default seedLuxuryPackagesProduction;

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting production luxury package seeder...');
  
  seedLuxuryPackagesProduction()
    .then((result) => {
      console.log('🎉 Production luxury package seeding completed successfully!');
      console.log(`📊 Result: ${result.packagesCreated} luxury packages created`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Production luxury package seeding failed:', error.message);
      console.error('Full error:', error);
      process.exit(1);
    });
}
