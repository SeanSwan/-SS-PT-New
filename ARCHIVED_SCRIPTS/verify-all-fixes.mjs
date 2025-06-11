// Final Verification Script
// Checks if all critical issues have been resolved

import dotenv from 'dotenv';
import sequelize from './backend/database.mjs';
import StorefrontItem from './backend/models/StorefrontItem.mjs';
import ShoppingCart from './backend/models/ShoppingCart.mjs';
import CartItem from './backend/models/CartItem.mjs';
import setupAssociations from './backend/setupAssociations.mjs';
import { QueryTypes } from 'sequelize';

dotenv.config();

const verifyAllFixes = async () => {
  try {
    console.log('✅ VERIFICATION: ALL CRITICAL FIXES');
    console.log('====================================');
    
    await setupAssociations();
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // 1. Check Users table
    console.log('\n👥 CHECKING USERS TABLE:');
    const usersTable = await sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users';
    `, { type: QueryTypes.SELECT });
    
    if (usersTable.length > 0) {
      console.log('✅ Users table exists (lowercase)');
    } else {
      console.log('❌ Users table missing');
      return false;
    }
    
    // 2. Check critical columns
    console.log('\n🏗️ CHECKING CRITICAL COLUMNS:');
    const columns = await sequelize.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'shopping_carts' AND column_name = 'checkoutSessionId';
    `, { type: QueryTypes.SELECT });
    
    if (columns.length > 0) {
      console.log('✅ checkoutSessionId column exists');
    } else {
      console.log('❌ checkoutSessionId column missing');
      return false;
    }
    
    // 3. Check pricing
    console.log('\n💰 CHECKING PRICING:');
    const packages = await StorefrontItem.findAll({
      attributes: ['id', 'name', 'price', 'totalCost']
    });
    
    const zeroPrice = packages.filter(p => (p.price || 0) === 0 && (p.totalCost || 0) === 0);
    if (zeroPrice.length === 0) {
      console.log(`✅ All ${packages.length} packages have pricing`);
    } else {
      console.log(`❌ ${zeroPrice.length} packages still have $0 pricing`);
      return false;
    }
    
    // 4. Test cart associations
    console.log('\n🛒 TESTING CART ASSOCIATIONS:');
    try {
      // Test the problematic association that was causing 500 errors
      const testQuery = await CartItem.findOne({
        include: [{
          model: ShoppingCart,
          as: 'cart'
        }]
      });
      console.log('✅ CartItem -> ShoppingCart (as: "cart") association working');
    } catch (error) {
      console.log('❌ Cart association error:', error.message);
      return false;
    }
    
    // 5. Check foreign key constraints
    console.log('\n🔗 CHECKING FOREIGN KEY CONSTRAINTS:');
    const constraints = await sequelize.query(`
      SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE constraint_type = 'FOREIGN KEY' AND tc.table_name = 'shopping_carts';
    `, { type: QueryTypes.SELECT });
    
    const hasUserFK = constraints.some(c => c.foreign_table_name === 'users');
    if (hasUserFK) {
      console.log('✅ shopping_carts -> users foreign key exists');
    } else {
      console.log('❌ shopping_carts -> users foreign key missing');
      return false;
    }
    
    console.log('\n🎉 ALL CRITICAL FIXES VERIFIED SUCCESSFULLY!');
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Test cart functionality in browser');
    console.log('2. Verify pricing shows real values (not $0)');
    console.log('3. Try adding items to cart');
    console.log('4. Check for 500 errors in browser console');
    
    return true;
    
  } catch (error) {
    console.error('💥 Verification Error:', error.message);
    return false;
  } finally {
    await sequelize.close();
  }
};

verifyAllFixes().then(success => {
  console.log(`\n🎯 VERIFICATION ${success ? 'PASSED' : 'FAILED'}`);
  process.exit(success ? 0 : 1);
});
