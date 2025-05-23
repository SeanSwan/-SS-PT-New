#!/usr/bin/env node

/**
 * Direct Storefront Seeder - CORRECTED PRICING
 * 
 * Run this script to directly seed the corrected packages
 * Usage: node direct-seed-storefront.mjs
 */

// First, we need to set up the database connection
import sequelize from './backend/database.mjs';
import StorefrontItem from './backend/models/StorefrontItem.mjs';

const storefrontPackages = [
  // Fixed Session Packages
  {
    packageType: 'fixed',
    name: 'Single Session',
    description: 'Premium individual training session with Sean Swan.',
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
    displayOrder: 1,
    includedFeatures: JSON.stringify([
      'Personal trainer consultation',
      'Customized workout session',
      'Form assessment and correction',
      'Nutrition guidance'
    ])
  },
  {
    packageType: 'fixed',
    name: 'Silver Package',
    description: 'Great starter package with 8 premium training sessions.',
    sessions: 8,
    pricePerSession: 170.00,
    price: 1360.00,
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
    displayOrder: 2,
    includedFeatures: JSON.stringify([
      '8 personal training sessions',
      'Nutrition guidance',
      'Progress tracking',
      'Workout plan customization'
    ])
  },
  {
    packageType: 'fixed',
    name: 'Gold Package',
    description: 'Comprehensive training with 20 sessions for serious results.',
    sessions: 20,
    pricePerSession: 170.00,
    price: 3400.00,
    displayPrice: 3400.00,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 20,
    totalCost: 3400.00,
    imageUrl: '/assets/images/gold-package.jpg',
    theme: 'cosmic',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    displayOrder: 3,
    includedFeatures: JSON.stringify([
      '20 personal training sessions',
      'Detailed nutrition plan',
      'Body composition analysis',
      'Monthly progress reviews',
      'Exercise technique videos'
    ])
  },
  {
    packageType: 'fixed',
    name: 'Platinum Package',
    description: 'Ultimate transformation with 50 premium sessions.',
    sessions: 50,
    pricePerSession: 160.00,
    price: 8000.00,
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
    displayOrder: 4,
    includedFeatures: JSON.stringify([
      '50 personal training sessions',
      'Comprehensive meal planning',
      'Weekly body composition analysis',
      'Supplement recommendations',
      'Exercise video library access',
      'Priority scheduling'
    ])
  },
  
  // Monthly Packages - All 4 sessions per week
  {
    packageType: 'monthly',
    name: '3-Month Excellence',
    description: 'Intensive 3-month program with 4 sessions per week.',
    sessions: null,
    pricePerSession: 155.00,
    price: 7440.00,
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
    displayOrder: 5,
    includedFeatures: JSON.stringify([
      '48 training sessions (4 per week)',
      'Daily nutrition coaching',
      'Weekly progress assessments',
      'Habit formation guidance',
      'Mobile app access'
    ])
  },
  {
    packageType: 'monthly',
    name: '6-Month Mastery',
    description: 'Build lasting habits with 6 months of consistent training.',
    sessions: null,
    pricePerSession: 150.00,
    price: 14400.00,
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
    displayOrder: 6,
    includedFeatures: JSON.stringify([
      '96 training sessions (4 per week)',
      'Personalized meal prep plans',
      'Bi-weekly body composition scans',
      'Injury prevention protocols',
      'Guest workout buddy sessions',
      'Progress photos and measurements'
    ])
  },
  {
    packageType: 'monthly',
    name: '9-Month Transformation',
    description: 'Complete lifestyle transformation over 9 months.',
    sessions: null,
    pricePerSession: 145.00,
    price: 20880.00,
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
    displayOrder: 7,
    includedFeatures: JSON.stringify([
      '144 training sessions (4 per week)',
      'Quarterly fitness assessments',
      'Advanced nutritional coaching',
      'Recovery and sleep optimization',
      'Mindset coaching sessions',
      'VIP gym access privileges'
    ])
  },
  {
    packageType: 'monthly',
    name: '12-Month Elite Program',
    description: 'The ultimate yearly commitment for maximum results.',
    sessions: null,
    pricePerSession: 140.00,
    price: 26880.00,
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
    displayOrder: 8,
    includedFeatures: JSON.stringify([
      '192 training sessions (4 per week)',
      'Comprehensive health screening',
      'Monthly nutrition consultations',
      'Advanced performance metrics',
      'Exclusive client events',
      'Lifetime exercise video access',
      'Annual fitness retreat invitation'
    ])
  }
];

async function seedStorefront() {
  try {
    console.log('🚀 Starting direct storefront seeding...');
    
    // Test database connection
    console.log('📡 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Sync models
    console.log('🔄 Syncing database models...');
    await sequelize.sync();
    console.log('✅ Models synced');
    
    // Clear existing packages - handle foreign key constraints
    console.log('🗑️  Clearing existing packages...');
    try {
      // First, clear cart_items if they exist to avoid foreign key constraint
      await sequelize.query('DELETE FROM cart_items WHERE storefront_item_id IS NOT NULL', { type: sequelize.QueryTypes.DELETE });
      console.log('✅ Cart items cleared');
      
      // Now we can safely clear storefront_items
      await StorefrontItem.destroy({ where: {} });
      console.log('✅ Existing packages cleared');
    } catch (clearError) {
      console.log('⚠️  Warning during clearing:', clearError.message);
      // Try alternative approach - delete without truncate
      await StorefrontItem.destroy({ where: {}, force: true });
      console.log('✅ Packages cleared using alternative method');
    }
    
    // Create new packages
    console.log('📦 Creating new packages...');
    const createdItems = await StorefrontItem.bulkCreate(storefrontPackages, {
      validate: true,
      individualHooks: true
    });
    
    console.log(`✅ Successfully created ${createdItems.length} packages`);
    
    // Verify the packages
    console.log('\n📊 PACKAGE VERIFICATION:');
    for (const item of createdItems) {
      const sessionInfo = item.packageType === 'fixed' 
        ? `${item.sessions} sessions`
        : `${item.months} months (${item.totalSessions} sessions)`;
      console.log(`  ✓ ${item.name}: ${sessionInfo} @ ${item.pricePerSession}/session = ${item.price} total`);
    }
    
    console.log('\n🎉 SUCCESS! Storefront packages updated with correct pricing:');
    console.log('   • Single Session: $175/session');
    console.log('   • 8 Sessions: $170/session');
    console.log('   • 20 Sessions: $170/session (same as 8)');
    console.log('   • 50 Sessions: $160/session');
    console.log('   • 3 Months: $155/session');
    console.log('   • 6 Months: $150/session');
    console.log('   • 9 Months: $145/session');
    console.log('   • 12 Months: $140/session');
    
  } catch (error) {
    console.error('❌ Error seeding storefront:', error);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Make sure PostgreSQL is running');
    console.log('   2. Check your .env file has correct database settings');
    console.log('   3. Verify you\'re in the root project directory');
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the seeder
seedStorefront();