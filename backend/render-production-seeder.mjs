/**
 * RENDER PRODUCTION PACKAGE SEEDER
 * ================================
 * Seeds the production database on Render with SwanStudios luxury packages
 */

console.log('🚀 RENDER PRODUCTION PACKAGE SEEDER');
console.log('===================================');
console.log('🎯 Seeding SwanStudios luxury packages to production database');

// Force production environment if DATABASE_URL is available
if (process.env.DATABASE_URL) {
  process.env.NODE_ENV = 'production';
  console.log('🔧 Detected DATABASE_URL - forcing production mode');
}

try {
  // Connect to production database (uses DATABASE_URL from Render)
  console.log('📂 Connecting to Render production database...');
  const { default: sequelize } = await import('./database.mjs');
  const { default: StorefrontItem } = await import('./models/StorefrontItem.mjs');
  
  // Verify connection
  await sequelize.authenticate();
  console.log('✅ Connected to Render production database');
  
  // Check environment
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'unknown'}`);
  console.log(`🔌 Database: ${process.env.DATABASE_URL ? 'PostgreSQL on Render' : 'Local'}`);
  
  // Clear existing packages safely
  console.log('\n🧹 Clearing existing packages from production...');
  
  try {
    // Import dependent models for safe clearing
    const { default: CartItem } = await import('./models/CartItem.mjs');
    const { default: OrderItem } = await import('./models/OrderItem.mjs');
    
    // Clear dependencies first
    await CartItem.destroy({ where: {} });
    await OrderItem.destroy({ where: {} });
    await StorefrontItem.destroy({ where: {} });
    
    console.log('✅ Existing packages cleared safely');
  } catch (clearError) {
    console.log('⚠️ Using PostgreSQL TRUNCATE for production...');
    await sequelize.query('TRUNCATE TABLE storefront_items RESTART IDENTITY CASCADE;');
    console.log('✅ Production database cleared with CASCADE');
  }
  
  // Check table schema
  console.log('\n📋 Checking production table schema...');
  const [results] = await sequelize.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'storefront_items' 
    AND table_schema = current_schema()
  `);
  
  const columns = results.map(row => row.column_name);
  const hasIsActive = columns.includes('isActive');
  const hasDisplayOrder = columns.includes('displayOrder');
  
  console.log(`📊 Schema: isActive(${hasIsActive}), displayOrder(${hasDisplayOrder})`);
  
  // Production-ready SwanStudios luxury packages
  console.log('\n💎 Creating SwanStudios Luxury Collection for Production...');
  
  const productionPackages = [
    {
      packageType: 'fixed',
      name: 'Silver Swan Wing',
      description: 'Your elegant introduction to premium personal training with Sean Swan',
      sessions: 1,
      pricePerSession: 175.00,
      totalCost: 175.00,
      price: 175.00,
      displayPrice: 175.00,
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
      displayPrice: 1360.00,
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
      displayPrice: 3300.00,
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
      displayPrice: 8000.00,
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
      displayPrice: 8060.00,
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
      displayPrice: 15600.00,
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
      displayPrice: 22620.00,
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
      displayPrice: 29120.00,
      ...(hasIsActive && { isActive: true }),
      ...(hasDisplayOrder && { displayOrder: 8 })
    }
  ];
  
  const createdPackages = [];
  
  for (let i = 0; i < productionPackages.length; i++) {
    const pkg = productionPackages[i];
    console.log(`\n💎 Creating ${i + 1}/8: ${pkg.name}`);
    console.log(`   💰 $${pkg.displayPrice} (${pkg.sessions || pkg.totalSessions} sessions)`);
    
    try {
      const created = await StorefrontItem.create(pkg);
      createdPackages.push(created);
      
      // Verify pricing was set correctly
      const verifyPrice = created.displayPrice || created.price || created.totalCost || 0;
      if (verifyPrice > 0) {
        console.log(`   ✅ SUCCESS: $${verifyPrice} verified`);
      } else {
        console.log(`   🚨 WARNING: Pricing verification failed!`);
      }
      
    } catch (createError) {
      console.error(`   ❌ FAILED: ${createError.message}`);
      throw createError;
    }
  }
  
  // Final verification
  console.log(`\n🎉 PRODUCTION SEEDING COMPLETE!`);
  console.log(`✨ Created ${createdPackages.length} luxury packages`);
  
  // Verify final state
  const finalCheck = await StorefrontItem.findAll({
    order: hasDisplayOrder ? [['displayOrder', 'ASC']] : [['id', 'ASC']]
  });
  
  console.log('\n✅ PRODUCTION VERIFICATION:');
  console.log('==========================');
  
  let allGood = true;
  finalCheck.forEach((pkg, index) => {
    const price = pkg.displayPrice || pkg.price || pkg.totalCost || 0;
    console.log(`${index + 1}. ${pkg.name}: $${price}`);
    
    if (price === 0) {
      console.log(`   🚨 ERROR: Zero pricing detected!`);
      allGood = false;
    }
  });
  
  if (allGood) {
    console.log('\n🚀 RENDER PRODUCTION DATABASE READY!');
    console.log('✅ All packages have proper pricing');
    console.log('🦢 SwanStudios Store is production-ready');
  } else {
    console.log('\n🚨 PRODUCTION ISSUES DETECTED');
    console.log('❌ Some packages have zero pricing');
  }
  
  console.log('\n📡 NEXT: Test your production API endpoint');
  console.log('https://your-app.onrender.com/api/storefront');
  
  process.exit(0);
  
} catch (error) {
  console.error('\n💥 PRODUCTION SEEDING FAILED:', error.message);
  console.error('📚 Stack trace:', error.stack);
  
  console.log('\n🔧 RENDER DEPLOYMENT TROUBLESHOOTING:');
  console.log('1. Check Render dashboard for deployment status');
  console.log('2. Verify DATABASE_URL environment variable');
  console.log('3. Check if database migrations completed');
  console.log('4. Review Render service logs');
  
  process.exit(1);
}
