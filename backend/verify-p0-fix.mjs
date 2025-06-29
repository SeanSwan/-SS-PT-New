/**
 * P0 Checkout Fix Verification Script
 * ===================================
 * Verifies that the centralized model system fix has resolved the
 * "StorefrontItem is not associated to CartItem" error.
 * 
 * Usage: node verify-p0-fix.mjs
 */

process.env.NODE_ENV = 'production';

console.log('🔍 P0 CHECKOUT FIX VERIFICATION');
console.log('================================');
console.log('Testing CartItem -> StorefrontItem association after centralized model fix...\n');

try {
  // Import from the NEW centralized model system
  const { CartItem, StorefrontItem, ShoppingCart } = await import('./models/index.mjs');
  
  console.log('✅ Successfully imported models from centralized index');
  
  // Test 1: Verify association exists
  console.log('\n📋 Test 1: Association Verification');
  const cartItemAssociations = Object.keys(CartItem.associations);
  console.log(`CartItem associations: ${cartItemAssociations.join(', ')}`);
  
  const hasStorefrontAssociation = cartItemAssociations.includes('storefrontItem');
  console.log(`✅ CartItem -> StorefrontItem association: ${hasStorefrontAssociation ? 'FOUND' : 'MISSING'}`);
  
  if (!hasStorefrontAssociation) {
    console.log('❌ CRITICAL: Association still missing after fix!');
    process.exit(1);
  }
  
  // Test 2: Test actual query that was failing
  console.log('\n🧮 Test 2: Cart Calculation Query Test');
  
  try {
    // This is the exact query that was failing before the fix
    const testCart = await ShoppingCart.findOne({
      where: { status: 'active' },
      include: [{
        model: CartItem,
        as: 'cartItems',
        include: [{
          model: StorefrontItem,
          as: 'storefrontItem',
          attributes: ['id', 'name', 'sessions', 'totalSessions', 'packageType']
        }]
      }],
      limit: 1
    });
    
    console.log('✅ Complex cart query executed successfully!');
    
    if (testCart) {
      console.log(`   📦 Found cart ID: ${testCart.id}`);
      console.log(`   🛒 Cart items: ${testCart.cartItems?.length || 0}`);
      
      if (testCart.cartItems && testCart.cartItems.length > 0) {
        testCart.cartItems.forEach((item, index) => {
          const storefront = item.storefrontItem;
          if (storefront) {
            const sessions = storefront.packageType === 'fixed' ? storefront.sessions : storefront.totalSessions;
            console.log(`   📊 Item ${index + 1}: ${storefront.name} - ${sessions} sessions`);
          }
        });
      }
    } else {
      console.log('   ℹ️  No active carts found (this is OK for testing)');
    }
    
  } catch (queryError) {
    console.log('❌ Query failed:', queryError.message);
    console.log('   This indicates the association fix did not work properly');
    process.exit(1);
  }
  
  // Test 3: Test cart helpers with real models
  console.log('\n🔧 Test 3: Cart Helpers Integration Test');
  
  try {
    const { calculateCartTotals } = await import('./utils/cartHelpers.mjs');
    
    // Mock cart item with proper structure
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
    console.log(`✅ Cart helpers working: $${result.total}, ${result.totalSessions} sessions`);
    
  } catch (helperError) {
    console.log('❌ Cart helpers failed:', helperError.message);
    process.exit(1);
  }
  
  // SUCCESS!
  console.log('\n🎉 P0 CHECKOUT FIX VERIFICATION COMPLETE');
  console.log('=========================================');
  console.log('✅ CartItem -> StorefrontItem association: WORKING');
  console.log('✅ Complex cart queries: WORKING');  
  console.log('✅ Cart helpers integration: WORKING');
  console.log('✅ Centralized model system: WORKING');
  console.log('\n🚀 CHECKOUT FUNCTIONALITY SHOULD NOW WORK!');
  console.log('💳 Users should be able to see total sessions and reach Stripe payment form');
  
  process.exit(0);
  
} catch (error) {
  console.error('\n💥 VERIFICATION FAILED:', error.message);
  console.error('Stack trace:', error.stack);
  console.log('\n❌ The P0 fix did not resolve the issue.');
  console.log('📞 Contact development team for further investigation.');
  process.exit(1);
}
