// fix-storefront-packages.mjs
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

// Define the complete packages (from the working seeder)
const correctPackages = [
  // Fixed packages
  {
    id: 1,
    packageType: 'fixed',
    name: 'Gold Glimmer',
    description: 'An introductory 8-session package to ignite your transformation.',
    pricePerSession: 175,
    sessions: 8,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 8,
    totalCost: 1400,
    price: 1400,
    displayPrice: 1400,
    theme: 'cosmic',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    imageUrl: null
  },
  {
    id: 2,
    packageType: 'fixed',
    name: 'Platinum Pulse',
    description: 'Elevate your performance with 20 dynamic sessions.',
    pricePerSession: 165,
    sessions: 20,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 20,
    totalCost: 3300,
    price: 3300,
    displayPrice: 3300,
    theme: 'purple',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    imageUrl: null
  },
  {
    id: 3,
    packageType: 'fixed',
    name: 'Rhodium Rise',
    description: 'Unleash your inner champion with 50 premium sessions.',
    pricePerSession: 150,
    sessions: 50,
    months: null,
    sessionsPerWeek: null,
    totalSessions: 50,
    totalCost: 7500,
    price: 7500,
    displayPrice: 7500,
    theme: 'emerald',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    imageUrl: null
  },
  // Monthly packages
  {
    id: 4,
    packageType: 'monthly',
    name: 'Silver Storm',
    description: 'High intensity 3-month program at 4 sessions per week.',
    pricePerSession: 155,
    sessions: null,
    months: 3,
    sessionsPerWeek: 4,
    totalSessions: 48,
    totalCost: 7440,
    price: 7440,
    displayPrice: 7440,
    theme: 'cosmic',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    imageUrl: null
  },
  {
    id: 6,
    packageType: 'monthly',
    name: 'Gold Grandeur',
    description: 'Maximize your potential with 6 months at 4 sessions per week.',
    pricePerSession: 145,
    sessions: null,
    months: 6,
    sessionsPerWeek: 4,
    totalSessions: 96,
    totalCost: 13920,
    price: 13920,
    displayPrice: 13920,
    theme: 'purple',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    imageUrl: null
  },
  {
    id: 9,
    packageType: 'monthly',
    name: 'Platinum Prestige',
    description: 'The best value – 9 months at 4 sessions per week.',
    pricePerSession: 140,
    sessions: null,
    months: 9,
    sessionsPerWeek: 4,
    totalSessions: 144,
    totalCost: 20160,
    price: 20160,
    displayPrice: 20160,
    theme: 'ruby',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    imageUrl: null
  },
  {
    id: 12,
    packageType: 'monthly',
    name: 'Rhodium Reign',
    description: 'The ultimate value – 12 months at 4 sessions per week at an unbeatable rate.',
    pricePerSession: 135,
    sessions: null,
    months: 12,
    sessionsPerWeek: 4,
    totalSessions: 192,
    totalCost: 25920,
    price: 25920,
    displayPrice: 25920,
    theme: 'emerald',
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
    imageUrl: null
  }
];

async function fixStorefrontPackages() {
  // Database connection
  const sequelize = new Sequelize(
    process.env.PG_DB || 'swanstudios',
    process.env.PG_USER || 'swanadmin',
    process.env.PG_PASSWORD || 'postgres',
    {
      host: process.env.PG_HOST || 'localhost',
      port: process.env.PG_PORT || 5432,
      dialect: 'postgres',
      logging: console.log
    }
  );

  try {
    console.log('🔍 Checking current storefront items...');
    
    // Get current items
    const currentItems = await sequelize.query(
      'SELECT id, name, "packageType" FROM storefront_items ORDER BY id',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    console.log('Current storefront items:', currentItems);
    
    console.log('\\n🗑️ Clearing existing storefront items...');
    
    // Clear existing items
    await sequelize.query('DELETE FROM storefront_items');
    
    console.log('✅ Cleared existing items');
    
    console.log('\\n🔄 Inserting correct packages...');
    
    // Insert all correct packages
    for (const pkg of correctPackages) {
      const fields = Object.keys(pkg).map(key => `"${key}"`).join(', ');
      const values = Object.values(pkg).map(val => 
        val === null ? 'NULL' : typeof val === 'string' ? `'${val}'` : val
      ).join(', ');
      
      await sequelize.query(
        `INSERT INTO storefront_items (${fields}, "createdAt", "updatedAt") 
         VALUES (${values}, NOW(), NOW())`
      );
      
      console.log(`✓ Inserted: ${pkg.name}`);
    }
    
    console.log('\\n🔍 Verifying inserted packages...');
    
    // Verify the results
    const verifyItems = await sequelize.query(
      'SELECT id, name, "packageType", "displayPrice", theme FROM storefront_items ORDER BY id',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    console.log('\\nFinal storefront items:');
    verifyItems.forEach(item => {
      console.log(`ID: ${item.id}, Name: ${item.name}, Type: ${item.packageType}, Price: $${item.displayPrice}, Theme: ${item.theme}`);
    });
    
    console.log('\\n✅ Successfully fixed storefront packages!');
    console.log('\\nNow your training packages should display correctly with:');
    console.log('- Complete pricing information (displayPrice field)');
    console.log('- Proper themes for visual styling');
    console.log('- Full descriptions and package details');
    
  } catch (error) {
    console.error('❌ Error fixing storefront packages:', error);
  } finally {
    await sequelize.close();
  }
}

fixStorefrontPackages();
