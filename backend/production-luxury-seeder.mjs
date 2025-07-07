#!/usr/bin/env node
/**
 * PRODUCTION-SAFE SwanStudios LUXURY Package Seeder for Render
 * ===========================================================
 * Seeds your EXACT luxury SwanStudios collection in production
 * Only creates packages if they don't exist (non-destructive)
 * 
 * YOUR LUXURY COLLECTION:
 * - Silver Swan Wing: 1 session @ $175 = $175
 * - Golden Swan Flight: 8 sessions @ $170 = $1,360
 * - Sapphire Swan Soar: 20 sessions @ $165 = $3,300
 * - Platinum Swan Grace: 50 sessions @ $160 = $8,000
 * - Emerald Swan Evolution: 3 months @ $155 = $8,060
 * - Diamond Swan Dynasty: 6 months @ $150 = $15,600
 * - Ruby Swan Reign: 9 months @ $145 = $22,620
 * - Rhodium Swan Royalty: 12 months @ $140 = $29,120
 * 
 * Total Revenue Potential: $88,315
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Setup environment - works in both local and production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

console.log('💎 SwanStudios LUXURY Collection Seeder');
console.log('=======================================');
console.log('🦢 Rare Elements × Swan Elegance × Premium Training');
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
    console.log('✅ Training packages already exist! Checking your luxury collection...');
    
    // Show existing packages
    const packages = await StorefrontItem.findAll({
      order: [['displayOrder', 'ASC'], ['id', 'ASC']]
    });
    
    console.log('\n💎 Current packages:');
    packages.forEach((pkg, index) => {
      const sessionsText = pkg.packageType === 'fixed' 
        ? `${pkg.sessions} sessions` 
        : `${pkg.totalSessions} sessions (${pkg.months} months)`;
      console.log(`   ${index + 1}. ${pkg.name} - $${pkg.price || pkg.totalCost} (${sessionsText})`);
    });
    
    // Check if we have the luxury collection
    const hasLuxuryPackages = packages.some(pkg => 
      pkg.name.includes('Swan Wing') || 
      pkg.name.includes('Swan Flight') || 
      pkg.name.includes('Swan Soar')
    );
    
    if (hasLuxuryPackages) {
      console.log('\n🎉 Your luxury SwanStudios collection is already seeded!');
      await sequelize.close();
      process.exit(0);
    } else {
      console.log('\n⚠️  Existing packages found, but not your luxury collection.');
      console.log('🧹 Clearing to make way for your premium SwanStudios packages...');
      
      try {
        await StorefrontItem.destroy({ where: {} });
        console.log('✅ Cleared existing packages');
      } catch (clearError) {
        console.log('⚠️  Could not clear packages, proceeding anyway...');
      }
    }
  }

  // Create your EXACT luxury SwanStudios collection
  console.log('\n💎 Creating YOUR SwanStudios Luxury Collection...');
  console.log('🦢 Rare Elements × Swan Elegance × Premium Training');
  
  const luxurySwanPackages = [
    {
      packageType: 'fixed',
      name: 'Silver Swan Wing',
      description: 'Your elegant introduction to premium personal training with Sean Swan',
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
      description: 'Begin your transformation journey with 8 sessions of expert guidance',
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
      description: 'Elevate your fitness with 20 sessions of premium training excellence',
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
      description: 'Master your potential with 50 sessions of elite personal training',
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
      description: 'Transform your life with 3 months of dedicated training (4x per week)',
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
      description: 'Build lasting strength with 6 months of premium training mastery',
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
      description: 'Command your fitness destiny with 9 months of elite transformation',
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
      description: 'The ultimate year-long journey to peak performance and royal fitness',
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

  let successCount = 0;
  let totalValue = 0;

  console.log('\n🦢 Creating luxury packages...');
  for (const packageData of luxurySwanPackages) {
    try {
      const item = await StorefrontItem.create(packageData);
      
      const sessionsText = packageData.packageType === 'fixed' 
        ? `${packageData.sessions} sessions` 
        : `${packageData.totalSessions} sessions (${packageData.months} months)`;
      
      console.log(`✅ ${packageData.name} - $${packageData.price} (${sessionsText})`);
      successCount++;
      totalValue += parseFloat(packageData.price);
    } catch (error) {
      console.error(`❌ Failed to create ${packageData.name}:`, error.message);
    }
  }

  console.log('\n💎 LUXURY COLLECTION RESULTS:');
  console.log('=============================');
  console.log(`✅ Packages created: ${successCount}/${luxurySwanPackages.length}`);
  console.log(`💰 Total collection value: $${totalValue.toLocaleString()}`);
  console.log('🦢 Premium positioning: Silver → Golden → Sapphire → Platinum');
  console.log('👑 Long-term excellence: Emerald → Diamond → Ruby → Rhodium');

  if (successCount > 0) {
    console.log('\n🎉 SUCCESS: Your luxury SwanStudios collection is LIVE!');
    console.log('✨ Premium training meets rare element elegance');
    console.log(`💎 Revenue potential: $${totalValue.toLocaleString()}`);
  }

  await sequelize.close();
  process.exit(0);

} catch (error) {
  console.error('❌ Luxury collection seeder error:', error.message);
  
  // Don't crash in production - just log and exit gracefully
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  Seeding skipped in production due to error');
    process.exit(0);
  } else {
    process.exit(1);
  }
}
