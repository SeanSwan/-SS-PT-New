/**
 * RENDER PRODUCTION DEBUG
 * ======================
 * Debug SwanStudios Store issues on Render production environment
 */

console.log('🚀 RENDER PRODUCTION SWANSTUDIOS STORE DEBUG');
console.log('============================================');

try {
  // Import database connection (should use Render's DATABASE_URL)
  console.log('📂 Connecting to Render production database...');
  const { default: sequelize } = await import('./backend/database.mjs');
  const { default: StorefrontItem } = await import('./backend/models/StorefrontItem.mjs');
  
  // Test database connection
  try {
    await sequelize.authenticate();
    console.log('✅ Render database connection successful');
  } catch (dbError) {
    console.error('❌ Render database connection failed:', dbError.message);
    console.log('🔧 Check your DATABASE_URL environment variable in Render dashboard');
    process.exit(1);
  }
  
  // Check current packages in production database
  console.log('\n📦 CHECKING RENDER PRODUCTION DATABASE:');
  console.log('=======================================');
  
  const packages = await StorefrontItem.findAll({
    order: [['id', 'ASC']]
  });
  
  console.log(`Found ${packages.length} packages in Render database:`);
  
  if (packages.length === 0) {
    console.log('🚨 CRITICAL: No packages in production database!');
    console.log('🎯 SOLUTION: Need to seed the production database');
  } else {
    let hasZeroPricing = false;
    
    packages.forEach((pkg, index) => {
      const price = pkg.displayPrice || pkg.price || pkg.totalCost || 0;
      console.log(`${index + 1}. ${pkg.name}: $${price}`);
      
      if (price === 0) {
        hasZeroPricing = true;
        console.log(`   ⚠️ ZERO PRICING DETECTED!`);
      }
    });
    
    if (hasZeroPricing) {
      console.log('\n🚨 ZERO PRICING ISSUE CONFIRMED IN PRODUCTION');
    } else {
      console.log('\n✅ All packages have proper pricing in database');
    }
  }
  
  // Test the storefront API endpoint structure
  console.log('\n🌐 TESTING STOREFRONT API LOGIC:');
  console.log('================================');
  
  try {
    const apiTestPackages = await StorefrontItem.findAll({
      where: { isActive: true },
      order: [['displayOrder', 'ASC']]
    });
    
    console.log(`API would return ${apiTestPackages.length} active packages:`);
    apiTestPackages.forEach(pkg => {
      const price = pkg.displayPrice || pkg.price || pkg.totalCost || 0;
      console.log(`- ${pkg.name}: $${price} (Active: ${pkg.isActive})`);
    });
    
  } catch (apiError) {
    console.error('❌ API logic test failed:', apiError.message);
  }
  
  // Environment check
  console.log('\n⚙️ RENDER ENVIRONMENT CHECK:');
  console.log('============================');
  console.log(`DATABASE_URL set: ${!!process.env.DATABASE_URL}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`PORT: ${process.env.PORT || 'not set'}`);
  
  // Render-specific recommendations
  console.log('\n🎯 RENDER PRODUCTION NEXT STEPS:');
  console.log('=================================');
  
  if (packages.length === 0) {
    console.log('1. 🚨 CRITICAL: Seed production database immediately');
    console.log('   Run: npm run seed-production (if you have this script)');
    console.log('   Or manually run seeder on Render');
  } else {
    console.log('1. ✅ Database has packages');
  }
  
  console.log('2. 🌐 Check Render service logs for API errors');
  console.log('3. 🔍 Test API endpoint directly: https://your-app.onrender.com/api/storefront');
  console.log('4. 🧹 Clear browser cache (production URLs are different)');
  console.log('5. 📱 Check if frontend is calling correct production API URL');
  
  console.log('\n🚀 RENDER DEPLOYMENT CHECKLIST:');
  console.log('===============================');
  console.log('✅ Database connected');
  console.log(`${packages.length > 0 ? '✅' : '❌'} Packages in database`);
  console.log('⏳ API endpoint test (check Render logs)');
  console.log('⏳ Frontend API calls (check browser network tab)');
  
  process.exit(0);
  
} catch (error) {
  console.error('💥 Render production debug failed:', error.message);
  console.error('Full error:', error.stack);
  console.log('\n🔧 RENDER TROUBLESHOOTING:');
  console.log('1. Check Render dashboard for deployment errors');
  console.log('2. Verify DATABASE_URL environment variable');
  console.log('3. Check if migrations ran successfully');
  console.log('4. Verify build logs in Render dashboard');
  process.exit(1);
}
