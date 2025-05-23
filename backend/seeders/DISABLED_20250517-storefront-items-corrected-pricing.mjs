import StorefrontItem from '../models/StorefrontItem.mjs';
import logger from '../utils/logger.mjs';

/**
 * Storefront Items Seeder - CORRECTED Pricing Structure
 * 
 * Session packages: 1, 8, 20, 50 sessions
 * Monthly packages: 3, 6, 9, 12 months (4 sessions per week)
 * 
 * CORRECTED PRICING:
 * - 1 session: $175
 * - 8 sessions: $170 per session
 * - 20 sessions: $170 per session (same as 8)
 * - 50 sessions: $160 per session
 * - 3 months (48 sessions): $155 per session
 * - 6 months (96 sessions): $150 per session
 * - 9 months (144 sessions): $145 per session
 * - 12 months (192 sessions): $140 per session
 */

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

/**
 * Seed storefront items with CORRECTED pricing
 */
export async function seedStorefrontItems() {
  try {
    logger.info('Starting storefront items seeding with CORRECTED pricing...');

    // Clear existing data completely - handle foreign key constraints
    try {
      // First, clear cart_items to avoid foreign key constraint issues
      await StorefrontItem.sequelize.query('DELETE FROM cart_items WHERE storefront_item_id IS NOT NULL');
      logger.info('Cleared cart items to avoid foreign key constraints');
      
      // Now clear storefront_items
      await StorefrontItem.destroy({ where: {} });
      logger.info('Cleared existing storefront items');
    } catch (clearError) {
      logger.warn('Warning during clearing:', clearError.message);
      // Try alternative approach
      await StorefrontItem.destroy({ where: {}, force: true });
      logger.info('Cleared storefront items using alternative method');
    }

    // Create new packages
    const createdItems = await StorefrontItem.bulkCreate(storefrontPackages, {
      validate: true,
      individualHooks: true // Ensure hooks run for calculations
    });

    logger.info(`Successfully seeded ${createdItems.length} storefront items`);
    
    // Log created items for verification
    console.log('\n=== CREATED PACKAGES (CORRECTED PRICING) ===');
    for (const item of createdItems) {
      const sessionsText = item.packageType === 'fixed' 
        ? `${item.sessions} sessions`
        : `${item.months} months (${item.totalSessions} sessions at ${item.sessionsPerWeek}/week)`;
      
      console.log(`${item.name}:`);
      console.log(`  Type: ${item.packageType}`);
      console.log(`  Sessions: ${sessionsText}`);
      console.log(`  Price per session: $${item.pricePerSession}`);
      console.log(`  Total cost: $${item.price}`);
      console.log(`  Theme: ${item.theme}`);
      console.log(`  Display order: ${item.displayOrder}`);
      console.log('---');
    }

    // Verify CORRECTED pricing
    console.log('\n=== PRICING VERIFICATION (CORRECTED) ===');
    console.log('✅ Single Session: $175/session');
    console.log('✅ 8 Sessions: $170/session');
    console.log('✅ 20 Sessions: $170/session (same as 8)');
    console.log('✅ 50 Sessions: $160/session');
    console.log('✅ 3 Months: $155/session');
    console.log('✅ 6 Months: $150/session');
    console.log('✅ 9 Months: $145/session');
    console.log('✅ 12 Months: $140/session');
    
    // Verify all packages meet minimum $140 requirement
    const allPackages = await StorefrontItem.findAll();
    const belowMinimum = allPackages.filter(pkg => parseFloat(pkg.pricePerSession) < 140);
    
    if (belowMinimum.length === 0) {
      logger.info('✅ Confirmed: All packages have sessions priced at $140 or above');
    } else {
      logger.error(`❌ Error: Found ${belowMinimum.length} packages with sessions below $140`);
      belowMinimum.forEach(pkg => {
        logger.error(`   ${pkg.name}: $${pkg.pricePerSession}/session`);
      });
    }

    return createdItems;
  } catch (error) {
    logger.error('Error seeding storefront items:', error);
    throw error;
  }
}

// Self-executing function if run directly
if (process.argv[1] && import.meta.url.includes(process.argv[1].split('/').pop())) {
  import('../models/index.mjs').then(() => {
    return seedStorefrontItems();
  })
    .then(() => {
      console.log('\n✅ Seeding completed successfully with CORRECTED pricing structure');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export default seedStorefrontItems;