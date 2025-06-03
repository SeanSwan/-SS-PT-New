/**
 * CHECK STORE ISSUES - Debug Script
 * ================================
 * Investigates both the "Galaxy Ecommerce Store" display issue and $0 pricing
 */

console.log('🔍 CHECKING SWANSTUDIOS STORE ISSUES');
console.log('=====================================');

try {
  // Import database connection
  console.log('📂 Importing database...');
  const { default: sequelize } = await import('./backend/database.mjs');
  const { default: StorefrontItem } = await import('./backend/models/StorefrontItem.mjs');
  
  console.log('✅ Database connection established');
  
  // Check what's actually in the database
  console.log('\n📊 CHECKING DATABASE CONTENTS:');
  console.log('===============================');
  
  const packages = await StorefrontItem.findAll({
    order: [['displayOrder', 'ASC']]
  });
  
  console.log(`Found ${packages.length} packages in database:`);
  console.log('');
  
  packages.forEach((pkg, index) => {
    console.log(`${index + 1}. ${pkg.name}`);
    console.log(`   ID: ${pkg.id}`);
    console.log(`   Package Type: ${pkg.packageType}`);
    console.log(`   Price: $${pkg.price || 0}`);
    console.log(`   Total Cost: $${pkg.totalCost || 0}`);
    console.log(`   Display Price: $${pkg.displayPrice || 0}`);
    console.log(`   Price Per Session: $${pkg.pricePerSession || 0}`);
    console.log(`   Sessions: ${pkg.sessions || 'N/A'}`);
    console.log(`   Total Sessions: ${pkg.totalSessions || 'N/A'}`);
    console.log(`   Active: ${pkg.isActive}`);
    console.log(`   Display Order: ${pkg.displayOrder || 'N/A'}`);
    console.log('');
  });
  
  // Check for zero prices
  const zeroPricePackages = packages.filter(pkg => 
    (pkg.price || 0) === 0 && 
    (pkg.totalCost || 0) === 0 && 
    (pkg.displayPrice || 0) === 0
  );
  
  if (zeroPricePackages.length > 0) {
    console.log('🚨 FOUND PACKAGES WITH $0 PRICING:');
    console.log('==================================');
    zeroPricePackages.forEach(pkg => {
      console.log(`- ${pkg.name} (ID: ${pkg.id})`);
    });
    console.log('');
  } else {
    console.log('✅ NO $0 PRICING ISSUES FOUND');
    console.log('');
  }
  
  // Check for any packages that might still have "Galaxy" in the name
  const galaxyPackages = packages.filter(pkg => 
    pkg.name.toLowerCase().includes('galaxy') || 
    (pkg.description && pkg.description.toLowerCase().includes('galaxy'))
  );
  
  if (galaxyPackages.length > 0) {
    console.log('🌌 FOUND PACKAGES WITH "GALAXY" REFERENCES:');
    console.log('==========================================');
    galaxyPackages.forEach(pkg => {
      console.log(`- ${pkg.name}: "${pkg.description}"`);
    });
    console.log('');
  } else {
    console.log('✅ NO "GALAXY" REFERENCES IN DATABASE');
    console.log('');
  }
  
  // Test storefront API endpoint
  console.log('🌐 TESTING STOREFRONT API ENDPOINT:');
  console.log('===================================');
  
  try {
    // Simple test query to see what the API would return
    const apiResponse = await StorefrontItem.findAll({
      where: { isActive: true },
      order: [['displayOrder', 'ASC']]
    });
    
    console.log(`API would return ${apiResponse.length} active packages:`);
    apiResponse.forEach(pkg => {
      console.log(`- ${pkg.name}: $${pkg.displayPrice || pkg.price || pkg.totalCost || 0}`);
    });
    console.log('');
    
  } catch (apiError) {
    console.error('❌ API test failed:', apiError.message);
  }
  
  // Check database schema
  console.log('📋 CHECKING DATABASE SCHEMA:');
  console.log('============================');
  
  const [results] = await sequelize.query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'storefront_items' 
    AND table_schema = current_schema()
    ORDER BY ordinal_position
  `);
  
  console.log('StorefrontItem table structure:');
  results.forEach(col => {
    console.log(`- ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
  });
  console.log('');
  
  // Summary and recommendations
  console.log('📋 ISSUE ANALYSIS SUMMARY:');
  console.log('==========================');
  
  if (packages.length === 0) {
    console.log('🚨 CRITICAL: No packages found in database!');
    console.log('   Recommendation: Run package seeder immediately');
  } else if (zeroPricePackages.length > 0) {
    console.log('🚨 PRICING ISSUE: Some packages have $0 pricing');
    console.log('   Recommendation: Re-run package seeder or fix pricing manually');
  } else {
    console.log('✅ DATABASE PRICING: All packages have proper pricing');
  }
  
  console.log('');
  console.log('🌐 FRONTEND DISPLAY ISSUE ("Galaxy Ecommerce Store"):');
  console.log('   This is likely a browser caching issue.');
  console.log('   Recommendation: Clear browser cache, or force refresh (Ctrl+F5)');
  console.log('');
  
  console.log('🎯 NEXT STEPS:');
  console.log('==============');
  console.log('1. Clear browser cache to fix "Galaxy Ecommerce Store" display');
  console.log('2. If pricing shows $0, run: node backend/seeders/luxury-swan-packages-production.mjs');
  console.log('3. Verify API endpoint returns correct data');
  console.log('4. Check network tab in browser dev tools for API responses');
  console.log('');
  
  process.exit(0);
  
} catch (error) {
  console.error('💥 Error checking store issues:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}
