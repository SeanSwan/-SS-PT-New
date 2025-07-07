#!/usr/bin/env node
/**
 * Emergency Storefront Fix Script
 * ==============================
 * Quick fix for missing training packages and common integration issues
 */

import dotenv from 'dotenv';
dotenv.config();

console.log('🚨 SwanStudios Emergency Storefront Fix');
console.log('=======================================');
console.log('');

try {
  const { default: sequelize } = await import('./database.mjs');
  const { getStorefrontItem } = await import('./models/index.mjs');

  // Test database connection
  await sequelize.authenticate();
  console.log('✅ Database connected');

  const StorefrontItem = getStorefrontItem();
  
  // Check existing packages
  const existingCount = await StorefrontItem.count();
  console.log(`Found ${existingCount} existing packages`);
  
  if (existingCount === 0) {
    console.log('🌱 Creating essential training packages...');
    
    const essentialPackages = [
      {
        name: 'Starter Swan Package',
        description: 'Perfect introduction to SwanStudios methodology with 4 personalized training sessions.',
        packageType: 'fixed',
        sessions: 4,
        pricePerSession: 140.00,
        totalCost: 560.00,
        price: 560.00,
        isActive: true,
        displayOrder: 1
      },
      {
        name: 'Silver Swan Elite',
        description: 'Comprehensive 8-session package with advanced fitness protocols.',
        packageType: 'fixed',
        sessions: 8,
        pricePerSession: 145.00,
        totalCost: 1160.00,
        price: 1160.00,
        isActive: true,
        displayOrder: 2
      },
      {
        name: 'Gold Swan Mastery',
        description: 'Premium 12-session program with elite training methodologies.',
        packageType: 'fixed',
        sessions: 12,
        pricePerSession: 150.00,
        totalCost: 1800.00,
        price: 1800.00,
        isActive: true,
        displayOrder: 3
      },
      {
        name: 'Platinum Swan Transformation',
        description: 'Intensive 20-session complete lifestyle transformation.',
        packageType: 'fixed',
        sessions: 20,
        pricePerSession: 155.00,
        totalCost: 3100.00,
        price: 3100.00,
        isActive: true,
        displayOrder: 4
      }
    ];
    
    let created = 0;
    for (const pkg of essentialPackages) {
      try {
        await StorefrontItem.create(pkg);
        console.log(`✅ Created: ${pkg.name} - $${pkg.price}`);
        created++;
      } catch (error) {
        console.error(`❌ Failed to create ${pkg.name}:`, error.message);
      }
    }
    
    console.log(`🎉 Created ${created} essential packages!`);
  } else {
    console.log('✅ Packages already exist, checking pricing...');
    
    const zeroPriceCount = await StorefrontItem.count({
      where: { price: 0 }
    });
    
    if (zeroPriceCount > 0) {
      console.log(`⚠️  Found ${zeroPriceCount} packages with $0 pricing, fixing...`);
      
      const zeroPriceItems = await StorefrontItem.findAll({
        where: { price: 0 }
      });
      
      for (const item of zeroPriceItems) {
        const sessions = item.sessions || item.totalSessions || 1;
        const newPrice = sessions * 150; // Default $150 per session
        
        await item.update({ 
          price: newPrice,
          totalCost: newPrice,
          pricePerSession: 150
        });
        
        console.log(`✅ Fixed pricing for ${item.name}: $0 → $${newPrice}`);
      }
    }
  }
  
  // Final verification
  const finalPackages = await StorefrontItem.findAll({
    order: [['displayOrder', 'ASC']]
  });
  
  console.log('');
  console.log('📊 FINAL STATUS:');
  console.log(`✅ Total packages: ${finalPackages.length}`);
  finalPackages.forEach((pkg, index) => {
    console.log(`   ${index + 1}. ${pkg.name} - $${pkg.price}`);
  });
  
  console.log('');
  console.log('🎉 Emergency fix completed! Try accessing your storefront now.');
  
  await sequelize.close();
  process.exit(0);
  
} catch (error) {
  console.error('❌ Emergency fix failed:', error.message);
  process.exit(1);
}
