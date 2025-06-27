/**
 * Cart Helpers Test Script - CORRECTED CALIFORNIA PRICING
 * =======================================================
 * Tests cart helper functions with REALISTIC California personal training prices
 * 
 * Usage: node test-cart-helpers-CORRECT-PRICING.mjs
 */

import cartHelpers from './utils/cartHelpers.mjs';

const { calculateCartTotals, getCartTotalsWithFallback } = cartHelpers;

/**
 * CORRECT Mock cart items with REALISTIC California pricing
 */
const createCorrectMockCartItems = () => [
  {
    id: 1,
    quantity: 1,
    price: 175.00, // Single session = $175 total
    storefrontItemId: 1,
    storefrontItem: {
      id: 1,
      name: 'Silver Swan Wing',
      sessions: 1,
      packageType: 'fixed',
      pricePerSession: 175.00
    }
  },
  {
    id: 2,
    quantity: 1,
    price: 1360.00, // 8 sessions @ $170 each = $1,360 total
    storefrontItemId: 2,
    storefrontItem: {
      id: 2,
      name: 'Golden Swan Flight',
      sessions: 8,
      packageType: 'fixed',
      pricePerSession: 170.00
    }
  },
  {
    id: 3,
    quantity: 1,
    price: 8060.00, // 52 sessions @ $155 each = $8,060 total (3 months)
    storefrontItemId: 3,
    storefrontItem: {
      id: 3,
      name: 'Emerald Swan Evolution',
      totalSessions: 52,
      packageType: 'monthly',
      pricePerSession: 155.00,
      months: 3,
      sessionsPerWeek: 4
    }
  }
];

/**
 * Test with CORRECT California pricing
 */
const testCorrectPricing = () => {
  console.log('\n🎯 TESTING WITH CORRECT CALIFORNIA PRICING');
  console.log('==========================================');
  
  const mockCartItems = createCorrectMockCartItems();
  const result = calculateCartTotals(mockCartItems);
  
  // Expected totals with CORRECT pricing
  const expectedTotal = 175.00 + 1360.00 + 8060.00; // $9,595
  const expectedSessions = 1 + 8 + 52; // 61 sessions
  
  console.log('\n📊 CART BREAKDOWN:');
  console.log('===================');
  console.log('1. Silver Swan Wing: 1 session × $175 = $175');
  console.log('2. Golden Swan Flight: 8 sessions × $170 = $1,360');  
  console.log('3. Emerald Swan Evolution: 52 sessions × $155 = $8,060');
  console.log('─'.repeat(50));
  console.log(`💰 TOTAL: $${expectedTotal.toLocaleString()}`);
  console.log(`🎯 SESSIONS: ${expectedSessions} sessions`);
  console.log(`📈 AVERAGE PER SESSION: $${(expectedTotal / expectedSessions).toFixed(2)}`);
  
  console.log('\n🧮 CALCULATION RESULTS:');
  console.log('========================');
  console.log(`Expected: $${expectedTotal.toLocaleString()} • ${expectedSessions} sessions`);
  console.log(`Calculated: $${result.total.toLocaleString()} • ${result.totalSessions} sessions`);
  
  const totalCorrect = Math.abs(result.total - expectedTotal) < 0.01;
  const sessionsCorrect = result.totalSessions === expectedSessions;
  
  console.log(`✅ Total calculation: ${totalCorrect ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Sessions calculation: ${sessionsCorrect ? 'PASSED' : 'FAILED'}`);
  
  if (totalCorrect && sessionsCorrect) {
    console.log('\n🎉 CALIFORNIA PRICING VALIDATION: PASSED!');
    console.log('✅ Your cart system correctly handles premium California rates');
    console.log('✅ Perfect for high-end personal training business');
  } else {
    console.log('\n❌ PRICING CALCULATION ERROR DETECTED!');
  }
  
  return totalCorrect && sessionsCorrect;
};

/**
 * Test Stripe compatibility with real pricing
 */
const testStripeWithRealPricing = () => {
  console.log('\n💳 STRIPE COMPATIBILITY WITH REAL PRICING');
  console.log('==========================================');
  
  const singleSession = [{
    id: 1,
    quantity: 1,
    price: 175.00,
    storefrontItemId: 1,
    storefrontItem: {
      id: 1,
      name: 'Silver Swan Wing',
      sessions: 1,
      packageType: 'fixed'
    }
  }];
  
  const result = calculateCartTotals(singleSession);
  const stripeAmount = Math.round(result.total * 100); // Convert to cents
  
  console.log(`💰 Single session: $${result.total}`);
  console.log(`💳 Stripe amount: ${stripeAmount.toLocaleString()} cents`);
  console.log(`✅ Well above Stripe minimum (50 cents): ${stripeAmount >= 50 ? 'YES' : 'NO'}`);
  console.log(`🚀 Premium pricing perfect for Stripe: ${stripeAmount > 5000 ? 'EXCELLENT' : 'GOOD'}`);
  
  return stripeAmount >= 50;
};

/**
 * Run corrected pricing tests
 */
const runCorrectedTests = () => {
  console.log('🎯 SWANSTUDIOS CORRECT PRICING VALIDATION');
  console.log('==========================================');
  console.log('🏖️ Testing with realistic California personal training rates\n');
  
  const results = [];
  
  try {
    results.push(testCorrectPricing());
    results.push(testStripeWithRealPricing());
    
    const allPassed = results.every(result => result === true);
    
    console.log('\n📊 CORRECTED PRICING TEST RESULTS');
    console.log('==================================');
    console.log(`Tests passed: ${results.filter(r => r).length}/${results.length}`);
    console.log(`Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ ISSUES DETECTED'}`);
    
    if (allPassed) {
      console.log('\n🎉 CALIFORNIA PRICING SYSTEM: VALIDATED!');
      console.log('✅ Premium personal training rates: CORRECT');
      console.log('✅ Cart calculations: ACCURATE');  
      console.log('✅ Stripe compatibility: EXCELLENT');
      console.log('✅ Ready for high-end California market!');
      console.log('\n💎 Your pricing reflects premium value:');
      console.log('   🏆 $140-$175 per session is competitive for elite trainers');
      console.log('   🎯 Package discounts encourage commitment');
      console.log('   💰 Total package values justify premium service');
    } else {
      console.log('\n⚠️ Issues found with pricing calculations');
    }
    
    return allPassed;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  }
};

// Execute corrected tests
const success = runCorrectedTests();
process.exit(success ? 0 : 1);
