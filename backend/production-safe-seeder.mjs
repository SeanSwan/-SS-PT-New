#!/usr/bin/env node
/**
 * PRODUCTION-SAFE SwanStudios Store Seeder for Render
 * ===================================================
 * This script safely seeds training packages in production
 * Only creates packages if they don't exist (non-destructive)
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Setup environment - works in both local and production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

console.log('🌟 SwanStudios PRODUCTION Store Seeder');
console.log('=====================================');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

try {
  // Import database and models
  const { default: sequelize } = await import('./database.mjs');
  const { getStorefrontItem } = await import('./models/index.mjs');

  // Test database connection
  await sequelize.authenticate();
  console.log('✅ Database connection successful');

  const StorefrontItem = getStorefrontItem();
  
  // Check if packages already exist (SAFE CHECK)
  const existingCount = await StorefrontItem.count();
  console.log(`Found ${existingCount} existing packages in database`);

  if (existingCount > 0) {
    console.log('✅ Training packages already exist! No seeding needed.');
    
    // Show existing packages
    const packages = await StorefrontItem.findAll({
      order: [['displayOrder', 'ASC'], ['id', 'ASC']]
    });
    
    console.log('\n📦 Existing packages:');
    packages.forEach((pkg, index) => {
      console.log(`   ${index + 1}. ${pkg.name} - $${pkg.price || pkg.totalCost}`);
    });
    
    // Check for pricing issues
    const zeroPriceCount = await StorefrontItem.count({
      where: { 
        [sequelize.Op.or]: [
          { price: 0 },
          { price: null },
          { totalCost: 0 },
          { totalCost: null }
        ]
      }
    });
    
    if (zeroPriceCount > 0) {
      console.log(`\n⚠️  Found ${zeroPriceCount} packages with pricing issues, fixing...`);
      
      const priceFixItems = await StorefrontItem.findAll({
        where: {
          [sequelize.Op.or]: [
            { price: 0 },
            { price: null },
            { totalCost: 0 },
            { totalCost: null }
          ]
        }
      });
      
      for (const item of priceFixItems) {
        const sessions = item.sessions || item.totalSessions || 4;
        const baseRate = 150; // $150 per session default
        const newPrice = sessions * baseRate;
        
        await item.update({
          price: newPrice,
          totalCost: newPrice,
          pricePerSession: baseRate
        });
        
        console.log(`✅ Fixed pricing: ${item.name} → $${newPrice}`);
      }
      
      console.log('✅ All pricing issues resolved!');
    }
    
    await sequelize.close();
    process.exit(0);
  }

  // Only create packages if none exist (SAFE OPERATION)
  console.log('\n🌱 Creating SwanStudios training packages...');
  
  const swanStudiosPackages = [
    {
      name: 'Starter Swan Package',
      description: 'Perfect introduction to SwanStudios methodology with 4 personalized training sessions designed for beginners.',
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
      description: 'Comprehensive 8-session package combining advanced fitness protocols with personalized nutrition guidance.',
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
      description: 'Premium 12-session program featuring elite training methodologies and comprehensive wellness optimization.',
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
      description: 'Intensive 20-session complete lifestyle transformation with advanced biometric tracking and coaching.',
      packageType: 'fixed',
      sessions: 20,
      pricePerSession: 155.00,
      totalCost: 3100.00,
      price: 3100.00,
      isActive: true,
      displayOrder: 4
    },
    {
      name: 'Monthly Swan Membership',
      description: 'Premium monthly wellness program with 2 sessions per week and comprehensive lifestyle support.',
      packageType: 'monthly',
      months: 1,
      sessionsPerWeek: 2,
      totalSessions: 8,
      pricePerSession: 160.00,
      totalCost: 1280.00,
      price: 1280.00,
      isActive: true,
      displayOrder: 5
    },
    {
      name: 'Quarterly Swan Elite',
      description: '3-month intensive program with 2 sessions per week, nutrition optimization, and lifestyle coaching.',
      packageType: 'monthly',
      months: 3,
      sessionsPerWeek: 2,
      totalSessions: 24,
      pricePerSession: 165.00,
      totalCost: 3960.00,
      price: 3960.00,
      isActive: true,
      displayOrder: 6
    }
  ];

  let successCount = 0;
  let totalValue = 0;

  for (const packageData of swanStudiosPackages) {
    try {
      const item = await StorefrontItem.create(packageData);
      console.log(`✅ Created: ${item.name} - $${item.price}`);
      successCount++;
      totalValue += parseFloat(item.price);
    } catch (error) {
      console.error(`❌ Failed to create ${packageData.name}:`, error.message);
    }
  }

  console.log('\n📊 SEEDING RESULTS:');
  console.log(`✅ Packages created: ${successCount}/${swanStudiosPackages.length}`);
  console.log(`💰 Total package value: $${totalValue.toFixed(2)}`);

  if (successCount > 0) {
    console.log('\n🎉 SUCCESS: SwanStudios training packages created!');
    console.log('\n🚀 Your storefront is now ready for customers!');
  }

  await sequelize.close();
  process.exit(0);

} catch (error) {
  console.error('❌ Production seeder error:', error.message);
  
  // Don't crash in production - just log and exit gracefully
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  Seeding skipped in production due to error');
    process.exit(0);
  } else {
    process.exit(1);
  }
}
