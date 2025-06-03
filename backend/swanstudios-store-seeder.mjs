#!/usr/bin/env node
/**
 * SwanStudios Store Database Seeder
 * ================================
 * Populates the database with unified training packages for SwanStudios Store
 * This resolves the $0 pricing issue by ensuring proper packages exist in the database
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { existsSync } from 'fs';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment from project root
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.resolve(projectRoot, '.env');

if (existsSync(envPath)) {
  console.log(`[Seeder] Loading environment from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log('[Seeder] Warning: .env file not found at project root.');
  dotenv.config();
}

try {
  // Import database and models from backend
  const { default: sequelize } = await import('./database.mjs');
  const { default: StorefrontItem } = await import('./models/StorefrontItem.mjs');

  console.log('🌟 SwanStudios Store Database Seeder');
  console.log('====================================');
  console.log('');

  // Check database connection
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }

  // Define SwanStudios Store packages (unified training packages)
  const swanStudiosPackages = [
    {
      id: 1,
      packageType: 'fixed',
      name: 'Starter Swan Package',
      description: 'Perfect introduction to SwanStudios methodology with 4 personalized training sessions designed for beginners.',
      sessions: 4,
      pricePerSession: 140.00,
      totalCost: 560.00,
      price: 560.00,
      isActive: true,
      displayOrder: 1,
      imageUrl: '/assets/images/starter-package.jpg'
    },
    {
      id: 2,
      packageType: 'fixed',
      name: 'Silver Swan Elite',
      description: 'Comprehensive 8-session package combining advanced fitness protocols with personalized nutrition guidance.',
      sessions: 8,
      pricePerSession: 145.00,
      totalCost: 1160.00,
      price: 1160.00,
      isActive: true,
      displayOrder: 2,
      imageUrl: '/assets/images/silver-package.jpg'
    },
    {
      id: 3,
      packageType: 'fixed',
      name: 'Gold Swan Mastery',
      description: 'Premium 12-session program featuring elite training methodologies and comprehensive wellness optimization.',
      sessions: 12,
      pricePerSession: 150.00,
      totalCost: 1800.00,
      price: 1800.00,
      isActive: true,
      displayOrder: 3,
      imageUrl: '/assets/images/gold-package.jpg'
    },
    {
      id: 4,
      packageType: 'fixed',
      name: 'Platinum Swan Transformation',
      description: 'Intensive 20-session complete lifestyle transformation with advanced biometric tracking and coaching.',
      sessions: 20,
      pricePerSession: 155.00,
      totalCost: 3100.00,
      price: 3100.00,
      isActive: true,
      displayOrder: 4,
      imageUrl: '/assets/images/platinum-package.jpg'
    },
    {
      id: 5,
      packageType: 'monthly',
      name: 'Monthly Swan Membership',
      description: 'Premium monthly wellness program with 2 sessions per week and comprehensive lifestyle support.',
      months: 1,
      sessionsPerWeek: 2,
      totalSessions: 8,
      pricePerSession: 160.00,
      totalCost: 1280.00,
      price: 1280.00,
      isActive: true,
      displayOrder: 5,
      imageUrl: '/assets/images/monthly-package.jpg'
    },
    {
      id: 6,
      packageType: 'monthly',
      name: 'Quarterly Swan Elite',
      description: '3-month intensive program with 2 sessions per week, nutrition optimization, and lifestyle coaching.',
      months: 3,
      sessionsPerWeek: 2,
      totalSessions: 24,
      pricePerSession: 165.00,
      totalCost: 3960.00,
      price: 3960.00,
      isActive: true,
      displayOrder: 6,
      imageUrl: '/assets/images/quarterly-package.jpg'
    },
    {
      id: 7,
      packageType: 'monthly',
      name: 'Swan Lifestyle Program',
      description: '6-month comprehensive wellness transformation with 3 sessions per week and complete lifestyle optimization.',
      months: 6,
      sessionsPerWeek: 3,
      totalSessions: 72,
      pricePerSession: 170.00,
      totalCost: 12240.00,
      price: 12240.00,
      isActive: true,
      displayOrder: 7,
      imageUrl: '/assets/images/lifestyle-package.jpg'
    },
    {
      id: 8,
      packageType: 'monthly',
      name: 'Swan Elite Annual',
      description: 'The ultimate yearly wellness journey with 3 sessions per week, featuring comprehensive lifestyle transformation.',
      months: 12,
      sessionsPerWeek: 3,
      totalSessions: 144,
      pricePerSession: 175.00,
      totalCost: 25200.00,
      price: 25200.00,
      isActive: true,
      displayOrder: 8,
      imageUrl: '/assets/images/annual-package.jpg'
    }
  ];

  console.log('🗄️  Clearing existing storefront items...');
  
  // Clear existing items
  await StorefrontItem.destroy({ where: {} });
  console.log('✅ Existing items cleared');

  console.log('📦 Creating SwanStudios Store packages...');
  console.log('');

  // Create packages
  let successCount = 0;
  let totalRevenue = 0;

  for (const packageData of swanStudiosPackages) {
    try {
      const item = await StorefrontItem.create(packageData);
      console.log(`✅ Created: ${item.name}`);
      console.log(`   💰 Price: $${item.price} (${item.pricePerSession}/session)`);
      console.log(`   📊 Sessions: ${item.sessions || item.totalSessions}`);
      console.log(`   📋 Type: ${item.packageType}`);
      console.log('');
      
      successCount++;
      totalRevenue += parseFloat(item.price);
    } catch (error) {
      console.error(`❌ Failed to create ${packageData.name}:`, error.message);
    }
  }

  // Verify the seeding
  console.log('🔍 Verifying packages...');
  const verifyItems = await StorefrontItem.findAll({
    order: [['displayOrder', 'ASC']]
  });

  console.log('');
  console.log('📊 SEEDING RESULTS:');
  console.log('===================');
  console.log(`✅ Packages created: ${successCount}/${swanStudiosPackages.length}`);
  console.log(`💰 Total revenue potential: $${totalRevenue.toFixed(2)}`);
  console.log(`🗄️  Database packages: ${verifyItems.length}`);
  console.log('');

  if (verifyItems.length > 0) {
    console.log('📋 Package Summary:');
    verifyItems.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.name} - $${item.price} (${item.packageType})`);
    });
    console.log('');
  }

  if (successCount === swanStudiosPackages.length) {
    console.log('🎉 SUCCESS: All SwanStudios Store packages created successfully!');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. Start your backend server');
    console.log('   2. Test the frontend store at /shop');
    console.log('   3. Verify packages display with correct pricing');
    console.log('   4. Test add to cart and checkout functionality');
    console.log('');
  } else {
    console.log('⚠️  WARNING: Some packages failed to create. Check error messages above.');
  }

  await sequelize.close();
  process.exit(0);

} catch (error) {
  console.error('❌ Seeder failed:', error.message);
  console.error('');
  console.log('💡 Troubleshooting:');
  console.log('   - Ensure PostgreSQL is running');
  console.log('   - Check database connection string in .env');
  console.log('   - Verify all required environment variables are set');
  console.log('   - Make sure the database exists');
  process.exit(1);
}
