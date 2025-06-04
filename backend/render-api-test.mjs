#!/usr/bin/env node

/**
 * 🔍 RENDER SERVER QUICK API TEST
 * Tests the API and database directly on the Render server
 */

console.log('🔍 RENDER SERVER API & DATABASE TEST\n');

try {
  // Import database and models
  console.log('📂 Loading database connection...');
  const { default: sequelize } = await import('./database.mjs');
  const { default: StorefrontItem } = await import('./models/StorefrontItem.mjs');
  
  // Test database connection
  console.log('🔌 Testing database connection...');
  await sequelize.authenticate();
  console.log('✅ Database connected successfully');
  
  // Check current packages in database
  console.log('\n📦 Checking current packages in database...');
  const packages = await StorefrontItem.findAll({
    order: [['id', 'ASC']]
  });
  
  console.log(`📊 Found ${packages.length} packages in database`);
  
  if (packages.length === 0) {
    console.log('🚨 NO PACKAGES FOUND IN DATABASE!');
    console.log('💡 Need to run: npm run production-seed');
  } else {
    console.log('\n💰 CURRENT PACKAGE PRICING:');
    console.log('=============================');
    
    let hasZeroPricing = false;
    
    packages.forEach((pkg, index) => {
      const price = pkg.price || pkg.totalCost || pkg.displayPrice || 0;
      const perSession = pkg.pricePerSession || 0;
      
      console.log(`${index + 1}. ${pkg.name}`);
      console.log(`   💵 Total: $${price}`);
      console.log(`   🎯 Per Session: $${perSession}`);
      console.log(`   📊 Type: ${pkg.packageType}`);
      console.log(`   🔢 Sessions: ${pkg.sessions || pkg.totalSessions || 'N/A'}`);
      
      if (price === 0) {
        console.log(`   🚨 ZERO PRICING DETECTED!`);
        hasZeroPricing = true;
      } else {
        console.log(`   ✅ Pricing OK`);
      }
      console.log('');
    });
    
    // Summary
    console.log('\n📋 SUMMARY:');
    if (hasZeroPricing) {
      console.log('🚨 ISSUE: Some packages have $0 pricing');
      console.log('🔧 FIX: Run npm run production-seed');
    } else {
      console.log('✅ All packages have valid pricing');
      console.log('🎯 Database pricing is correct');
    }
  }
  
  // Test API endpoint simulation
  console.log('\n🌐 Testing API endpoint logic...');
  
  // Simulate the API call
  const apiResponse = packages.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
    totalCost: item.totalCost || item.price,
    displayPrice: item.price || item.totalCost,
    pricePerSession: item.pricePerSession,
    price: item.price || item.totalCost,
    packageType: item.packageType,
    sessions: item.sessions,
    months: item.months,
    sessionsPerWeek: item.sessionsPerWeek,
    totalSessions: item.totalSessions,
    isActive: item.isActive,
    displayOrder: item.displayOrder
  }));
  
  console.log(`📡 API would return ${apiResponse.length} items`);
  
  // Check if API response has valid pricing
  const apiZeroPricing = apiResponse.filter(item => {
    const price = item.price || item.totalCost || item.displayPrice;
    return !price || price === 0;
  });
  
  if (apiZeroPricing.length > 0) {
    console.log(`🚨 API ISSUE: ${apiZeroPricing.length} items would have $0 pricing`);
  } else {
    console.log('✅ API response would have valid pricing');
  }
  
  console.log('\n🎯 NEXT STEPS:');
  if (packages.length === 0) {
    console.log('1. 🏗️  Run: npm run production-seed');
    console.log('2. 🔄 Test again after seeding');
  } else if (hasZeroPricing || apiZeroPricing.length > 0) {
    console.log('1. 🏗️  Run: npm run production-seed');
    console.log('2. 🧹 Clear existing data and reseed');
  } else {
    console.log('1. ✅ Database is good');
    console.log('2. 🧹 Issue is likely browser cache');
    console.log('3. 🔄 Tell user to clear browser cache');
  }
  
  process.exit(0);
  
} catch (error) {
  console.error('💥 Test failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
