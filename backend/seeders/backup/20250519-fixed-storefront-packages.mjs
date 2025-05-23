/**
 * AUTHORITATIVE STOREFRONT PACKAGES SEEDER (FIXED VERSION)
 * Creates exactly 8 packages with the correct pricing structure:
 * - Fixed: 1, 8, 20, 50 sessions
 * - Monthly: 3, 6, 9, 12 months (4 sessions/week)
 * 
 * This is the SINGLE source of truth for all packages.
 * No other seeders should create storefront packages.
 */

import StorefrontItem from '../models/StorefrontItem.mjs';
import logger from '../utils/logger.mjs';
import { Sequelize } from 'sequelize';

// Define the exact 8 packages with graduated pricing
const PACKAGES_TO_SEED = [
  // === FIXED SESSION PACKAGES ===
  {
    packageType: 'fixed',
    name: 'Single Session',
    description: 'Try a premium training session with Sean Swan.',
    sessions: 1,
    pricePerSession: 175.00,
    price: 175.00,
    displayPrice: 175.00,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 1,
    totalCost: 175.00,
    imageUrl: '/assets/images/single-session.jpg',
    theme: 'ruby',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 1
  },
  {
    packageType: 'fixed',
    name: 'Silver Package',
    description: 'Perfect starter package with 8 premium training sessions.',
    sessions: 8,
    pricePerSession: 170.00,  // $170 per session
    price: 1360.00,           // 8 x $170 = $1,360
    displayPrice: 1360.00,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 8,
    totalCost: 1360.00,
    imageUrl: '/assets/images/silver-package.jpg',
    theme: 'emerald',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 2
  },
  {
    packageType: 'fixed',
    name: 'Gold Package',
    description: 'Comprehensive training with 20 sessions for serious results.',
    sessions: 20,
    pricePerSession: 165.00,  // $165 per session
    price: 3300.00,           // 20 x $165 = $3,300
    displayPrice: 3300.00,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 20,
    totalCost: 3300.00,
    imageUrl: '/assets/images/gold-package.jpg',
    theme: 'cosmic',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 3
  },
  {
    packageType: 'fixed',
    name: 'Platinum Package',
    description: 'Ultimate transformation with 50 premium sessions.',
    sessions: 50,
    pricePerSession: 160.00,  // $160 per session
    price: 8000.00,           // 50 x $160 = $8,000
    displayPrice: 8000.00,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 50,
    totalCost: 8000.00,
    imageUrl: '/assets/images/platinum-package.jpg',
    theme: 'purple',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 4
  },
  
  // === MONTHLY PACKAGES ===
  {
    packageType: 'monthly',
    name: '3-Month Excellence',
    description: 'Intensive 3-month program with 4 sessions per week.',
    sessions: null,
    pricePerSession: 155.00,  // $155 per session
    price: 7440.00,           // 48 sessions x $155 = $7,440
    displayPrice: 7440.00,
    months: 3,
    sessionsPerWeek: 4,
    totalSessions: 48,
    totalCost: 7440.00,
    imageUrl: '/assets/images/3-month-package.jpg',
    theme: 'emerald',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 5
  },
  {
    packageType: 'monthly',
    name: '6-Month Mastery',
    description: 'Build lasting habits with 6 months of consistent training.',
    sessions: null,
    pricePerSession: 150.00,  // $150 per session
    price: 14400.00,          // 96 sessions x $150 = $14,400
    displayPrice: 14400.00,
    months: 6,
    sessionsPerWeek: 4,
    totalSessions: 96,
    totalCost: 14400.00,
    imageUrl: '/assets/images/6-month-package.jpg',
    theme: 'cosmic',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 6
  },
  {
    packageType: 'monthly',
    name: '9-Month Transformation',
    description: 'Complete lifestyle transformation over 9 months.',
    sessions: null,
    pricePerSession: 145.00,  // $145 per session
    price: 20880.00,          // 144 sessions x $145 = $20,880
    displayPrice: 20880.00,
    months: 9,
    sessionsPerWeek: 4,
    totalSessions: 144,
    totalCost: 20880.00,
    imageUrl: '/assets/images/9-month-package.jpg',
    theme: 'ruby',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 7
  },
  {
    packageType: 'monthly',
    name: '12-Month Elite Program',
    description: 'The ultimate yearly commitment for maximum results.',
    sessions: null,
    pricePerSession: 140.00,  // $140 per session
    price: 26880.00,          // 192 sessions x $140 = $26,880
    displayPrice: 26880.00,
    months: 12,
    sessionsPerWeek: 4,
    totalSessions: 192,
    totalCost: 26880.00,
    imageUrl: '/assets/images/12-month-package.jpg',
    theme: 'purple',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 8
  }
];

/**
 * Simple approach to clear all packages and seed fresh ones
 */
async function seedPackages() {
  try {
    console.log('🌱 Starting fresh package seeding...\n');
    
    // First clear all existing packages completely
    console.log('🧹 Clearing all existing packages...');
    await StorefrontItem.destroy({ where: {}, force: true });
    
    // Reset the ID sequence to ensure we start at 1
    await StorefrontItem.sequelize.query('ALTER SEQUENCE IF EXISTS storefront_items_id_seq RESTART WITH 1;');
    console.log('✅ All packages cleared, ID sequence reset\n');
    
    // Create all packages at once
    console.log('📦 Creating fresh packages...');
    const createdPackages = await StorefrontItem.bulkCreate(PACKAGES_TO_SEED, {
      validate: true,
      individualHooks: true,
    });
    
    console.log(`✅ Successfully created ${createdPackages.length} packages\n`);
    
    // Verify the results
    console.log('=== VERIFICATION: PACKAGES CREATED ===\n');
    
    // Display fixed packages
    console.log('📦 Fixed Session Packages:');
    const fixedItems = createdPackages.filter(item => item.packageType === 'fixed')
      .sort((a, b) => (a.sessions || 0) - (b.sessions || 0));
    
    fixedItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}: ${item.sessions} sessions @ $${item.pricePerSession}/session = $${item.price}`);
    });
    
    // Display monthly packages
    console.log('\n📅 Monthly Packages:');
    const monthlyItems = createdPackages.filter(item => item.packageType === 'monthly')
      .sort((a, b) => (a.months || 0) - (b.months || 0));
    
    monthlyItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}: ${item.months} months (${item.totalSessions} sessions) @ $${item.pricePerSession}/session = $${item.price}`);
    });
    
    // Final verification counts
    console.log(`\n📊 Package Summary:`);
    console.log(`- Fixed Packages: ${fixedItems.length}`);
    console.log(`- Monthly Packages: ${monthlyItems.length}`);
    console.log(`- Total Packages: ${createdPackages.length}`);
    
    if (createdPackages.length === 8) {
      console.log('\n🎉 SUCCESS: All 8 packages created successfully!');
      logger.info('Package seeding completed successfully - all 8 packages created with correct pricing');
    } else {
      throw new Error(`Expected 8 packages but found ${createdPackages.length}`);
    }
    
    return createdPackages;
    
  } catch (error) {
    console.error('❌ Error during package seeding:', error);
    logger.error('Package seeding failed:', error);
    throw error;
  }
}

// Allow script to be run directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  // Ensure database is initialized
  import('../models/index.mjs').then(() => {
    return seedPackages();
  })
    .then(() => {
      console.log('\n✅ Package seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Package seeding failed:', error);
      process.exit(1);
    });
}

export default seedPackages;