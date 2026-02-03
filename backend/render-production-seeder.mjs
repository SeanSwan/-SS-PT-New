/**
 * RENDER PRODUCTION PACKAGE SEEDER
 * ================================
 * Seeds the production database on Render with SwanStudios Phase 6 packages
 */

console.log('🚀 RENDER PRODUCTION PACKAGE SEEDER');
console.log('===================================');
console.log('🎯 Seeding SwanStudios Phase 6 packages to production database');

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
  
  // Production-ready SwanStudios Phase 6 packages
  console.log('\n💎 Creating SwanStudios Luxury Collection for Production...');
  
  
  // Phase 6 packages (store redesign)
  console.log('\n???? Creating SwanStudios Phase 6 Packages for Production...');

  const PHASE_6_PACKAGES = [
    {
      name: 'SwanStudios 10-Pack',
      description: '10 personal training sessions (60 min each). Valid for 16 months.',
      packageType: 'fixed',
      price: 1750.00,
      sessions: 10,
      pricePerSession: 175.00,
      months: 16,
      totalSessions: 10,
      ...(hasIsActive && { isActive: true }),
      ...(hasDisplayOrder && { displayOrder: 1 })
    },
    {
      name: 'SwanStudios 24-Pack',
      description: '24 personal training sessions (60 min each). Valid for 16 months.',
      packageType: 'fixed',
      price: 4200.00,
      sessions: 24,
      pricePerSession: 175.00,
      months: 16,
      totalSessions: 24,
      ...(hasIsActive && { isActive: true }),
      ...(hasDisplayOrder && { displayOrder: 2 })
    },
    {
      name: 'SwanStudios 6 Month',
      description: '108 personal training sessions. Valid for 16 months.',
      packageType: 'fixed',
      price: 18900.00,
      sessions: 108,
      pricePerSession: 175.00,
      months: 16,
      totalSessions: 108,
      ...(hasIsActive && { isActive: true }),
      ...(hasDisplayOrder && { displayOrder: 3 })
    },
    {
      name: 'SwanStudios 12 Month',
      description: '208 personal training sessions. Valid for 16 months.',
      packageType: 'fixed',
      price: 36400.00,
      sessions: 208,
      pricePerSession: 175.00,
      months: 16,
      totalSessions: 208,
      ...(hasIsActive && { isActive: true }),
      ...(hasDisplayOrder && { displayOrder: 4 })
    },
    {
      name: 'SwanStudios Express',
      description: '10 quick sessions (30 min each). Valid for 16 months.',
      packageType: 'fixed',
      price: 1100.00,
      sessions: 10,
      pricePerSession: 110.00,
      months: 16,
      totalSessions: 10,
      ...(hasIsActive && { isActive: true }),
      ...(hasDisplayOrder && { displayOrder: 5 })
    }
  ];

  const createdPackages = await StorefrontItem.bulkCreate(PHASE_6_PACKAGES, {
    validate: false
  });

// Final verification
  console.log(`\n🎉 PRODUCTION SEEDING COMPLETE!`);
  console.log(`✨ Created ${createdPackages.length} Phase 6 packages`);
  
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
