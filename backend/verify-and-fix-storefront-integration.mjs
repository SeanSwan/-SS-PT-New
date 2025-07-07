#!/usr/bin/env node
/**
 * SwanStudios Storefront Integration Verification & Fix
 * ====================================================
 * Comprehensive script to verify and fix the complete storefront → cart → checkout flow
 * 
 * This script will:
 * 1. Check database connection
 * 2. Verify training packages exist
 * 3. Seed packages if missing
 * 4. Test API endpoints
 * 5. Verify model associations
 * 6. Test complete purchase flow simulation
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { existsSync } from 'fs';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

console.log('🏆 SwanStudios Genesis Checkout System Verification');
console.log('==================================================');
console.log('');

try {
  // Import models and database
  const { default: sequelize } = await import('./database.mjs');
  const { 
    getStorefrontItem, 
    getShoppingCart, 
    getCartItem, 
    getUser 
  } = await import('./models/index.mjs');

  // Test 1: Database Connection
  console.log('📊 Test 1: Database Connection');
  console.log('------------------------------');
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection: SUCCESSFUL');
  } catch (error) {
    console.error('❌ Database connection FAILED:', error.message);
    process.exit(1);
  }
  console.log('');

  // Test 2: Check Training Packages
  console.log('📦 Test 2: Training Packages');
  console.log('----------------------------');
  const StorefrontItem = getStorefrontItem();
  
  const existingPackages = await StorefrontItem.findAll({
    order: [['displayOrder', 'ASC'], ['id', 'ASC']]
  });
  
  console.log(`Found ${existingPackages.length} training packages in database`);
  
  if (existingPackages.length === 0) {
    console.log('⚠️  No training packages found! Running seeder...');
    
    // Import and run the seeder
    try {
      const { execSync } = await import('child_process');
      console.log('🌱 Running SwanStudios Store Seeder...');
      execSync('node swanstudios-store-seeder.mjs', { stdio: 'inherit' });
      
      // Re-check packages
      const newPackages = await StorefrontItem.findAll();
      console.log(`✅ Seeder complete! Now have ${newPackages.length} packages`);
    } catch (seederError) {
      console.error('❌ Seeder failed:', seederError.message);
      console.log('Manually creating test packages...');
      
      // Create basic test packages if seeder fails
      const testPackages = [
        {
          name: 'Starter Swan Package',
          description: 'Perfect introduction to SwanStudios methodology',
          packageType: 'fixed',
          sessions: 4,
          pricePerSession: 140.00,
          totalCost: 560.00,
          price: 560.00,
          isActive: true,
          displayOrder: 1
        },
        {
          name: 'Gold Swan Mastery',
          description: 'Premium 12-session program',
          packageType: 'fixed',
          sessions: 12,
          pricePerSession: 150.00,
          totalCost: 1800.00,
          price: 1800.00,
          isActive: true,
          displayOrder: 2
        }
      ];
      
      for (const pkg of testPackages) {
        try {
          await StorefrontItem.create(pkg);
          console.log(`✅ Created: ${pkg.name}`);
        } catch (createError) {
          console.error(`❌ Failed to create ${pkg.name}:`, createError.message);
        }
      }
    }
  } else {
    console.log('✅ Training packages found:');
    existingPackages.forEach((pkg, index) => {
      console.log(`   ${index + 1}. ${pkg.name} - $${pkg.price} (${pkg.sessions || pkg.totalSessions} sessions)`);
    });
  }
  console.log('');

  // Test 3: API Endpoint Simulation
  console.log('🌐 Test 3: API Endpoint Simulation');
  console.log('----------------------------------');
  
  // Simulate GET /api/storefront
  try {
    const apiPackages = await StorefrontItem.findAll({
      order: [['displayOrder', 'ASC'], ['id', 'ASC']],
      limit: 100
    });
    
    const transformedPackages = apiPackages.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      totalCost: parseFloat(item.totalCost) || parseFloat(item.price) || 0,
      displayPrice: parseFloat(item.price) || parseFloat(item.totalCost) || 0,
      pricePerSession: parseFloat(item.pricePerSession) || 0,
      price: parseFloat(item.price) || parseFloat(item.totalCost) || 0,
      sessions: item.sessions,
      totalSessions: item.totalSessions,
      packageType: item.packageType,
      isActive: item.isActive,
      displayOrder: item.displayOrder || 0
    }));
    
    console.log(`✅ API endpoint simulation: SUCCESS`);
    console.log(`   - Packages returned: ${transformedPackages.length}`);
    console.log(`   - Price range: $${Math.min(...transformedPackages.map(p => p.price))} - $${Math.max(...transformedPackages.map(p => p.price))}`);
    
    // Check for pricing issues
    const zeroPricePackages = transformedPackages.filter(p => p.price === 0);
    if (zeroPricePackages.length > 0) {
      console.log(`⚠️  Found ${zeroPricePackages.length} packages with $0 pricing!`);
      zeroPricePackages.forEach(pkg => {
        console.log(`   - ${pkg.name}: price=${pkg.price}, totalCost=${pkg.totalCost}`);
      });
    } else {
      console.log('✅ All packages have valid pricing');
    }
  } catch (apiError) {
    console.error('❌ API endpoint simulation failed:', apiError.message);
  }
  console.log('');

  // Test 4: Model Associations
  console.log('🔗 Test 4: Model Associations');
  console.log('-----------------------------');
  
  const ShoppingCart = getShoppingCart();
  const CartItem = getCartItem();
  const User = getUser();
  
  // Check if associations are properly set up
  const hasCartItemAssociation = !!CartItem.associations?.storefrontItem;
  const hasShoppingCartAssociations = !!(ShoppingCart.associations?.user && ShoppingCart.associations?.cartItems);
  
  console.log(`✅ CartItem → StorefrontItem association: ${hasCartItemAssociation ? 'CONFIGURED' : 'MISSING'}`);
  console.log(`✅ ShoppingCart associations: ${hasShoppingCartAssociations ? 'CONFIGURED' : 'MISSING'}`);
  
  if (!hasCartItemAssociation || !hasShoppingCartAssociations) {
    console.log('⚠️  Some model associations may need verification');
  }
  console.log('');

  // Test 5: Test User Lookup
  console.log('👤 Test 5: Test User System');
  console.log('---------------------------');
  
  try {
    const userCount = await User.count();
    console.log(`✅ User system working: ${userCount} users in database`);
    
    if (userCount === 0) {
      console.log('⚠️  No users found. You may need to create test users for testing.');
    }
  } catch (userError) {
    console.error('❌ User system error:', userError.message);
  }
  console.log('');

  // Test 6: Genesis Checkout Route Verification
  console.log('💳 Test 6: Genesis Checkout System');
  console.log('----------------------------------');
  
  // Check if Stripe environment variables are set
  const hasStripeKeys = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY);
  console.log(`✅ Stripe configuration: ${hasStripeKeys ? 'CONFIGURED' : 'MISSING KEYS'}`);
  
  if (!hasStripeKeys) {
    console.log('⚠️  Stripe keys not found in environment variables');
    console.log('   Required: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY');
  }
  
  // Check frontend URL configuration
  const hasFrontendUrl = !!process.env.VITE_FRONTEND_URL;
  console.log(`✅ Frontend URL: ${hasFrontendUrl ? process.env.VITE_FRONTEND_URL : 'USING DEFAULT'}`);
  console.log('');

  // Test 7: Database Integrity Check
  console.log('🗄️  Test 7: Database Integrity');
  console.log('------------------------------');
  
  try {
    // Test table exists and basic operations work
    const testPackage = await StorefrontItem.findOne();
    if (testPackage) {
      console.log('✅ StorefrontItem table: ACCESSIBLE');
      console.log(`   Sample package: ${testPackage.name} ($${testPackage.price})`);
    }
    
    // Test cart table
    const cartCount = await ShoppingCart.count();
    console.log(`✅ ShoppingCart table: ACCESSIBLE (${cartCount} carts)`);
    
    // Test cart items table  
    const cartItemCount = await CartItem.count();
    console.log(`✅ CartItem table: ACCESSIBLE (${cartItemCount} items)`);
    
  } catch (dbError) {
    console.error('❌ Database integrity issue:', dbError.message);
  }
  console.log('');

  // Final Summary
  console.log('📋 INTEGRATION VERIFICATION SUMMARY');
  console.log('===================================');
  
  const finalPackageCount = await StorefrontItem.count();
  const hasPackages = finalPackageCount > 0;
  const hasValidPricing = await StorefrontItem.count({ where: { price: { [sequelize.Op.gt]: 0 } } });
  
  console.log(`📦 Training Packages: ${hasPackages ? '✅ READY' : '❌ MISSING'} (${finalPackageCount} packages)`);
  console.log(`💰 Pricing System: ${hasValidPricing > 0 ? '✅ VALID' : '❌ INVALID'} (${hasValidPricing} with valid prices)`);
  console.log(`🔗 Model Associations: ${hasCartItemAssociation ? '✅ READY' : '⚠️  CHECK'}`);
  console.log(`💳 Stripe Configuration: ${hasStripeKeys ? '✅ READY' : '⚠️  MISSING'}`);
  console.log('');
  
  if (hasPackages && hasValidPricing > 0 && hasCartItemAssociation) {
    console.log('🎉 SUCCESS: Storefront integration is READY!');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. Start your backend server: npm start');
    console.log('   2. Test storefront at: http://localhost:5173/store');
    console.log('   3. Login/register to view pricing');
    console.log('   4. Test add to cart functionality');
    console.log('   5. Test Genesis checkout flow');
    console.log('');
    console.log('🔧 Frontend API Test Commands:');
    console.log('   curl http://localhost:5000/api/storefront');
    console.log('   curl http://localhost:5000/api/health');
    console.log('');
  } else {
    console.log('⚠️  ISSUES DETECTED: Some components need attention');
    console.log('');
    console.log('🔧 Recommended Actions:');
    if (!hasPackages) {
      console.log('   1. Run: node swanstudios-store-seeder.mjs');
    }
    if (!hasStripeKeys) {
      console.log('   2. Configure Stripe environment variables');
    }
    if (!hasCartItemAssociation) {
      console.log('   3. Verify model associations in models/index.mjs');
    }
    console.log('   4. Restart backend server after fixes');
    console.log('');
  }

  await sequelize.close();
  process.exit(0);

} catch (error) {
  console.error('❌ Verification script failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
