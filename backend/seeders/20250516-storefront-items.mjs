import StorefrontItem from '../models/StorefrontItem.mjs';
import logger from '../utils/logger.mjs';

/**
 * Storefront Items Seeder
 * Creates premium training packages following the Master Prompt vision
 * Aligned with production-ready, AAA-quality standards
 */

const storefrontPackages = [
  // Fixed Session Packages - 1, 8, 20, 50 sessions
  {
    packageType: 'fixed',
    name: 'Single Session Assessment',
    description: 'Comprehensive fitness assessment and personalized training plan design. Perfect for getting started with expert guidance.',
    price: 150.00,
    displayPrice: 150.00,
    sessions: 1,
    pricePerSession: 150.00,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 1,
    imageUrl: null, // Using null - frontend will use fallback
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
    name: 'Bronze Performance Package',
    description: 'Perfect starter package for building fundamental strength and establishing proper form. Includes progress tracking and technique refinement.',
    price: 1000.00,
    displayPrice: 1000.00,
    sessions: 8,
    pricePerSession: 125.00,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 8,
    imageUrl: null, // Using null - frontend will use fallback
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
    name: 'Silver Elite Training',
    description: 'Comprehensive training package for serious fitness goals. Advanced programming with nutrition guidance and progress optimization.',
    price: 2000.00,
    displayPrice: 2000.00,
    sessions: 20,
    pricePerSession: 100.00,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 20,
    imageUrl: null, // Using null - frontend will use fallback
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
    name: 'Gold Transformation Program',
    description: 'Complete lifestyle transformation with premium coaching, meal planning, and 24/7 support. Maximum value for serious athletes.',
    price: 3750.00,
    displayPrice: 3750.00,
    sessions: 50,
    pricePerSession: 75.00,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 50,
    imageUrl: null, // Using null - frontend will use fallback
    theme: 'cosmic',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    itemType: 'TRAINING_PACKAGE_FIXED',
    category: 'Training Sessions',
    displayOrder: 4
  },
  // Monthly Packages - 3, 6, 9, 12 months
  {
    packageType: 'monthly',
    name: 'Starter Monthly Program',
    description: 'Build your fitness foundation with consistent weekly training. Perfect for beginners establishing healthy habits.',
    price: 900.00,
    displayPrice: 900.00,
    sessions: null,
    pricePerSession: 75.00,
    months: 3,
    sessionsPerWeek: 2,
    totalSessions: 24,
    imageUrl: null, // Using null - frontend will use fallback
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
    name: 'Peak Performance Program',
    description: 'Accelerated results with intensive training schedule. Ideal for athletes preparing for competition or major goals.',
    price: 1800.00,
    displayPrice: 1800.00,
    sessions: null,
    pricePerSession: 75.00,
    months: 6,
    sessionsPerWeek: 2,
    totalSessions: 48,
    imageUrl: null, // Using null - frontend will use fallback
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
    name: 'Elite Conditioning Program',
    description: 'Long-term conditioning for sustained fitness excellence. Complete lifestyle integration with ongoing support.',
    price: 2700.00,
    displayPrice: 2700.00,
    sessions: null,
    pricePerSession: 75.00,
    months: 9,
    sessionsPerWeek: 2,
    totalSessions: 72,
    imageUrl: null, // Using null - frontend will use fallback
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
    name: 'Annual Mastery Program',
    description: 'Complete year-long transformation journey. Maximum results with comprehensive coaching, nutrition, and lifestyle optimization.',
    price: 3600.00,
    displayPrice: 3600.00,
    sessions: null,
    pricePerSession: 75.00,
    months: 12,
    sessionsPerWeek: 2,
    totalSessions: 96,
    imageUrl: null, // Using null - frontend will use fallback
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
 * Seed storefront items
 */
export async function seedStorefrontItems() {
  try {
    logger.info('Starting storefront items seeding...');

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
      logger.info(`Created: ${item.name} - $${item.price} - Theme: ${item.theme}`);
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
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export default seedStorefrontItems;