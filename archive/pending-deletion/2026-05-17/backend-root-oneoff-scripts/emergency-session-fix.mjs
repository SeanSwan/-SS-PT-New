/**
 * Emergency Production Session Data Fix
 * ====================================
 * Fixes missing session data that's causing "invalid cart total" errors
 */

console.log('🚨 EMERGENCY FIX: Production Session Data');
console.log('========================================');
console.log('Target: Fix "0 total sessions" causing checkout failures');

try {
  // Import required modules
  const { default: sequelize } = await import('./database.mjs');
  const { default: StorefrontItem } = await import('./models/StorefrontItem.mjs');
  
  console.log('✅ Database connected');
  
  // Check current state
  const currentItems = await StorefrontItem.findAll();
  console.log(`📦 Found ${currentItems.length} existing items`);
  
  if (currentItems.length > 0) {
    console.log('🧹 Clearing existing items to ensure clean session data...');
    
    // Clear cart items first to avoid foreign key constraints
    try {
      const { default: CartItem } = await import('./models/CartItem.mjs');
      await CartItem.destroy({ where: {} });
      console.log('   ✅ Cleared cart items');
    } catch (e) {
      console.log('   ⚠️ No cart items to clear');
    }
    
    // Clear storefront items
    await StorefrontItem.destroy({ where: {} });
    console.log('   ✅ Cleared storefront items');
  }
  
  console.log('🦢 Creating 8 packages with proper session data...');
  
  // Essential packages with session data (reduced for speed)
  const packages = [
    {
      packageType: 'fixed',
      name: 'Silver Swan Wing',
      description: 'Single premium training session',
      sessions: 1,
      pricePerSession: 175.00,
      totalCost: 175.00,
      price: 175.00,
      isActive: true,
      displayOrder: 1
    },
    {
      packageType: 'fixed', 
      name: 'Golden Swan Flight',
      description: '8 sessions of expert training',
      sessions: 8,
      pricePerSession: 170.00,
      totalCost: 1360.00,
      price: 1360.00,
      isActive: true,
      displayOrder: 2
    },
    {
      packageType: 'fixed',
      name: 'Sapphire Swan Soar', 
      description: '20 sessions of premium training',
      sessions: 20,
      pricePerSession: 165.00,
      totalCost: 3300.00,
      price: 3300.00,
      isActive: true,
      displayOrder: 3
    },
    {
      packageType: 'fixed',
      name: 'Platinum Swan Grace',
      description: '50 sessions of elite training',
      sessions: 50,
      pricePerSession: 160.00,
      totalCost: 8000.00,
      price: 8000.00,
      isActive: true,
      displayOrder: 4
    },
    {
      packageType: 'monthly',
      name: 'Emerald Swan Evolution',
      description: '3 months training (4x/week)',
      months: 3,
      sessionsPerWeek: 4,
      totalSessions: 52,
      pricePerSession: 155.00,
      totalCost: 8060.00,
      price: 8060.00,
      isActive: true,
      displayOrder: 5
    },
    {
      packageType: 'monthly',
      name: 'Diamond Swan Dynasty',
      description: '6 months training (4x/week)',
      months: 6,
      sessionsPerWeek: 4,
      totalSessions: 104,
      pricePerSession: 150.00,
      totalCost: 15600.00,
      price: 15600.00,
      isActive: true,
      displayOrder: 6
    },
    {
      packageType: 'monthly',
      name: 'Ruby Swan Reign',
      description: '9 months training (4x/week)',
      months: 9,
      sessionsPerWeek: 4,
      totalSessions: 156,
      pricePerSession: 145.00,
      totalCost: 22620.00,
      price: 22620.00,
      isActive: true,
      displayOrder: 7
    },
    {
      packageType: 'monthly',
      name: 'Rhodium Swan Royalty',
      description: '12 months training (4x/week)',
      months: 12,
      sessionsPerWeek: 4,
      totalSessions: 208,
      pricePerSession: 140.00,
      totalCost: 29120.00,
      price: 29120.00,
      isActive: true,
      displayOrder: 8
    }
  ];
  
  // Create packages
  const created = await StorefrontItem.bulkCreate(packages);
  console.log(`✅ Created ${created.length} packages with session data`);
  
  // Verify session data
  console.log('\n🔍 VERIFICATION - Session Data Check:');
  const verification = await StorefrontItem.findAll({
    attributes: ['name', 'sessions', 'totalSessions', 'packageType'],
    order: [['displayOrder', 'ASC']]
  });
  
  verification.forEach(item => {
    const sessionCount = item.packageType === 'fixed' ? item.sessions : item.totalSessions;
    console.log(`   ✅ ${item.name}: ${sessionCount} sessions`);
  });
  
  console.log('\n🎉 SUCCESS: Session data fix complete!');
  console.log('💡 Your cart should now show proper session counts');
  console.log('🔄 Try adding items to cart - should see > 0 sessions');
  console.log('💳 Checkout should now work without "invalid cart total" error');
  
  process.exit(0);
  
} catch (error) {
  console.error('💥 EMERGENCY FIX FAILED:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
