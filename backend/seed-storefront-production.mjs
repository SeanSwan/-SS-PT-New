#!/usr/bin/env node
/**
 * PRODUCTION STOREFRONT SEEDER - RENDER COMPATIBLE
 * ================================================
 * Emergency seeder to populate storefront_items table in production
 * Run this on Render via: node backend/seed-storefront-production.mjs
 *
 * This fixes the "Training package not found" error by seeding 8 luxury packages
 */

console.log('🦢 SWANSTUDIOS PRODUCTION STOREFRONT SEEDER');
console.log('===========================================');
console.log('🎯 Populating storefront_items table on Render production database\n');

async function seedProduction() {
  try {
    // Import database and models
    console.log('📂 Step 1: Importing database connection...');
    const { default: sequelize } = await import('./database.mjs');

    console.log('📂 Step 2: Importing StorefrontItem model...');
    const { default: StorefrontItem } = await import('./models/StorefrontItem.mjs');

    // Test database connection
    console.log('🔍 Step 3: Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Check current state
    console.log('\n🔍 Step 4: Checking current storefront_items...');
    const currentCount = await StorefrontItem.count();
    console.log(`📊 Current package count: ${currentCount}`);

    if (currentCount >= 8) {
      console.log('✅ Storefront already has packages. Exiting.');
      console.log('ℹ️  If you want to reset packages, manually truncate the table first.');
      process.exit(0);
    }

    // Check table schema for optional columns
    console.log('\n📋 Step 5: Checking table schema...');
    const [columns] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'storefront_items'
      AND table_schema = current_schema()
    `);

    const columnNames = columns.map(col => col.column_name);
    const hasIsActive = columnNames.includes('isActive');
    const hasDisplayOrder = columnNames.includes('displayOrder');
    const hasIncludedFeatures = columnNames.includes('includedFeatures');

    console.log(`✅ Schema check complete:`);
    console.log(`   - isActive: ${hasIsActive}`);
    console.log(`   - displayOrder: ${hasDisplayOrder}`);
    console.log(`   - includedFeatures: ${hasIncludedFeatures}`);

    // Define 8 SwanStudios luxury packages
    console.log('\n💎 Step 6: Creating SwanStudios Luxury Package Collection...');

    const packages = [
      {
        packageType: 'fixed',
        name: 'Silver Swan Wing',
        description: 'Your elegant introduction to premium personal training with Sean Swan',
        sessions: 1,
        pricePerSession: 175.00,
        totalCost: 175.00,
        price: 175.00,
        totalSessions: 1,
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
        totalSessions: 8,
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
        totalSessions: 20,
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
        totalSessions: 50,
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

    // Create packages one by one
    const created = [];
    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      console.log(`\n💎 Creating package ${i + 1}/8: ${pkg.name}`);

      const sessionsText = pkg.packageType === 'fixed'
        ? `${pkg.sessions} sessions`
        : `${pkg.totalSessions} sessions (${pkg.months} months, ${pkg.sessionsPerWeek}x/week)`;

      console.log(`   📊 ${sessionsText}`);
      console.log(`   💰 $${pkg.totalCost} total ($${pkg.pricePerSession}/session)`);

      try {
        const result = await StorefrontItem.create(pkg);
        created.push(result);
        console.log(`   ✅ Created successfully (ID: ${result.id})`);
      } catch (err) {
        console.error(`   ❌ Failed: ${err.message}`);
        throw err;
      }
    }

    // Verify final state
    console.log('\n🔍 Step 7: Verifying created packages...');
    const finalCount = await StorefrontItem.count();
    console.log(`📊 Final package count: ${finalCount}`);

    const allPackages = await StorefrontItem.findAll({
      order: hasDisplayOrder ? [['displayOrder', 'ASC']] : [['id', 'ASC']]
    });

    console.log('\n🦢 SWANSTUDIOS LUXURY COLLECTION - LIVE ON RENDER');
    console.log('=================================================');

    allPackages.forEach((pkg, idx) => {
      const sessionsText = pkg.packageType === 'fixed'
        ? `${pkg.sessions} sessions`
        : `${pkg.totalSessions} sessions (${pkg.months} months)`;

      console.log(`\n${idx + 1}. 💎 ${pkg.name}`);
      console.log(`   💰 $${pkg.totalCost} • ${sessionsText} @ $${pkg.pricePerSession}/session`);
      console.log(`   📝 ${pkg.description}`);
      console.log(`   🆔 Database ID: ${pkg.id}`);
    });

    console.log('\n🎉 SUCCESS! Storefront packages seeded to production database!');
    console.log('✅ Users can now purchase training packages from the storefront');
    console.log('\n🔗 Next steps:');
    console.log('   1. Test GET /api/storefront - should return 8 packages');
    console.log('   2. Test POST /api/cart/add - should successfully add items');
    console.log('   3. Test GET /api/storefront/calculate-price?sessions=25 - should calculate pricing');

    return {
      success: true,
      packagesCreated: created.length,
      totalPackages: finalCount
    };

  } catch (error) {
    console.error('\n💥 SEEDING FAILED:', error.message);
    console.error('📚 Stack trace:', error.stack);
    throw error;
  }
}

// Execute seeder
seedProduction()
  .then((result) => {
    console.log(`\n✅ Seeding completed: ${result.packagesCreated} packages created`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  });
