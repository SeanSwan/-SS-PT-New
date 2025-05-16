import StorefrontItem from '../models/StorefrontItem.mjs';
import logger from '../utils/logger.mjs';

/**
 * Storefront Items Seeder - $140+ Sessions Only
 * Creates premium training packages with all sessions priced at $140 or above
 * This seeder replaces previous versions with packages below $140
 */

const storefrontPackages = [
  // Fixed Session Packages - All priced at $140+ per session
  {
    packageType: 'fixed',
    name: 'Single Session Assessment',
    description: 'Comprehensive fitness assessment and personalized training plan design. Perfect for getting started with expert guidance.',
    price: 175.00,
    displayPrice: 175.00,
    sessions: 1,
    pricePerSession: 175.00,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 1,
    imageUrl: null,
    theme: 'cosmic',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    itemType: 'TRAINING_PACKAGE_FIXED',
    category: 'Training Sessions',
    displayOrder: 1
  },
  {
    packageType: 'fixed',
    name: 'Gold Glimmer',
    description: 'An introductory 8-session package to ignite your transformation.',
    price: 1120.00,
    displayPrice: 1120.00,
    sessions: 8,
    pricePerSession: 140.00,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 8,
    imageUrl: null,
    theme: 'ruby',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    itemType: 'TRAINING_PACKAGE_FIXED',
    category: 'Training Sessions',
    displayOrder: 2
  },
  {
    packageType: 'fixed',
    name: 'Platinum Pulse',
    description: 'Elevate your performance with 20 dynamic sessions at premium pricing.',
    price: 2900.00,
    displayPrice: 2900.00,
    sessions: 20,
    pricePerSession: 145.00,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 20,
    imageUrl: null,
    theme: 'emerald',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    itemType: 'TRAINING_PACKAGE_FIXED',
    category: 'Training Sessions',
    displayOrder: 3
  },
  {
    packageType: 'fixed',
    name: 'Rhodium Rise',
    description: 'Unleash your inner champion with 50 premium sessions at excellent value.',
    price: 7500.00,
    displayPrice: 7500.00,
    sessions: 50,
    pricePerSession: 150.00,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 50,
    imageUrl: null,
    theme: 'cosmic',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    itemType: 'TRAINING_PACKAGE_FIXED',
    category: 'Training Sessions',
    displayOrder: 4
  },
  // Monthly Packages - All priced at $140+ per session
  {
    packageType: 'monthly',
    name: 'Silver Storm',
    description: 'High intensity 3-month program at 4 sessions per week.',
    price: 6720.00,
    displayPrice: 6720.00,
    sessions: null,
    pricePerSession: 140.00,
    months: 3,
    sessionsPerWeek: 4,
    totalSessions: 48,
    imageUrl: null,
    theme: 'purple',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    itemType: 'TRAINING_PACKAGE_SUBSCRIPTION',
    category: 'Monthly Subscriptions',
    displayOrder: 5
  },
  {
    packageType: 'monthly',
    name: 'Gold Grandeur',
    description: 'Maximize your potential with 6 months at 4 sessions per week.',
    price: 13920.00,
    displayPrice: 13920.00,
    sessions: null,
    pricePerSession: 145.00,
    months: 6,
    sessionsPerWeek: 4,
    totalSessions: 96,
    imageUrl: null,
    theme: 'emerald',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    itemType: 'TRAINING_PACKAGE_SUBSCRIPTION',
    category: 'Monthly Subscriptions',
    displayOrder: 6
  },
  {
    packageType: 'monthly',
    name: 'Platinum Prestige',
    description: 'The best value – 9 months at 4 sessions per week.',
    price: 21600.00,
    displayPrice: 21600.00,
    sessions: null,
    pricePerSession: 150.00,
    months: 9,
    sessionsPerWeek: 4,
    totalSessions: 144,
    imageUrl: null,
    theme: 'ruby',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    itemType: 'TRAINING_PACKAGE_SUBSCRIPTION',
    category: 'Monthly Subscriptions',
    displayOrder: 7
  },
  {
    packageType: 'monthly',
    name: 'Rhodium Reign',
    description: 'The ultimate value – 12 months at 4 sessions per week.',
    price: 28800.00,
    displayPrice: 28800.00,
    sessions: null,
    pricePerSession: 150.00,
    months: 12,
    sessionsPerWeek: 4,
    totalSessions: 192,
    imageUrl: null,
    theme: 'cosmic',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    itemType: 'TRAINING_PACKAGE_SUBSCRIPTION',
    category: 'Monthly Subscriptions',
    displayOrder: 8
  }
];

/**
 * Seed storefront items ($140+ only)
 */
export async function seedStorefrontItems() {
  try {
    logger.info('Starting storefront items seeding ($140+ per session only)...');

    // Clear existing data
    await StorefrontItem.destroy({ where: {} });
    logger.info('Cleared existing storefront items');

    // Create new packages
    const createdItems = await StorefrontItem.bulkCreate(storefrontPackages, {
      validate: true,
      individualHooks: true // Ensure hooks run for calculations
    });

    logger.info(`Successfully seeded ${createdItems.length} storefront items`);
    
    // Log created items for verification
    for (const item of createdItems) {
      logger.info(`Created: ${item.name} - $${item.price} - $${item.pricePerSession}/session - Theme: ${item.theme}`);
    }

    // Verify all packages meet $140+ requirement
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
      console.log('Seeding completed successfully ($140+ per session only)');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export default seedStorefrontItems;