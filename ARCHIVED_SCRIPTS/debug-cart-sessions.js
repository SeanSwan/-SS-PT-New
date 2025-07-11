/**
 * Debug Cart Sessions - Diagnostic Tool
 * =====================================
 * Add this to CheckoutView.tsx temporarily to debug session calculation
 */

// Add this right before the sessionCount calculation in CheckoutView.tsx:

console.log('🔍 DEBUG: Cart Session Analysis');
console.log('==============================');
console.log('Cart object:', cart);
console.log('Cart items:', cartItems);
console.log('Cart items length:', cartItems.length);

cartItems.forEach((item, index) => {
  console.log(`\n📦 Item ${index + 1}:`);
  console.log('  - ID:', item.id);
  console.log('  - Quantity:', item.quantity);
  console.log('  - Price:', item.price);
  console.log('  - StorefrontItemId:', item.storefrontItemId);
  console.log('  - StorefrontItem object:', item.storefrontItem);
  
  if (item.storefrontItem) {
    console.log('  - Name:', item.storefrontItem.name);
    console.log('  - PackageType:', item.storefrontItem.packageType);
    console.log('  - Sessions field:', item.storefrontItem.sessions);
    console.log('  - TotalSessions field:', item.storefrontItem.totalSessions);
    
    // Test our calculation logic for this item
    const itemSessions = item.storefrontItem?.sessions || item.storefrontItem?.totalSessions || 0;
    const totalForThisItem = itemSessions * (item.quantity || 0);
    console.log('  - ✅ Calculated sessions for this item:', totalForThisItem);
  } else {
    console.log('  - ⚠️ NO STOREFRONT ITEM DATA');
  }
});

// Test the overall calculation
const calculatedSessionCount = cartItems.reduce((sum, item) => {
  const itemSessions = item.storefrontItem?.sessions || item.storefrontItem?.totalSessions || 0;
  return sum + (itemSessions * (item.quantity || 0));
}, 0);

console.log('\n🎯 FINAL CALCULATION:');
console.log('Expected session count:', calculatedSessionCount);
console.log('Actual sessionCount variable:', sessionCount);
console.log('Match?', calculatedSessionCount === sessionCount ? '✅ YES' : '❌ NO');

console.log('\n🦢 End Cart Session Debug');
console.log('==========================');
