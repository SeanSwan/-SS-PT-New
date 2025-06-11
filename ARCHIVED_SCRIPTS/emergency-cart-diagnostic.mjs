// Emergency Cart & Pricing Diagnostic Tool
// This script will verify the current state of pricing and cart functionality

import dotenv from 'dotenv';
import sequelize from './backend/database.mjs';
import StorefrontItem from './backend/models/StorefrontItem.mjs';
import ShoppingCart from './backend/models/ShoppingCart.mjs';
import CartItem from './backend/models/CartItem.mjs';
import User from './backend/models/User.mjs';
import setupAssociations from './backend/setupAssociations.mjs';

dotenv.config();

const runDiagnostics = async () => {
  try {
    console.log('🔍 EMERGENCY CART & PRICING DIAGNOSTICS');
    console.log('=========================================');
    
    // Setup associations
    console.log('\n📋 Setting up model associations...');
    await setupAssociations();
    
    // Test database connection
    console.log('\n🔗 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Check StorefrontItem pricing
    console.log('\n💰 CHECKING STOREFRONT ITEM PRICING:');
    console.log('=====================================');
    
    const packages = await StorefrontItem.findAll({
      attributes: ['id', 'name', 'price', 'totalCost', 'pricePerSession', 'sessions', 'packageType'],
      order: [['id', 'ASC']]
    });
    
    if (packages.length === 0) {
      console.log('❌ NO PACKAGES FOUND IN DATABASE!');
      console.log('   Run: npm run production-seed');
      return;
    }
    
    packages.forEach(pkg => {
      const price = pkg.price || 0;
      const totalCost = pkg.totalCost || 0;
      const pricePerSession = pkg.pricePerSession || 0;
      
      console.log(`📦 ${pkg.name}:`);
      console.log(`   ID: ${pkg.id}`);
      console.log(`   Price: $${price}`);
      console.log(`   Total Cost: $${totalCost}`);
      console.log(`   Price Per Session: $${pricePerSession}`);
      console.log(`   Sessions: ${pkg.sessions}`);
      console.log(`   Type: ${pkg.packageType}`);
      
      if (price === 0 && totalCost === 0) {
        console.log('   ❌ ZERO PRICING DETECTED!');
      } else {
        console.log('   ✅ Has pricing');
      }
      console.log('');
    });
    
    // Test cart associations
    console.log('\n🛒 TESTING CART ASSOCIATIONS:');
    console.log('==============================');
    
    try {
      // Test association by doing a sample query
      const testCart = await ShoppingCart.findOne({
        include: [{
          model: CartItem,
          as: 'cartItems',
          include: [{
            model: StorefrontItem,
            as: 'storefrontItem'
          }]
        }]
      });
      
      console.log('✅ Cart -> CartItem association working');
      console.log('✅ CartItem -> StorefrontItem association working');
      
      // Test the reverse association that was causing 500 errors
      const testCartItem = await CartItem.findOne({
        include: [{
          model: ShoppingCart,
          as: 'cart'
        }]
      });
      
      console.log('✅ CartItem -> ShoppingCart (as: "cart") association working');
      
    } catch (assocError) {
      console.log('❌ ASSOCIATION ERROR:', assocError.message);
      
      if (assocError.message.includes('shoppingCart')) {
        console.log('❌ FOUND THE PROBLEM: Still using "shoppingCart" alias!');
        console.log('   Backend needs restart to apply association fixes');
      }
    }
    
    // Check user count
    console.log('\n👥 CHECKING USERS:');
    console.log('==================');
    
    const userCount = await User.count();
    console.log(`Total users: ${userCount}`);
    
    const adminUser = await User.findOne({ where: { role: 'admin' } });
    if (adminUser) {
      console.log(`✅ Found admin user: ${adminUser.username}`);
    } else {
      console.log('❌ No admin user found');
    }
    
    console.log('\n🎯 SUMMARY:');
    console.log('===========');
    console.log(`📦 Packages in database: ${packages.length}`);
    
    const zeroPrice = packages.filter(p => (p.price || 0) === 0 && (p.totalCost || 0) === 0);
    if (zeroPrice.length > 0) {
      console.log(`❌ Packages with $0 pricing: ${zeroPrice.length}`);
      console.log('   ACTION NEEDED: Run production seeder');
    } else {
      console.log('✅ All packages have pricing');
    }
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('===============');
    console.log('1. Run: EMERGENCY-RESTART-BACKEND.bat');
    console.log('2. If pricing still $0, run: npm run production-seed');
    console.log('3. Test cart functionality after restart');
    
  } catch (error) {
    console.error('💥 Diagnostic Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
    console.log('\n🏁 Diagnostics complete');
  }
};

runDiagnostics();
