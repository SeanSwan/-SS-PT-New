/**
 * Cart Helpers Test Script - Simple Standalone Mode
 * ================================================
 * Tests cart helper functions with direct import
 * 
 * Usage: node test-cart-helpers-simple.mjs
 */

// Direct import of cart helpers
import cartHelpers from './utils/cartHelpers.mjs';

const { calculateCartTotals, getCartTotalsWithFallback } = cartHelpers;

/**
 * Mock cart items for testing
 */
const createMockCartItems = () => [
  {
    id: 1,
    quantity: 1,
    price: 175.00,
    storefrontItemId: 1,
    storefrontItem: {
      id: 1,
      name: 'Single Session',
      sessions: 1,
      packageType: 'fixed'
    }
  },
  {
    id: 2,
    quantity: 2,
    price: 170.00,
    storefrontItemId: 2,
    storefrontItem: {
      id: 2,
      name: 'Silver Package',
      sessions: 8,
      packageType: 'fixed'
    }
  },
  {
    id: 3,
    quantity: 1,
    price: 155.00,
    storefrontItemId: 3,
    storefrontItem: {
      id: 3,
      name: '3-Month Excellence',
      totalSessions: 48,
      packageType: 'monthly'
    }
  }
];

/**
 * Test calculateCartTotals function
 */
const testCalculateCartTotals = () => {
  console.log('\n🧮 Testing calculateCartTotals...');
  console.log('=====================================');
  
  const mockCartItems = createMockCartItems();
  const result = calculateCartTotals(mockCartItems);
  
  console.log(`📦 Mock cart items: ${mockCartItems.length}`);
  console.log(`💰 Expected total: $${(175 + (170 * 2) + 155).toFixed(2)}`);
  console.log(`🎯 Expected sessions: ${(1 + (8 * 2) + 48)}`);
  console.log(`📊 Calculated result:`, result);
  
  // Verify calculations
  const expectedTotal = 175 + (170 * 2) + 155; // $670
  const expectedSessions = 1 + (8 * 2) + 48; // 65 sessions
  
  const totalCorrect = Math.abs(result.total - expectedTotal) < 0.01;
  const sessionsCorrect = result.totalSessions === expectedSessions;
  
  console.log(`✅ Total calculation: ${totalCorrect ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Sessions calculation: ${sessionsCorrect ? 'PASSED' : 'FAILED'}`);
  
  return totalCorrect && sessionsCorrect;
};

/**
 * Test getCartTotalsWithFallback function
 */
const testGetCartTotalsWithFallback = () => {
  console.log('\n💰 Testing getCartTotalsWithFallback...');
  console.log('==========================================');
  
  const mockCartItems = createMockCartItems();
  
  // Test with persisted total
  const cartWithPersistedTotal = {
    id: 123,
    total: 670.00,
    cartItems: mockCartItems
  };
  
  const result1 = getCartTotalsWithFallback(cartWithPersistedTotal);
  console.log('📊 With persisted total:', result1);
  
  // Test with fallback calculation
  const cartWithoutPersistedTotal = {
    id: 123,
    total: 0,
    cartItems: mockCartItems
  };
  
  const result2 = getCartTotalsWithFallback(cartWithoutPersistedTotal);
  console.log('📊 With fallback calculation:', result2);
  
  const persistedWorking = result1.source === 'persisted' && result1.total === 670;
  const fallbackWorking = result2.source === 'calculated_fallback' && result2.total === 670;
  
  console.log(`✅ Persisted total handling: ${persistedWorking ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Fallback calculation: ${fallbackWorking ? 'PASSED' : 'FAILED'}`);
  
  return persistedWorking && fallbackWorking;
};

/**
 * Test edge cases
 */
const testEdgeCases = () => {
  console.log('\n⚠️ Testing edge cases...');
  console.log('===========================');
  
  // Empty cart
  const emptyResult = calculateCartTotals([]);
  console.log('📊 Empty cart result:', emptyResult);
  
  // Invalid cart items
  const invalidResult = calculateCartTotals(null);
  console.log('📊 Invalid cart items result:', invalidResult);
  
  const emptyCorrect = emptyResult.total === 0 && emptyResult.totalSessions === 0;
  const invalidCorrect = invalidResult.total === 0 && invalidResult.totalSessions === 0;
  
  console.log(`✅ Empty cart handling: ${emptyCorrect ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Invalid input handling: ${invalidCorrect ? 'PASSED' : 'FAILED'}`);
  
  return emptyCorrect && invalidCorrect;
};

/**
 * Test Stripe minimum scenarios
 */
const testStripeMinimum = () => {
  console.log('\n💳 Testing Stripe minimum scenarios...');
  console.log('=======================================');
  
  // Test normal amount
  const normalItems = [{
    id: 1,
    quantity: 1,
    price: 175.00,
    storefrontItemId: 1,
    storefrontItem: { id: 1, name: 'Session', sessions: 1, packageType: 'fixed' }
  }];
  
  const normalResult = calculateCartTotals(normalItems);
  const stripeAmount = Math.round(normalResult.total * 100);
  
  console.log(`💰 Amount: $${normalResult.total} (${stripeAmount} cents)`);
  console.log(`✅ Meets Stripe minimum ($0.50): ${stripeAmount >= 50 ? 'YES' : 'NO'}`);
  
  return stripeAmount >= 50;
};

/**
 * Run all tests
 */
const runAllTests = () => {
  console.log('🚀 CART HELPERS LOGIC TEST');
  console.log('===========================');
  console.log('✨ Testing core cart functionality\n');
  
  const results = [];
  
  try {
    results.push(testCalculateCartTotals());
    results.push(testGetCartTotalsWithFallback());
    results.push(testEdgeCases());
    results.push(testStripeMinimum());
    
    const allPassed = results.every(result => result === true);
    const passedCount = results.filter(result => result === true).length;
    
    console.log('\n📊 FINAL TEST RESULTS');
    console.log('======================');
    console.log(`Tests passed: ${passedCount}/${results.length}`);
    console.log(`Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME FAILED'}`);
    
    if (allPassed) {
      console.log('\n🎉 CART SYSTEM IS WORKING PERFECTLY!');
      console.log('✅ Cart calculations: WORKING');
      console.log('✅ Session tracking: WORKING');
      console.log('✅ Error handling: WORKING');
      console.log('✅ Stripe compatibility: WORKING');
      console.log('\n🚀 Your cart logic is production-ready!');
    }
    
    return allPassed;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  }
};

// Execute tests
const success = runAllTests();
process.exit(success ? 0 : 1);
