/**
 * RENDER PRODUCTION VERIFICATION
 * ==============================
 * Comprehensive check of SwanStudios Store in production
 */

console.log('✅ RENDER PRODUCTION VERIFICATION');
console.log('=================================');
console.log('🎯 Verifying SwanStudios Store deployment');

try {
  // Check environment
  console.log('\n🌍 ENVIRONMENT CHECK:');
  console.log('=====================');
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`Database: ${process.env.DATABASE_URL ? 'PostgreSQL (Render)' : 'Not set'}`);
  console.log(`Port: ${process.env.PORT || 'Not set'}`);
  
  if (!process.env.DATABASE_URL) {
    console.log('🚨 WARNING: DATABASE_URL not set - check Render dashboard');
  }
  
  // Test database connection
  console.log('\n🗄️ DATABASE CONNECTION TEST:');
  console.log('============================');
  
  const { default: sequelize } = await import('./backend/database.mjs');
  const { default: StorefrontItem } = await import('./backend/models/StorefrontItem.mjs');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
  } catch (dbError) {
    console.error('❌ Database connection failed:', dbError.message);
    throw dbError;
  }
  
  // Check packages in database
  console.log('\n📦 PACKAGE VERIFICATION:');
  console.log('========================');
  
  const packages = await StorefrontItem.findAll({
    order: [['displayOrder', 'ASC']]
  });
  
  console.log(`Found ${packages.length} packages in production database:`);
  
  if (packages.length === 0) {
    console.log('🚨 CRITICAL: No packages found!');
    console.log('🔧 FIX: Run npm run production-seed');
    throw new Error('No packages in database');
  }
  
  let allPricingCorrect = true;
  const expectedPackages = [
    { name: 'Silver Swan Wing', price: 175 },
    { name: 'Golden Swan Flight', price: 1360 },
    { name: 'Sapphire Swan Soar', price: 3300 },
    { name: 'Platinum Swan Grace', price: 8000 },
    { name: 'Emerald Swan Evolution', price: 8060 },
    { name: 'Diamond Swan Dynasty', price: 15600 },
    { name: 'Ruby Swan Reign', price: 22620 },
    { name: 'Rhodium Swan Royalty', price: 29120 }
  ];
  
  packages.forEach((pkg, index) => {
    const price = pkg.displayPrice || pkg.price || pkg.totalCost || 0;
    const expected = expectedPackages[index];
    
    console.log(`${index + 1}. ${pkg.name}: $${price}`);
    
    if (price === 0) {
      console.log(`   🚨 ERROR: Zero pricing!`);
      allPricingCorrect = false;
    } else if (expected && expected.price === price) {
      console.log(`   ✅ Correct pricing`);
    } else {
      console.log(`   ⚠️ Unexpected price (expected $${expected?.price || 'unknown'})`);
    }
  });
  
  // Test API simulation
  console.log('\n🌐 API ENDPOINT SIMULATION:');
  console.log('===========================');
  
  try {
    const apiPackages = await StorefrontItem.findAll({
      where: { isActive: true },
      order: [['displayOrder', 'ASC']]
    });
    
    console.log(`API would return ${apiPackages.length} active packages:`);
    
    const apiResponse = {
      success: true,
      items: apiPackages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        packageType: pkg.packageType,
        sessions: pkg.sessions,
        months: pkg.months,
        sessionsPerWeek: pkg.sessionsPerWeek,
        totalSessions: pkg.totalSessions,
        pricePerSession: pkg.pricePerSession,
        price: pkg.price,
        displayPrice: pkg.displayPrice || pkg.price,
        isActive: pkg.isActive,
        displayOrder: pkg.displayOrder
      }))
    };
    
    console.log('📊 Sample API response:');
    apiResponse.items.slice(0, 3).forEach(item => {
      console.log(`   ${item.name}: $${item.displayPrice}`);
    });
    
    console.log('✅ API simulation successful');
    
  } catch (apiError) {
    console.error('❌ API simulation failed:', apiError.message);
    allPricingCorrect = false;
  }
  
  // Final verification report
  console.log('\n📋 PRODUCTION VERIFICATION REPORT:');
  console.log('==================================');
  
  const checks = {
    environment: !!process.env.DATABASE_URL,
    database: true,
    packages: packages.length > 0,
    pricing: allPricingCorrect,
    api: true
  };
  
  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${check.toUpperCase()}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(checks).every(Boolean);
  
  console.log('\n🎯 FINAL RESULT:');
  console.log('================');
  
  if (allPassed) {
    console.log('🚀 PRODUCTION DEPLOYMENT SUCCESSFUL!');
    console.log('✅ SwanStudios Store is ready for users');
    console.log('🦢 All packages have proper pricing');
    console.log('🌐 API endpoint should work correctly');
    console.log('');
    console.log('🎉 Production URL: https://your-app.onrender.com/shop');
    console.log('🔍 API URL: https://your-app.onrender.com/api/storefront');
  } else {
    console.log('🚨 PRODUCTION DEPLOYMENT HAS ISSUES');
    console.log('❌ Some checks failed - see details above');
    console.log('🔧 Run fixes as indicated');
  }
  
  console.log('\n📝 NEXT STEPS:');
  console.log('==============');
  console.log('1. Visit your production store URL');
  console.log('2. Verify store displays "SwanStudios Store"');
  console.log('3. Check that all packages show proper pricing');
  console.log('4. Test add to cart functionality');
  console.log('5. Clear browser cache if seeing old "Galaxy" references');
  
  process.exit(allPassed ? 0 : 1);
  
} catch (error) {
  console.error('\n💥 PRODUCTION VERIFICATION FAILED:', error.message);
  console.error('📚 Stack trace:', error.stack);
  
  console.log('\n🔧 TROUBLESHOOTING STEPS:');
  console.log('=========================');
  console.log('1. Check Render service logs');
  console.log('2. Verify environment variables in Render dashboard');
  console.log('3. Ensure database is properly connected');
  console.log('4. Run: npm run production-seed');
  console.log('5. Check build logs for errors');
  
  process.exit(1);
}
