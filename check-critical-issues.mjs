// MANUAL P0 ISSUE CHECKER
// Run this to see which specific issues need fixing

import dotenv from 'dotenv';
import sequelize from './backend/database.mjs';
import { QueryTypes } from 'sequelize';

dotenv.config();

const checkCriticalIssues = async () => {
  try {
    console.log('🔍 CRITICAL P0 ISSUE CHECKER');
    console.log('============================');
    
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    let issuesFound = 0;
    
    // Issue 1: Users table case-sensitivity
    console.log('🔍 ISSUE 1: Users table case-sensitivity');
    console.log('----------------------------------------');
    
    try {
      const usersQuery = await sequelize.query(`SELECT COUNT(*) as count FROM "Users";`);
      console.log(`✅ "Users" table accessible - ${usersQuery[0][0].count} users found`);
    } catch (error) {
      console.log('❌ "Users" table NOT accessible:', error.message);
      issuesFound++;
      
      // Check if lowercase users exists
      try {
        const lowercaseUsers = await sequelize.query(`SELECT COUNT(*) as count FROM users;`);
        console.log(`ℹ️ Found "users" (lowercase) table with ${lowercaseUsers[0][0].count} users`);
        console.log('🔧 FIX NEEDED: Create alias/view for "Users" -> "users"');
      } catch (lowerError) {
        console.log('❌ No users table found at all!');
      }
    }
    
    // Issue 2: Missing checkoutSessionId column
    console.log('\n🔍 ISSUE 2: Missing checkoutSessionId column');
    console.log('--------------------------------------------');
    
    const checkoutColumn = await sequelize.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'shopping_carts' AND column_name = 'checkoutSessionId';
    `, { type: QueryTypes.SELECT });
    
    if (checkoutColumn.length > 0) {
      console.log('✅ checkoutSessionId column exists');
    } else {
      console.log('❌ checkoutSessionId column MISSING');
      console.log('🔧 FIX NEEDED: Add missing columns to shopping_carts table');
      issuesFound++;
    }
    
    // Issue 3: Model loading test
    console.log('\n🔍 ISSUE 3: Model loading test');
    console.log('------------------------------');
    
    try {
      const setupAssociations = await import('./backend/setupAssociations.mjs');
      const models = await setupAssociations.default();
      const modelCount = Object.keys(models || {}).length;
      
      if (modelCount >= 40) {
        console.log(`✅ Model loading good - ${modelCount} models loaded`);
      } else {
        console.log(`❌ Model loading issue - only ${modelCount} models loaded (expected 40+)`);
        console.log('🔧 FIX NEEDED: Investigate model import/association issues');
        issuesFound++;
      }
    } catch (error) {
      console.log('❌ Model loading FAILED:', error.message);
      issuesFound++;
    }
    
    // Issue 4: Cart association test
    console.log('\n🔍 ISSUE 4: Cart association test');
    console.log('---------------------------------');
    
    try {
      // Try to import models directly
      const CartItem = await import('./backend/models/CartItem.mjs');
      const ShoppingCart = await import('./backend/models/ShoppingCart.mjs');
      console.log('✅ Cart models import successfully');
      
      // Note: Can't test associations without full setup
      console.log('ℹ️ Association test requires full server setup');
    } catch (error) {
      console.log('❌ Cart model import FAILED:', error.message);
      issuesFound++;
    }
    
    // Issue 5: Pricing check
    console.log('\n🔍 ISSUE 5: Pricing check');
    console.log('-------------------------');
    
    try {
      const pricingQuery = await sequelize.query(`
        SELECT name, price, "totalCost" FROM storefront_items 
        WHERE (price = 0 OR price IS NULL) AND ("totalCost" = 0 OR "totalCost" IS NULL);
      `, { type: QueryTypes.SELECT });
      
      if (pricingQuery.length === 0) {
        console.log('✅ All packages have pricing');
      } else {
        console.log(`❌ ${pricingQuery.length} packages have $0 pricing:`);
        pricingQuery.forEach(item => console.log(`  - ${item.name}`));
        console.log('🔧 FIX NEEDED: Re-seed storefront items with correct pricing');
        issuesFound++;
      }
    } catch (error) {
      console.log('❌ Pricing check FAILED:', error.message);
      console.log('🔧 FIX NEEDED: Ensure storefront_items table exists and has data');
      issuesFound++;
    }
    
    // Summary
    console.log('\n🎯 CRITICAL ISSUES SUMMARY:');
    console.log('===========================');
    
    if (issuesFound === 0) {
      console.log('🎉 NO CRITICAL ISSUES FOUND!');
      console.log('   Your system should be working correctly');
    } else {
      console.log(`🚨 ${issuesFound} CRITICAL ISSUES FOUND`);
      console.log('\n🔧 RECOMMENDED FIXES:');
      console.log('1. Run: node fix-users-case-sensitivity.mjs');
      console.log('2. Run: node fix-missing-columns.mjs');
      console.log('3. Run: node emergency-pricing-fix.mjs');
      console.log('4. Restart backend and check model loading');
    }
    
    return issuesFound === 0;
    
  } catch (error) {
    console.error('💥 Critical error during check:', error.message);
    return false;
  } finally {
    await sequelize.close();
  }
};

checkCriticalIssues().then(success => {
  console.log(`\n🎯 SYSTEM STATUS: ${success ? 'HEALTHY' : 'NEEDS FIXES'}`);
});
