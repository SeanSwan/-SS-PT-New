#!/usr/bin/env node

/**
 * Cart Diagnostic Script
 * ======================
 * This script diagnoses cart functionality and database state
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function diagnoseCart() {
  try {
    console.log('🔍 CART DIAGNOSTIC SCRIPT');
    console.log('=========================');
    console.log('Diagnosing SwanStudios cart functionality...');
    console.log('');
    
    // Test database connection
    console.log('🔗 Testing database connection...');
    const { default: sequelize } = await import('./backend/database.mjs');
    
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Check StorefrontItems
    console.log('\n📦 Checking StorefrontItems...');
    const { default: StorefrontItem } = await import('./backend/models/StorefrontItem.mjs');
    
    const packages = await StorefrontItem.findAll({
      attributes: ['id', 'name', 'price', 'sessions', 'isActive'],
      order: [['id', 'ASC']]
    });
    
    console.log(`Found ${packages.length} packages in database:`);
    
    if (packages.length === 0) {
      console.log('❌ NO PACKAGES FOUND IN DATABASE!');
      console.log('   ACTION: Run swan.bat to create luxury swan packages');
      return { success: false, issue: 'no_packages' };
    }
    
    console.log('\n🦢 SwanStudios Package Analysis:');
    packages.forEach(pkg => {
      const status = pkg.isActive ? '✅' : '❌';
      const isSwanBranded = pkg.name.includes('Swan');
      const brandIcon = isSwanBranded ? '🦢' : '⚠️';
      console.log(`   ${status} ${brandIcon} ID ${pkg.id}: ${pkg.name} - ${pkg.price} (${pkg.sessions} sessions)`);
    });
    
    // Check for swan branding
    const swanPackages = packages.filter(p => p.name.includes('Swan'));
    console.log(`\n🦢 Swan-branded packages: ${swanPackages.length}/${packages.length}`);
    
    if (swanPackages.length === 0) {
      console.log('⚠️  WARNING: No swan-branded packages found');
      console.log('   FIX: Run swan.bat to create proper luxury swan collection');
    } else if (swanPackages.length < 8) {
      console.log('⚠️  WARNING: Incomplete swan collection');
      console.log('   FIX: Run swan.bat to complete luxury swan collection');
    }
    
    // Check for critical package IDs
    console.log('\n🎯 Checking critical package IDs (1-4)...');
    const criticalIds = [1, 2, 3, 4];
    let missingIds = [];
    
    for (const id of criticalIds) {
      const pkg = packages.find(p => p.id === id);
      if (pkg && pkg.isActive) {
        console.log(`   ✅ Package ID ${id}: ${pkg.name}`);
      } else {
        console.log(`   ❌ Package ID ${id}: MISSING OR INACTIVE`);
        missingIds.push(id);
      }
    }
    
    // Test cart API endpoints (if possible)
    console.log('\n🛒 Testing cart API availability...');
    
    try {
      // Try to test a simple package lookup
      const testPackage = await StorefrontItem.findByPk(1);
      if (testPackage) {
        console.log('✅ Package lookup working');
      } else {
        console.log('❌ Package ID 1 not found');
      }
    } catch (apiError) {
      console.log(`❌ API test failed: ${apiError.message}`);
    }
    
    await sequelize.close();
    
    // Summary
    console.log('\n🎯 DIAGNOSTIC SUMMARY:');
    console.log('======================');
    console.log(`📊 Total packages: ${packages.length}`);
    console.log(`✅ Active packages: ${packages.filter(p => p.isActive).length}`);
    console.log(`❌ Missing critical IDs: ${missingIds.length > 0 ? missingIds.join(', ') : 'None'}`);
    
    if (packages.length === 0) {
      console.log('\n🚨 CRITICAL: No packages in database');
      console.log('   FIX: Run database.bat to create packages');
      return { success: false, issue: 'no_packages' };
    }
    
    if (missingIds.length > 0) {
      console.log('\n⚠️  WARNING: Missing critical package IDs');
      console.log('   FIX: Run swan.bat to create missing swan packages');
      return { success: false, issue: 'missing_ids' };
    }
    
    console.log('\n🎉 SWANSTUDIOS CART DATABASE APPEARS HEALTHY!');
    console.log('');
    console.log('🧪 TO TEST SWAN COLLECTION CART FUNCTIONALITY:');
    console.log('1. Visit: https://ss-pt-new.onrender.com');
    console.log('2. Navigate to storefront');
    console.log('3. Look for luxury swan-themed package names');
    console.log('4. Try adding "Silver Swan Wing" to cart');
    console.log('5. Check for "Training package not found" errors');
    
    return { 
      success: true, 
      totalPackages: packages.length, 
      activePackages: packages.filter(p => p.isActive).length,
      missingIds: missingIds 
    };
    
  } catch (error) {
    console.error('\n💥 DIAGNOSTIC FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Check DATABASE_URL in .env');
    console.log('2. Verify database is accessible');
    console.log('3. Run swan.bat to create swan packages');
    console.log('4. Run database.bat as fallback');
    console.log('5. Check backend server logs');
    
    return { success: false, error: error.message };
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  diagnoseCart()
    .then((result) => {
      if (result.success) {
        console.log(`\n🔍 DIAGNOSTIC COMPLETE - Cart appears healthy!`);
        process.exit(0);
      } else {
        console.log('\n💥 DIAGNOSTIC FOUND ISSUES - See above for fixes');
        process.exit(1);
      }
    });
}

export default diagnoseCart;
