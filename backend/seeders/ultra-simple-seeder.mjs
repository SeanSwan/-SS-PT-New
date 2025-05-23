/**
 * Ultra-Simple Session Package Seeder
 * ==================================
 * Minimal version with maximum debugging
 */

console.log('🚀 STARTING SESSION PACKAGE SEEDER - ULTRA DEBUG VERSION');
console.log('=========================================================');

try {
  console.log('📂 Step 1: Importing database...');
  const { default: sequelize } = await import('../database.mjs');
  console.log('✅ Database imported successfully');
  
  console.log('📂 Step 2: Importing StorefrontItem model...');
  const { default: StorefrontItem } = await import('../models/StorefrontItem.mjs');
  console.log('✅ StorefrontItem model imported successfully');
  
  console.log('🔍 Step 3: Testing database connection...');
  const testCount = await StorefrontItem.count();
  console.log(`✅ Database connection working. Current package count: ${testCount}`);
  
  console.log('🧹 Step 4: Clearing existing packages...');
  await StorefrontItem.destroy({ where: {}, truncate: true });
  console.log('✅ All existing packages cleared');
  
  console.log('📦 Step 5: Creating your exact 8 packages...');
  
  // Your exact packages
  const packages = [
    {
      packageType: 'fixed',
      name: '1 Session Package',
      description: 'Single personal training session with Sean Swan',
      sessions: 1,
      pricePerSession: 175.00,
      totalCost: 175.00,
      price: 175.00,
      theme: 'cosmic',
      isActive: true,
      displayOrder: 1
    },
    {
      packageType: 'fixed',
      name: '8 Session Package',
      description: 'Package of 8 personal training sessions',
      sessions: 8,
      pricePerSession: 170.00,
      totalCost: 1360.00,
      price: 1360.00,
      theme: 'purple',
      isActive: true,
      displayOrder: 2
    },
    {
      packageType: 'fixed',
      name: '20 Session Package',
      description: 'Package of 20 personal training sessions - Great Value!',
      sessions: 20,
      pricePerSession: 165.00,
      totalCost: 3300.00,
      price: 3300.00,
      theme: 'emerald',
      isActive: true,
      displayOrder: 3
    },
    {
      packageType: 'fixed',
      name: '50 Session Package',
      description: 'Package of 50 personal training sessions - Best Value!',
      sessions: 50,
      pricePerSession: 160.00,
      totalCost: 8000.00,
      price: 8000.00,
      theme: 'ruby',
      isActive: true,
      displayOrder: 4
    },
    {
      packageType: 'monthly',
      name: '3 Month Package (4x/week)',
      description: '3 months of training - 4 sessions per week',
      months: 3,
      sessionsPerWeek: 4,
      totalSessions: 52,
      pricePerSession: 155.00,
      totalCost: 8060.00,
      price: 8060.00,
      theme: 'cosmic',
      isActive: true,
      displayOrder: 5
    },
    {
      packageType: 'monthly',
      name: '6 Month Package (4x/week)',
      description: '6 months of training - 4 sessions per week',
      months: 6,
      sessionsPerWeek: 4,
      totalSessions: 104,
      pricePerSession: 150.00,
      totalCost: 15600.00,
      price: 15600.00,
      theme: 'purple',
      isActive: true,
      displayOrder: 6
    },
    {
      packageType: 'monthly',
      name: '9 Month Package (4x/week)',
      description: '9 months of training - 4 sessions per week',
      months: 9,
      sessionsPerWeek: 4,
      totalSessions: 156,
      pricePerSession: 145.00,
      totalCost: 22620.00,
      price: 22620.00,
      theme: 'emerald',
      isActive: true,
      displayOrder: 7
    },
    {
      packageType: 'monthly',
      name: '12 Month Package (4x/week)',
      description: '12 months of training - 4 sessions per week - Ultimate Value!',
      months: 12,
      sessionsPerWeek: 4,
      totalSessions: 208,
      pricePerSession: 140.00,
      totalCost: 29120.00,
      price: 29120.00,
      theme: 'ruby',
      isActive: true,
      displayOrder: 8
    }
  ];
  
  const createdPackages = [];
  
  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    console.log(`\n📝 Creating package ${i + 1}/8: ${pkg.name}`);
    console.log(`   💰 ${pkg.packageType === 'fixed' ? pkg.sessions + ' sessions' : pkg.totalSessions + ' sessions (' + pkg.months + ' months)'} @ $${pkg.pricePerSession}/session = $${pkg.totalCost}`);
    
    try {
      const created = await StorefrontItem.create(pkg);
      createdPackages.push(created);
      console.log(`   ✅ SUCCESS: Created with ID ${created.id}`);
    } catch (createError) {
      console.error(`   ❌ FAILED: ${createError.message}`);
      console.error(`   📋 Package data:`, JSON.stringify(pkg, null, 2));
      throw createError;
    }
  }
  
  console.log(`\n🎉 SUCCESS: Created ${createdPackages.length} packages!`);
  
  // Verify what we created
  console.log('\n🔍 Step 6: Verifying created packages...');
  const allPackages = await StorefrontItem.findAll({
    order: [['displayOrder', 'ASC']]
  });
  
  console.log(`📊 Final count: ${allPackages.length} packages in database`);
  console.log('\n📋 PACKAGE SUMMARY:');
  console.log('===================');
  
  allPackages.forEach((pkg, index) => {
    const sessionsText = pkg.packageType === 'fixed' 
      ? `${pkg.sessions} sessions` 
      : `${pkg.totalSessions} sessions (${pkg.months} months)`;
    
    console.log(`${index + 1}. ${pkg.name}`);
    console.log(`   💰 $${pkg.totalCost} (${sessionsText} @ $${pkg.pricePerSession}/session)`);
    console.log(`   🎨 Theme: ${pkg.theme} | Active: ${pkg.isActive}`);
    console.log('');
  });
  
  console.log('✅ SESSION PACKAGES SETUP COMPLETE!');
  console.log('🚀 Your SwanStudios storefront now has the correct pricing!');
  
  process.exit(0);
  
} catch (error) {
  console.error('\n💥 FATAL ERROR:', error.message);
  console.error('📚 Stack trace:', error.stack);
  process.exit(1);
}
