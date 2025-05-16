// /backend/seedStorefrontItems.mjs

import StorefrontItem from './models/StorefrontItem.mjs';
import sequelize from './database.mjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Seed Storefront Items
 * 
 * This script ensures that all storefront items used in the frontend
 * exist in the database with matching IDs. Run this script at server startup
 * or as a one-time operation to initialize the database.
 */
const seedStorefrontItems = async () => {
  try {
    console.log('Starting to seed storefront items...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connection established');

    // Define fixed packages - All sessions priced at $140 or above
    const fixedPackages = [
      {
        id: 1,
        packageType: 'fixed',
        name: "Single Session",
        description: "Try a single session to experience our premium training.",
        sessions: 1,
        pricePerSession: 175,
        totalCost: 175
      },
      {
        id: 2,
        packageType: 'fixed',
        name: "Gold Glimmer",
        description: "An introductory 8-session package to ignite your transformation.",
        sessions: 8,
        pricePerSession: 170,
        totalCost: 1360
      },
      {
        id: 3,
        packageType: 'fixed',
        name: "Platinum Pulse",
        description: "Elevate your performance with 20 dynamic sessions.",
        sessions: 20,
        pricePerSession: 165,
        totalCost: 3300
      },
      {
        id: 4,
        packageType: 'fixed',
        name: "Rhodium Rise",
        description: "Unleash your inner champion with 50 premium sessions.",
        sessions: 50,
        pricePerSession: 158,
        totalCost: 7900
      }
    ];

    // Define monthly packages - All sessions priced at $140 or above
    const monthlyPackages = [
      { 
        id: 5,
        packageType: 'monthly',
        name: 'Silver Storm',
        description: 'High intensity 3-month program at 4 sessions per week.',
        months: 3,
        sessionsPerWeek: 4,
        pricePerSession: 160,
        totalSessions: 48,
        totalCost: 7680
      },
      { 
        id: 6,
        packageType: 'monthly',
        name: 'Gold Grandeur',
        description: 'Maximize your potential with 6 months at 4 sessions per week.',
        months: 6,
        sessionsPerWeek: 4,
        pricePerSession: 150,
        totalSessions: 96,
        totalCost: 14400
      },
      { 
        id: 7,
        packageType: 'monthly',
        name: 'Platinum Prestige',
        description: 'The best value – 9 months at 4 sessions per week.',
        months: 9,
        sessionsPerWeek: 4,
        pricePerSession: 145,
        totalSessions: 144,
        totalCost: 20880
      },
      { 
        id: 8,
        packageType: 'monthly',
        name: 'Rhodium Reign',
        description: 'The ultimate value – 12 months at 4 sessions per week at an unbeatable rate.',
        months: 12,
        sessionsPerWeek: 4,
        pricePerSession: 140,
        totalSessions: 192,
        totalCost: 26880
      }
    ];

    // Combine all packages
    const allPackages = [...fixedPackages, ...monthlyPackages];
    
    // Check which packages need to be created
    for (const pkg of allPackages) {
      try {
        const [item, created] = await StorefrontItem.findOrCreate({
          where: { id: pkg.id },
          defaults: pkg
        });
        
        if (created) {
          console.log(`✅ Created package: ${pkg.name} (ID: ${pkg.id})`);
        } else {
          // Update the item to ensure all properties match
          await item.update(pkg);
          console.log(`✅ Updated package: ${pkg.name} (ID: ${pkg.id})`);
        }
      } catch (error) {
        console.error(`❌ Error processing package ${pkg.name} (ID: ${pkg.id}):`, error);
      }
    }
    
    console.log('✅ Storefront items seeding completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error seeding storefront items:', error);
    return false;
  }
};

// If this script is run directly (not imported)
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedStorefrontItems()
    .then(() => {
      console.log('Seeding process completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Seeding process failed:', error);
      process.exit(1);
    });
}

export default seedStorefrontItems;