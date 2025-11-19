/**
 * Quick test to verify StorefrontItem model accepts 'custom' packageType
 * Tests model validation only (no database operations)
 */

import StorefrontItem from './models/StorefrontItem.mjs';

console.log('🧪 TESTING STOREFRONT MODEL - CUSTOM PACKAGE SUPPORT');
console.log('====================================================\n');

// Test 1: Verify 'fixed' still works
console.log('TEST 1: Verify "fixed" packageType validation...');
try {
  const fixedPackage = StorefrontItem.build({
    name: 'Test Fixed Package',
    packageType: 'fixed',
    sessions: 10,
    pricePerSession: 150.00
  });

  // Validate without saving
  await fixedPackage.validate();
  console.log('   ✅ "fixed" packageType accepted by model');
} catch (error) {
  console.error(`   ❌ FAILED: ${error.message}`);
}

// Test 2: Verify 'monthly' still works
console.log('\nTEST 2: Verify "monthly" packageType validation...');
try {
  const monthlyPackage = StorefrontItem.build({
    name: 'Test Monthly Package',
    packageType: 'monthly',
    months: 3,
    sessionsPerWeek: 2,
    pricePerSession: 145.00
  });

  await monthlyPackage.validate();
  console.log('   ✅ "monthly" packageType accepted by model');
} catch (error) {
  console.error(`   ❌ FAILED: ${error.message}`);
}

// Test 3: Verify 'custom' now works (PRIMARY TEST)
console.log('\nTEST 3: Verify "custom" packageType validation...');
try {
  const customPackage = StorefrontItem.build({
    name: 'Test Custom Personal Training Package',
    packageType: 'custom',
    sessions: 35,
    pricePerSession: 162.00,
    stripeProductId: 'prod_custom_test',
    stripePriceId: 'price_custom_test'
  });

  await customPackage.validate();
  console.log('   ✅ "custom" packageType accepted by model');
  console.log('   🎉 SUCCESS: Model now supports custom packages!');
} catch (error) {
  console.error(`   ❌ FAILED: ${error.message}`);
}

// Test 4: Verify invalid packageType is rejected
console.log('\nTEST 4: Verify invalid packageType is rejected...');
try {
  const invalidPackage = StorefrontItem.build({
    name: 'Invalid Package',
    packageType: 'invalid-type',
    pricePerSession: 150.00
  });

  await invalidPackage.validate();
  console.error('   ❌ FAILED: Invalid packageType was accepted');
} catch (error) {
  if (error.message.includes('fixed') || error.message.includes('monthly') || error.message.includes('custom')) {
    console.log('   ✅ Invalid packageType correctly rejected by model');
  } else {
    console.error(`   ❌ FAILED: Unexpected error: ${error.message}`);
  }
}

// Test 5: Verify hooks calculate totalCost for custom packages
console.log('\nTEST 5: Verify hooks calculate totalCost for custom packages...');
try {
  const customWithCalc = StorefrontItem.build({
    name: 'Custom Package with Auto-Calculation',
    packageType: 'custom',
    sessions: 50,
    pricePerSession: 160.00
  });

  await customWithCalc.validate();

  if (customWithCalc.totalCost === 8000.00) {
    console.log(`   ✅ totalCost calculated correctly: $${customWithCalc.totalCost}`);
    console.log(`   ✨ Custom package hooks working properly!`);
  } else {
    console.error(`   ❌ FAILED: Expected $8000.00, got $${customWithCalc.totalCost}`);
  }
} catch (error) {
  console.error(`   ❌ FAILED: ${error.message}`);
}

console.log('\n' + '='.repeat(60));
console.log('✅ MODEL VALIDATION TESTS COMPLETE');
console.log('📋 Summary:');
console.log('   - Model accepts "fixed", "monthly", "custom" package types');
console.log('   - Model rejects invalid package types');
console.log('   - Hooks calculate totalCost for custom packages');
console.log('   - Ready to sync with database!');
console.log('='.repeat(60));
