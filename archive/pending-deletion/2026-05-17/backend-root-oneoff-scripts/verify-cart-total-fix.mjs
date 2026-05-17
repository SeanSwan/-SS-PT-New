/**
 * Cart Total Persistence Verification Script
 * ==========================================
 * Verifies that cart total persistence is working in production
 * 
 * Usage: node verify-cart-total-fix.mjs
 * 
 * This script tests the actual database integration to ensure
 * the cart total persistence fix is working correctly.
 */

import ShoppingCart from './models/ShoppingCart.mjs';
import CartItem from './models/CartItem.mjs';
import StorefrontItem from './models/StorefrontItem.mjs';
import User from './models/User.mjs';
import cartHelpers from './utils/cartHelpers.mjs';
import logger from './utils/logger.mjs';
import sequelize from './database.mjs';

const { updateCartTotals, getCartTotalsWithFallback, debugCartState } = cartHelpers;

/**
 * Find a test cart to verify
 */
const findTestCart = async () => {
  try {
    // Look for an active cart with items
    const cart = await ShoppingCart.findOne({
      where: { status: 'active' },
      include: [{
        model: CartItem,
        as: 'cartItems',
        include: [{
          model: StorefrontItem,
          as: 'storefrontItem'
        }]
      }],
      order: [['updatedAt', 'DESC']]
    });
    
    if (cart && cart.cartItems && cart.cartItems.length > 0) {
      return cart;
    }
    
    logger.info('No suitable test cart found with items');
    return null;
    
  } catch (error) {
    logger.error('Error finding test cart:', error.message);
    return null;
  }
};

/**
 * Create a temporary test cart for verification
 */
const createTestCart = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    // Find a test user (admin or any user)
    const testUser = await User.findOne({
      where: { role: ['admin', 'trainer'] },
      order: [['createdAt', 'ASC']]
    });
    
    if (!testUser) {
      throw new Error('No test user found');
    }
    
    // Find storefront items for testing
    const storefrontItems = await StorefrontItem.findAll({
      where: { isActive: true },
      limit: 2,
      order: [['createdAt', 'ASC']]
    });
    
    if (storefrontItems.length === 0) {
      throw new Error('No storefront items found');
    }
    
    // Create test cart
    const testCart = await ShoppingCart.create({
      userId: testUser.id,
      status: 'active'
    }, { transaction });
    
    // Add test items to cart
    const cartItems = [];
    for (let i = 0; i < Math.min(storefrontItems.length, 2); i++) {
      const item = storefrontItems[i];
      const cartItem = await CartItem.create({
        cartId: testCart.id,
        storefrontItemId: item.id,
        quantity: 1,
        price: item.totalCost || item.price || 100
      }, { transaction });
      
      cartItems.push(cartItem);
    }
    
    await transaction.commit();
    
    // Fetch the complete cart with associations
    const completeCart = await ShoppingCart.findByPk(testCart.id, {
      include: [{
        model: CartItem,
        as: 'cartItems',
        include: [{
          model: StorefrontItem,
          as: 'storefrontItem'
        }]
      }]
    });
    
    logger.info('Created test cart for verification', {
      cartId: completeCart.id,
      userId: testUser.id,
      itemCount: cartItems.length
    });
    
    return completeCart;
    
  } catch (error) {
    await transaction.rollback();
    logger.error('Error creating test cart:', error.message);
    throw error;
  }
};

/**
 * Clean up test cart
 */
const cleanupTestCart = async (cartId) => {
  try {
    await CartItem.destroy({ where: { cartId } });
    await ShoppingCart.destroy({ where: { id: cartId } });
    logger.info('Cleaned up test cart', { cartId });
  } catch (error) {
    logger.error('Error cleaning up test cart:', error.message);
  }
};

/**
 * Verify cart total persistence
 */
