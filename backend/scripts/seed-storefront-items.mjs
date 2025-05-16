// backend/scripts/seed-storefront-items.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get directory name equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const projectRootDir = path.resolve(rootDir, '..');

// Load the .env file from the project root directory
const envPath = path.resolve(projectRootDir, '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}`);
  dotenv.config(); // Try default location as a last resort
}

// Import database and StorefrontItem model
import sequelize from '../database.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';

/**
 * Seeds storefront items directly using the Sequelize model
 */
async function seedStorefrontItems() {
  try {
    console.log('----- Storefront Items Seeding Script -----');
    
    // 1. Test database connection
    console.log('1. Testing database connection...');
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established successfully.');
    } catch (error) {
      console.error(`❌ Unable to connect to the database: ${error.message}`);
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    // 2. Check if any storefront items already exist
    console.log('2. Checking for existing storefront items...');
    const existingItems = await StorefrontItem.findAll();
    
    if (existingItems.length > 0) {
      console.log(`✅ ${existingItems.length} storefront items already exist.`);
      console.log('   Deleting existing items and reseeding...');
      
      await StorefrontItem.destroy({ where: {} });
      console.log('   ✅ Existing storefront items deleted.');
    }
    
    // 3. Create storefront items
    console.log('3. Creating storefront items...');
    
    // Fixed packages - graduated pricing from $175 down to $140/session
    const fixedPackages = [
      {
        packageType: 'fixed',
        sessions: 1,
        pricePerSession: 175,
        totalCost: 175,
        price: 175,
        name: "Single Session",
        description: "Try a single session to experience our premium training.",
        theme: 'cosmic',
        isActive: true
      },
      {
        packageType: 'fixed',
        sessions: 8,
        pricePerSession: 170,
        totalCost: 1360,
        price: 1360,
        name: "Gold Glimmer",
        description: "An introductory 8-session package to ignite your transformation.",
        theme: 'cosmic',
        isActive: true
      },
      {
        packageType: 'fixed',
        sessions: 20,
        pricePerSession: 165,
        totalCost: 3300,
        price: 3300,
        name: "Platinum Pulse",
        description: "Elevate your performance with 20 dynamic sessions.",
        theme: 'purple',
        isActive: true
      },
      {
        packageType: 'fixed',
        sessions: 50,
        pricePerSession: 158,
        totalCost: 7900,
        price: 7900,
        name: "Rhodium Rise",
        description: "Unleash your inner champion with 50 premium sessions.",
        theme: 'emerald',
        isActive: true
      },
    ];

    // Monthly packages - graduated pricing from $160 down to $140/session
    const monthlyPackages = [
      { 
        packageType: 'monthly',
        months: 3, 
        sessionsPerWeek: 4, 
        pricePerSession: 160,
        totalSessions: 48,
        totalCost: 7680,
        price: 7680,
        name: 'Silver Storm', 
        description: 'High intensity 3-month program at 4 sessions per week.',
        theme: 'cosmic',
        isActive: true
      },
      { 
        packageType: 'monthly',
        months: 6, 
        sessionsPerWeek: 4, 
        pricePerSession: 150,
        totalSessions: 96,
        totalCost: 14400,
        price: 14400,
        name: 'Gold Grandeur', 
        description: 'Maximize your potential with 6 months at 4 sessions per week.',
        theme: 'purple',
        isActive: true
      },
      { 
        packageType: 'monthly',
        months: 9, 
        sessionsPerWeek: 4, 
        pricePerSession: 145,
        totalSessions: 144,
        totalCost: 20880,
        price: 20880,
        name: 'Platinum Prestige', 
        description: 'The best value – 9 months at 4 sessions per week.',
        theme: 'ruby',
        isActive: true
      },
      { 
        packageType: 'monthly',
        months: 12, 
        sessionsPerWeek: 4, 
        pricePerSession: 140,
        totalSessions: 192,
        totalCost: 26880,
        price: 26880,
        name: 'Rhodium Reign', 
        description: 'The ultimate value – 12 months at 4 sessions per week at an unbeatable rate.',
        theme: 'emerald',
        isActive: true
      },
    ];

    // Combine all packages
    const allPackages = [...fixedPackages, ...monthlyPackages];

    // Create all packages
    for (const pkg of allPackages) {
      await StorefrontItem.create(pkg);
      console.log(`✅ Created storefront item: ${pkg.name}`);
    }

    console.log('✅ All storefront items created successfully!');
    
    console.log('----- Storefront Items Seeding Complete -----');
    
  } catch (error) {
    console.error(`❌ Storefront items seeding failed: ${error.message}`);
    if (error.stack) {
      console.error(`Stack trace: ${error.stack}`);
    }
    throw error;
  } finally {
    // Close the database connection
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

// Execute the seeding
seedStorefrontItems().catch(error => {
  console.error(`Fatal error during storefront items seeding: ${error.message}`);
  process.exit(1);
});