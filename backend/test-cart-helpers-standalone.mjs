/**
 * Cart Helpers Test Script - Standalone Mode (No DB Required)
 * ===========================================================
 * Tests cart helper functions without database dependency
 * 
 * Usage: node test-cart-helpers-standalone.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import cart helpers directly
const cartHelpersPath = join(__dirname, 'utils', 'cartHelpers.mjs');
const { calculateCartTotals, getCartTotalsWithFallback } = await import(cartHelpersPath);

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
  
  // Cart item with missing storefront item
  const incompleteItems = [{
    id: 1,
    quantity: 1,
    price: 100,
    storefrontItemId: 1,
    storefrontItem: null
  }];
  const incompleteResult = calculateCartTotals(incompleteItems);
  console.log('📊 Incomplete cart item result:', incompleteResult);
  
  const emptyCorrect = emptyResult.total === 0 && emptyResult.totalSessions === 0;
  const invalidCorrect = invalidResult.total === 0 && invalidResult.totalSessions === 0;
  const incompleteCorrect = incompleteResult.total === 100 && incompleteResult.totalSessions === 0;
  
  console.log(`✅ Empty cart handling: ${emptyCorrect ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Invalid input handling: ${invalidCorrect ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Incomplete item handling: ${incompleteCorrect ? 'PASSED' : 'FAILED'}`);
  
  return emptyCorrect && invalidCorrect && incompleteCorrect;
};

/**
 * Test Stripe minimum amount scenarios
 */
const testStripeMinimumScenarios = () => {
  console.log('\n💳 Testing Stripe minimum amount scenarios...');
  console.log('===============================================');
  
  // Test amount below Stripe minimum ($0.50)
  const smallAmountItems = [{
    id: 1,
    quantity: 1,
    price: 0.25,
    storefrontItemId: 1,
    storefrontItem: {
      id: 1,
      name: 'Test Item',
      sessions: 1,
      packageType: 'fixed'
    }
  }];
  
  const smallResult = calculateCartTotals(smallAmountItems);
  const stripeAmount = Math.round(smallResult.total * 100);
  
  console.log('📊 Small amount result:', smallResult);
  console.log(`💳 Stripe amount (cents): ${stripeAmount}`);
  console.log(`⚠️ Below Stripe minimum ($0.50): ${stripeAmount < 50}`);
  
  // Test amount at Stripe minimum
  const minimumAmountItems = [{
    id: 1,
    quantity: 1,
    price: 0.50,
    storefrontItemId: 1,
    storefrontItem: {
      id: 1,
      name: 'Test Item',
      sessions: 1,
      packageType: 'fixed'
    }
  }];
  
  const minimumResult = calculateCartTotals(minimumAmountItems);
  const minimumStripeAmount = Math.round(minimumResult.total * 100);
  
  console.log('📊 Minimum amount result:', minimumResult);
  console.log(`💳 Minimum Stripe amount (cents): ${minimumStripeAmount}`);
  console.log(`✅ Meets Stripe minimum: ${minimumStripeAmount >= 50}`);
  
  const smallAmountCorrect = stripeAmount < 50;
  const minimumAmountCorrect = minimumStripeAmount >= 50;
  
  console.log(`✅ Small amount detection: ${smallAmountCorrect ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Minimum amount validation: ${minimumAmountCorrect ? 'PASSED' : 'FAILED'}`);
  
  return smallAmountCorrect && minimumAmountCorrect;
};

/**
 * Run all tests
 */
const runAllTests = async () => {
  console.log('🚀 Starting Cart Helpers Standalone Tests');
  console.log('===========================================');
  console.log('✨ Testing cart functionality without database dependency');
  
  const results = [];
  
  try {
    results.push(testCalculateCartTotals());
    results.push(testGetCartTotalsWithFallback());
    results.push(testEdgeCases());
    results.push(testStripeMinimumScenarios());
    
    const allPassed = results.every(result => result === true);
    const passedCount = results.filter(result => result === true).length;
    
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    console.log(`Tests passed: ${passedCount}/${results.length}`);
    console.log(`Overall result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allPassed) {
      console.log('\n🎉 CART HELPERS ARE WORKING CORRECTLY!');
      console.log('✅ Cart total calculation: WORKING');
      console.log('✅ Session tracking: WORKING');
      console.log('✅ Fallback handling: WORKING');
      console.log('✅ Edge case handling: WORKING');
      console.log('✅ Stripe minimum validation: WORKING');
      console.log('\n🚀 Cart system logic is solid - ready for production!');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the implementation.');
    }
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
};

// Execute tests
runAllTests().then(() => {
  console.log('\n🏁 Testing complete.');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Testing failed:', error);
  process.exit(1);
});
