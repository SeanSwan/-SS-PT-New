import StorefrontItem from '../models/StorefrontItem.mjs';
import logger from '../utils/logger.mjs';

/**
 * Storefront Items Seeder (Updated - No $75 packages)
 * Creates premium training packages with $75 sessions removed
 * Only includes packages with $100+ per session
 */

const storefrontPackages = [
  // Fixed Session Packages - 1, 8, 20 sessions (removed 50-session package)
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
  }
  // NOTE: Removed Gold Transformation Program and all monthly packages (all had $75/session)
  // Now only includes packages with $100+ per session
];

/**
 * Seed storefront items (No $75 packages)
 */
export async function seedStorefrontItems() {
  try {
    logger.info('Starting storefront items seeding (No $75 packages)...');

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

    // Verify no $75 packages were created
    const packages75 = await StorefrontItem.findAll({
      where: { pricePerSession: 75.00 }
    });
    
    if (packages75.length === 0) {
      logger.info('✅ Confirmed: No packages with $75 per session');
    } else {
      logger.warn(`⚠️ Warning: Found ${packages75.length} packages with $75 per session`);
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
      console.log('Seeding completed successfully (No $75 packages)');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export default seedStorefrontItems;