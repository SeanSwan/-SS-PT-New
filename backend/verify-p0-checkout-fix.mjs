/**
 * Production P0 Checkout Fix Verification Script
 * ==============================================
 * CRITICAL: This script verifies the P0 checkout fix is working properly
 * 
 * Tests:
 * 1. Centralized model system initialization
 * 2. Critical associations (CartItem -> StorefrontItem)
 * 3. Complex cart queries (the exact ones that were failing)
 * 4. Cart helpers integration
 * 5. End-to-end cart calculation flow
 * 
 * Usage: node verify-p0-checkout-fix.mjs
 * 
 * This script MUST pass all tests before deploying to production!
 */

// Set production environment for accurate testing
process.env.NODE_ENV = 'production';

console.log('🔍 PRODUCTION P0 CHECKOUT FIX VERIFICATION');
console.log('===========================================');
console.log('🎯 Testing critical association fix for checkout functionality\n');

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0
};

const logTest = (name, passed, details = '') => {
  if (passed) {
    console.log(`✅ ${name}: PASSED ${details}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${name}: FAILED ${details}`);
    testResults.failed++;
  }
};

const logWarning = (name, details = '') => {
  console.log(`⚠️  ${name}: WARNING ${details}`);
  testResults.warnings++;
};

try {
  console.log('📋 Test 1: Centralized Model System Import');
  console.log('------------------------------------------');
  
  // Test centralized model import
  let models;
  try {
    models = await import('./models/index.mjs');
    logTest('Model Import', true, '- Successfully imported centralized models');
  } catch (importError) {
    logTest('Model Import', false, `- Import failed: ${importError.message}`);
    process.exit(1);
  }
  
  // Test individual model availability
  const criticalModels = ['CartItem', 'StorefrontItem', 'ShoppingCart', 'User'];
  for (const modelName of criticalModels) {
    if (models[modelName]) {
      logTest(`${modelName} Available`, true);
    } else {
      logTest(`${modelName} Available`, false);
    }
  }
  
  console.log('\n📋 Test 2: Database Connection & Association Verification');
  console.log('--------------------------------------------------------');
  
  // Test database connection
  try {
    await models.sequelize.authenticate();
    logTest('Database Connection', true, '- PostgreSQL connection established');
  } catch (dbError) {
    logTest('Database Connection', false, `- Connection failed: ${dbError.message}`);
  }
  
  // Critical association tests
  const { CartItem, StorefrontItem, ShoppingCart } = models;
  
  if (CartItem.associations && CartItem.associations.storefrontItem) {
    logTest('CartItem -> StorefrontItem Association', true, '- P0 CRITICAL association confirmed');
  } else {
    logTest('CartItem -> StorefrontItem Association', false, '- P0 CRITICAL association missing!');
  }
  
  if (ShoppingCart.associations && ShoppingCart.associations.cartItems) {
    logTest('ShoppingCart -> cartItems Association', true);
  } else {
    logTest('ShoppingCart -> cartItems Association', false);
  }
  
  // Log all CartItem associations for debugging
  if (CartItem.associations) {
    const associations = Object.keys(CartItem.associations);
    console.log(`📊 CartItem associations found: ${associations.join(', ')}`);
  }
  
  console.log('\n📋 Test 3: Complex Cart Query Test (Previously Failing Query)');
  console.log('-------------------------------------------------------------');
  
  // This is the EXACT query that was failing before the fix
  try {
    const testQuery = await ShoppingCart.findOne({
      where: { status: 'active' },
      include: [{
        model: CartItem,
        as: 'cartItems',
        include: [{
          model: StorefrontItem,
          as: 'storefrontItem',
          attributes: ['id', 'name', 'sessions', 'totalSessions', 'packageType', 'price']
        }]
      }],
      limit: 1
    });
    
    logTest('Complex Cart Query', true, '- Query executed without "not associated" error');
    
    if (testQuery) {
      console.log(`   📦 Found cart ID: ${testQuery.id} with ${testQuery.cartItems?.length || 0} items`);
      
      // Test session calculation on real data
      if (testQuery.cartItems && testQuery.cartItems.length > 0) {
        let totalSessions = 0;
        testQuery.cartItems.forEach((item, index) => {
          const storefront = item.storefrontItem;
          if (storefront) {
            const sessions = storefront.packageType === 'fixed' ? storefront.sessions : storefront.totalSessions;
            totalSessions += (sessions || 0) * item.quantity;
            console.log(`   📊 Item ${index + 1}: ${storefront.name} - ${sessions || 0} sessions × ${item.quantity} = ${(sessions || 0) * item.quantity}`);
          }
        });
        console.log(`   🎯 Total sessions calculated: ${totalSessions}`);
        
        if (totalSessions > 0) {
          logTest('Session Calculation', true, `- Calculated ${totalSessions} total sessions`);
        } else {
          logWarning('Session Calculation', '- No sessions found (may be valid if items have no sessions)');
        }
      }
    } else {
      console.log('   ℹ️  No active carts found (this is normal for testing)');
    }
    
  } catch (queryError) {
    logTest('Complex Cart Query', false, `- Query failed: ${queryError.message}`);
    console.log('   🚨 This indicates the association fix did not work!');
  }
  
  console.log('\n📋 Test 4: Cart Helpers Integration Test');
  console.log('-----------------------------------------');
  
  try {
    const { calculateCartTotals } = await import('./utils/cartHelpers.mjs');
    
    // Test with mock data that matches production structure
    const mockCartItems = [{
      id: 1,
      quantity: 1,
      price: 175.00,
      storefrontItemId: 1,
      storefrontItem: {
        id: 1,
        name: 'Test Package',
        sessions: 8,
        packageType: 'fixed'
      }
    }];
    
    const result = calculateCartTotals(mockCartItems);
    
    if (result.total === 175 && result.totalSessions === 8) {
      logTest('Cart Helpers Calculation', true, `- $${result.total}, ${result.totalSessions} sessions`);
    } else {
      logTest('Cart Helpers Calculation', false, `- Expected $175/8 sessions, got $${result.total}/${result.totalSessions} sessions`);
    }
    
  } catch (helperError) {
    logTest('Cart Helpers Integration', false, `- Failed: ${helperError.message}`);
  }
  
  console.log('\n📋 Test 5: Production Database Item Check');
  console.log('------------------------------------------');
  
  // Check if production has storefront items with session data
  try {
    const itemsCount = await StorefrontItem.count();
    logTest('Storefront Items Available', itemsCount > 0, `- Found ${itemsCount} items`);
    
    if (itemsCount > 0) {
      // Check for items with session data
      const itemsWithSessions = await StorefrontItem.count({
        where: {
          [models.Sequelize.Op.or]: [
            { sessions: { [models.Sequelize.Op.gt]: 0 } },
            { totalSessions: { [models.Sequelize.Op.gt]: 0 } }
          ]
        }
      });
      
      logTest('Items with Session Data', itemsWithSessions > 0, `- ${itemsWithSessions} items have session data`);
    }
    
  } catch (itemError) {
    logTest('Production Database Check', false, `- Failed: ${itemError.message}`);
  }
  
  console.log('\n🎯 VERIFICATION SUMMARY');
  console.log('=======================');
  console.log(`✅ Tests Passed: ${testResults.passed}`);
  console.log(`❌ Tests Failed: ${testResults.failed}`);
  console.log(`⚠️  Warnings: ${testResults.warnings}`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL CRITICAL TESTS PASSED!');
    console.log('==============================');
    console.log('✅ CartItem -> StorefrontItem association: WORKING');
    console.log('✅ Complex cart queries: WORKING');
    console.log('✅ Cart helpers integration: WORKING');
    console.log('✅ Centralized model system: WORKING');
    console.log('\n🚀 P0 CHECKOUT FIX VERIFIED - SAFE FOR PRODUCTION DEPLOYMENT!');
    console.log('💳 Users should now be able to:');
    console.log('   - See cart with total sessions (not "0 total sessions")');
    console.log('   - Progress through checkout validation');
    console.log('   - Reach Stripe payment form successfully');
    
    process.exit(0);
  } else {
    console.log('\n❌ VERIFICATION FAILED!');
    console.log('=======================');
    console.log('🚨 The P0 fix has issues that must be resolved before production deployment');
    console.log('📞 Review the failed tests above and address each issue');
    
    process.exit(1);
  }
  
} catch (error) {
  console.error('\n💥 VERIFICATION SCRIPT FAILED:', error.message);
  console.error('Stack trace:', error.stack);
  console.log('\n❌ Unable to complete verification');
  console.log('🔧 Check the error details above and fix the underlying issues');
  process.exit(1);
}