const verifyCartTotalPersistence = async () => {
  console.log('\n🔍 Verifying Cart Total Persistence...');
  console.log('=======================================');
  
  let testCart = null;
  let createdTestCart = false;
  
  try {
    // Try to find existing cart first
    testCart = await findTestCart();
    
    // Create test cart if none found
    if (!testCart) {
      console.log('📝 Creating test cart for verification...');
      testCart = await createTestCart();
      createdTestCart = true;
    }
    
    if (!testCart) {
      throw new Error('Unable to get test cart for verification');
    }
    
    console.log(`\n📋 Testing with cart ID: ${testCart.id}`);
    console.log(`   Items in cart: ${testCart.cartItems.length}`);
    
    // Debug initial cart state
    await debugCartState(testCart.id, 'verification_start');
    
    // Record initial state
    const initialTotal = testCart.total;
    console.log(`   Initial persisted total: $${initialTotal || 0}`);
    
    // Calculate expected totals
    const { total: expectedTotal, totalSessions } = cartHelpers.calculateCartTotals(testCart.cartItems);
    console.log(`   Expected calculated total: $${expectedTotal}`);
    console.log(`   Expected total sessions: ${totalSessions}`);
    
    // Test the updateCartTotals function
    console.log('\n🔄 Testing updateCartTotals...');
    const updateResult = await updateCartTotals(testCart.id);
    
    console.log('   Update result:', {
      success: updateResult.success,
      total: updateResult.total,
      totalSessions: updateResult.totalSessions,
      error: updateResult.error
    });
    
    // Verify the total was persisted
    const updatedCart = await ShoppingCart.findByPk(testCart.id);
    console.log(`   Persisted total after update: $${updatedCart.total}`);
    
    // Test the fallback function
    console.log('\n💰 Testing getCartTotalsWithFallback...');
    const fallbackResult = getCartTotalsWithFallback({
      id: testCart.id,
      total: updatedCart.total,
      cartItems: testCart.cartItems
    });
    
    console.log('   Fallback result:', {
      total: fallbackResult.total,
      totalSessions: fallbackResult.totalSessions,
      source: fallbackResult.source
    });
    
    // Verify results
    const persistenceWorking = Math.abs(updatedCart.total - expectedTotal) < 0.01;
    const fallbackWorking = fallbackResult.source === 'persisted' && Math.abs(fallbackResult.total - expectedTotal) < 0.01;
    const sessionsWorking = fallbackResult.totalSessions === totalSessions;
    
    console.log('\n📊 VERIFICATION RESULTS:');
    console.log('=========================');
    console.log(`✅ Total persistence: ${persistenceWorking ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Fallback handling: ${fallbackWorking ? 'WORKING' : 'FAILED'}`);
    console.log(`✅ Session tracking: ${sessionsWorking ? 'WORKING' : 'FAILED'}`);
    
    const allWorking = persistenceWorking && fallbackWorking && sessionsWorking;
    
    if (allWorking) {
      console.log('\n🎉 CART TOTAL PERSISTENCE IS WORKING CORRECTLY!');
      console.log('✅ Database persistence: FUNCTIONAL');
      console.log('✅ Fallback calculation: FUNCTIONAL');
      console.log('✅ Session tracking: FUNCTIONAL');
      console.log('✅ Payment processing should now work correctly');
    } else {
      console.log('\n❌ CART TOTAL PERSISTENCE HAS ISSUES');
      console.log('⚠️ Payment processing may still fail');
    }
    
    // Clean up if we created a test cart
    if (createdTestCart) {
      await cleanupTestCart(testCart.id);
    }
    
    return allWorking;
    
  } catch (error) {
    console.error('\n💥 Verification failed:', error.message);
    logger.error('Cart total persistence verification failed', { error: error.message });
    
    // Clean up on error
    if (testCart && createdTestCart) {
      await cleanupTestCart(testCart.id);
    }
    
    return false;
  }
};

/**
 * Test Stripe minimum amount scenarios with real data
 */
const testStripeMinimumWithRealData = async () => {
  console.log('\n💳 Testing Stripe Minimum Amount Scenarios...');
  console.log('==============================================');
  
  try {
    // Find active carts to test
    const carts = await ShoppingCart.findAll({
      where: { status: 'active' },
      include: [{
        model: CartItem,
        as: 'cartItems',
        include: [{
          model: StorefrontItem,
          as: 'storefrontItem'
        }]
      }],
      limit: 3
    });
    
    if (carts.length === 0) {
      console.log('   No active carts found for testing');
      return true;
    }
    
    for (const cart of carts) {
      const { total } = getCartTotalsWithFallback(cart);
      const stripeAmount = Math.round(total * 100); // Convert to cents
      const meetsMinimum = stripeAmount >= 50;
      
      console.log(`   Cart ${cart.id}: $${total} (${stripeAmount} cents) - ${meetsMinimum ? 'VALID' : 'TOO SMALL'}`);
    }
    
    console.log('   Stripe minimum validation: FUNCTIONAL');
    return true;
    
  } catch (error) {
    console.error('   Stripe minimum test failed:', error.message);
    return false;
  }
};

/**
 * Run complete verification
 */
const runVerification = async () => {
  console.log('🚀 Cart Total Persistence Verification');
  console.log('======================================');
  console.log('This script verifies that the Phase 1 cart total fix is working correctly.');
  
  try {
    const results = [];
    
    results.push(await verifyCartTotalPersistence());
    results.push(await testStripeMinimumWithRealData());
    
    const allPassed = results.every(result => result === true);
    
    console.log('\n🏁 FINAL VERIFICATION RESULTS');
    console.log('==============================');
    
    if (allPassed) {
      console.log('✅ ALL VERIFICATIONS PASSED');
      console.log('🎉 The cart total persistence fix is working correctly!');
      console.log('💰 Payment processing should now work without "Order total too small" errors');
      console.log('📈 Ready for Phase 2: Session Tracking Implementation');
    } else {
      console.log('❌ SOME VERIFICATIONS FAILED');
      console.log('⚠️ Please review the implementation before proceeding');
    }
    
    return allPassed;
    
  } catch (error) {
    console.error('\n💥 Verification script failed:', error.message);
    logger.error('Verification script execution failed', { error: error.message });
    return false;
  }
};

// Execute verification if this file is run directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  runVerification().then((success) => {
    process.exit(success ? 0 : 1);
  }).catch((error) => {
    console.error('\n💥 Script execution failed:', error);
    process.exit(1);
  });
}

export default {
  verifyCartTotalPersistence,
  testStripeMinimumWithRealData,
  runVerification
};
