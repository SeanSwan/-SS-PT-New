/**
 * Production Database Investigation
 * ================================
 * Check what's actually in production database after session fix
 */

process.env.NODE_ENV = 'production';

console.log('🔍 INVESTIGATING PRODUCTION DATABASE STATE');
console.log('=========================================');

try {
  const { default: sequelize } = await import('./database.mjs');
  const { default: StorefrontItem } = await import('./models/StorefrontItem.mjs');
  const { default: CartItem } = await import('./models/CartItem.mjs');
  
  await sequelize.authenticate();
  console.log('✅ Connected to production database');
  
  // Check all storefront items
  console.log('\n📦 ALL STOREFRONT ITEMS IN PRODUCTION:');
  const allItems = await StorefrontItem.findAll({
    attributes: ['id', 'name', 'sessions', 'totalSessions', 'packageType', 'price'],
    order: [['id', 'ASC']]
  });
  
  console.log(`Found ${allItems.length} total storefront items:`);
  allItems.forEach(item => {
    const sessionInfo = item.packageType === 'fixed' 
      ? `sessions: ${item.sessions}`
      : `totalSessions: ${item.totalSessions}`;
    
    console.log(`   ID ${item.id}: ${item.name} - ${sessionInfo} ($${item.price})`);
  });
  
  // Check specifically for item ID 1176 (the one that was added to cart)
  console.log('\n🎯 CHECKING ITEM ID 1176 (Added to Cart):');
  const cartItem = await StorefrontItem.findByPk(1176);
  if (cartItem) {
    console.log(`   ✅ Found: ${cartItem.name}`);
    console.log(`   📊 Package Type: ${cartItem.packageType}`);
    console.log(`   📊 Sessions: ${cartItem.sessions}`);
    console.log(`   📊 Total Sessions: ${cartItem.totalSessions}`);
    console.log(`   💰 Price: $${cartItem.price}`);
    
    if (cartItem.packageType === 'fixed' && !cartItem.sessions) {
      console.log('   ❌ PROBLEM: Fixed package missing sessions data!');
    } else if (cartItem.packageType === 'monthly' && !cartItem.totalSessions) {
      console.log('   ❌ PROBLEM: Monthly package missing totalSessions data!');
    } else {
      console.log('   ✅ Session data looks correct');
    }
  } else {
    console.log('   ❌ Item ID 1176 not found!');
  }
  
  // Check current cart items
  console.log('\n🛒 CURRENT CART ITEMS:');
  const cartItems = await CartItem.findAll({
    include: [{
      model: StorefrontItem,
      as: 'storefrontItem',
      attributes: ['id', 'name', 'sessions', 'totalSessions', 'packageType']
    }]
  });
  
  console.log(`Found ${cartItems.length} cart items:`);
  cartItems.forEach(item => {
    const storefront = item.storefrontItem;
    if (storefront) {
      const sessionInfo = storefront.packageType === 'fixed' 
        ? `sessions: ${storefront.sessions}`
        : `totalSessions: ${storefront.totalSessions}`;
      
      console.log(`   Cart ID ${item.id}: ${storefront.name} - ${sessionInfo}`);
    } else {
      console.log(`   Cart ID ${item.id}: Missing storefront item data!`);
    }
  });
  
  console.log('\n🔍 INVESTIGATION COMPLETE');
  process.exit(0);
  
} catch (error) {
  console.error('💥 INVESTIGATION FAILED:', error.message);
  process.exit(1);
}
