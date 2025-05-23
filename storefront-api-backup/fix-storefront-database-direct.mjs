#!/usr/bin/env node

/**
 * FINAL DIRECT DATABASE FIX
 * Connects directly to PostgreSQL and replaces all packages
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

// The 8 correct packages
const CORRECT_PACKAGES = [
  // Fixed packages
  {
    packageType: 'fixed',
    name: 'Single Session',
    description: 'Try a premium training session with Sean Swan.',
    price: 175.00,
    sessions: 1,
    pricePerSession: 175.00,
    totalCost: 175.00,
    theme: 'ruby',
    displayOrder: 1
  },
  {
    packageType: 'fixed',
    name: 'Silver Package',
    description: 'Perfect starter package with 8 premium training sessions.',
    price: 1320.00,
    sessions: 8,
    pricePerSession: 165.00,
    totalCost: 1320.00,
    theme: 'emerald',
    displayOrder: 2
  },
  {
    packageType: 'fixed',
    name: 'Gold Package',
    description: 'Comprehensive training with 20 sessions for serious results.',
    price: 3100.00,
    sessions: 20,
    pricePerSession: 155.00,
    totalCost: 3100.00,
    theme: 'cosmic',
    displayOrder: 3
  },
  {
    packageType: 'fixed',
    name: 'Platinum Package',
    description: 'Ultimate transformation with 50 premium sessions.',
    price: 7500.00,
    sessions: 50,
    pricePerSession: 150.00,
    totalCost: 7500.00,
    theme: 'purple',
    displayOrder: 4
  },
  // Monthly packages
  {
    packageType: 'monthly',
    name: '3-Month Excellence',
    description: 'Intensive 3-month program with 4 sessions per week.',
    price: 6960.00,
    months: 3,
    sessionsPerWeek: 4,
    pricePerSession: 145.00,
    totalSessions: 48,
    totalCost: 6960.00,
    theme: 'emerald',
    displayOrder: 5
  },
  {
    packageType: 'monthly',
    name: '6-Month Mastery',
    description: 'Build lasting habits with 6 months of consistent training.',
    price: 13680.00,
    months: 6,
    sessionsPerWeek: 4,
    pricePerSession: 142.50,
    totalSessions: 96,
    totalCost: 13680.00,
    theme: 'cosmic',
    displayOrder: 6
  },
  {
    packageType: 'monthly',
    name: '9-Month Transformation',
    description: 'Complete lifestyle transformation over 9 months.',
    price: 20340.00,
    months: 9,
    sessionsPerWeek: 4,
    pricePerSession: 141.25,
    totalSessions: 144,
    totalCost: 20340.00,
    theme: 'ruby',
    displayOrder: 7
  },
  {
    packageType: 'monthly',
    name: '12-Month Elite Program',
    description: 'The ultimate yearly commitment for maximum results.',
    price: 26880.00,
    months: 12,
    sessionsPerWeek: 4,
    pricePerSession: 140.00,
    totalSessions: 192,
    totalCost: 26880.00,
    theme: 'purple',
    displayOrder: 8
  }
];

async function fixStorefrontDirect() {
  let client;
  
  try {
    console.log('🔧 FINAL DIRECT DATABASE FIX');
    console.log('==============================\\n');
    
    // Create database connection
    const { Client } = pg;
    client = new Client({
      host: process.env.PG_HOST || 'localhost',
      port: process.env.PG_PORT || 5432,
      database: process.env.PG_DB || 'swanstudios',
      user: process.env.PG_USER || 'swanadmin',
      password: process.env.PG_PASSWORD
    });
    
    // Connect to database
    console.log('🔗 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to database\\n');
    
    // Step 1: Check current packages
    console.log('1. Checking current packages...');
    const currentResult = await client.query('SELECT COUNT(*) as count FROM storefront_items');
    console.log(`   Found ${currentResult.rows[0].count} packages\\n`);
    
    // Step 2: Delete all packages
    console.log('2. Deleting ALL packages...');
    await client.query('DELETE FROM storefront_items WHERE 1=1');
    await client.query('ALTER SEQUENCE storefront_items_id_seq RESTART WITH 1');
    console.log('   ✅ All packages deleted\\n');
    
    // Step 3: Insert correct packages
    console.log('3. Creating 8 correct packages...');
    
    for (let i = 0; i < CORRECT_PACKAGES.length; i++) {
      const pkg = CORRECT_PACKAGES[i];
      console.log(`   Creating ${i + 1}/8: ${pkg.name}...`);
      
      if (pkg.packageType === 'fixed') {
        // Fixed package
        await client.query(`
          INSERT INTO storefront_items 
          ("packageType", name, description, price, sessions, "pricePerSession", "totalCost", theme, "displayOrder", "isActive", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        `, [
          pkg.packageType, pkg.name, pkg.description, pkg.price, pkg.sessions,
          pkg.pricePerSession, pkg.totalCost, pkg.theme, pkg.displayOrder, true
        ]);
      } else {
        // Monthly package
        await client.query(`
          INSERT INTO storefront_items 
          ("packageType", name, description, price, months, "sessionsPerWeek", "pricePerSession", "totalSessions", "totalCost", theme, "displayOrder", "isActive", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        `, [
          pkg.packageType, pkg.name, pkg.description, pkg.price, pkg.months,
          pkg.sessionsPerWeek, pkg.pricePerSession, pkg.totalSessions, pkg.totalCost,
          pkg.theme, pkg.displayOrder, true
        ]);
      }
      
      console.log(`   ✅ ${pkg.name} created`);
    }
    
    // Step 4: Verify results
    console.log('\\n4. Verifying results...');
    const finalResult = await client.query('SELECT COUNT(*) as count FROM storefront_items');
    const finalCount = parseInt(finalResult.rows[0].count);
    
    console.log(`   Final count: ${finalCount} packages`);
    
    if (finalCount === 8) {
      console.log('\\n🎉 SUCCESS! Database fixed with exactly 8 packages');
      console.log('======================================================');
      
      // Show the packages
      const packagesResult = await client.query(`
        SELECT name, "packageType", sessions, months, "pricePerSession", price 
        FROM storefront_items 
        ORDER BY "displayOrder"
      `);
      
      console.log('\\n✅ Fixed Session Packages:');
      packagesResult.rows.filter(p => p.packageType === 'fixed').forEach((pkg, i) => {
        console.log(`${i + 1}. ${pkg.name}: ${pkg.sessions} sessions @ $${pkg.pricePerSession}/session = $${pkg.price}`);
      });
      
      console.log('\\n✅ Monthly Packages:');
      packagesResult.rows.filter(p => p.packageType === 'monthly').forEach((pkg, i) => {
        const sessions = pkg.months * 4 * 4; // months * weeks * sessions per week
        console.log(`${i + 1}. ${pkg.name}: ${pkg.months} months @ $${pkg.pricePerSession}/session = $${pkg.price}`);
      });
      
      console.log('\\n======================================================');
      console.log('✅ Refresh your browser - it should now show exactly 8 packages');
      console.log('✅ No more duplicates');
      console.log('✅ Correct names and pricing');
      console.log('======================================================\\n');
      
    } else {
      console.log(`\\n❌ ERROR: Expected 8 packages, got ${finalCount}`);
    }
    
  } catch (error) {
    console.error('\\n❌ Database fix failed:', error);
    console.error('\\nPlease check:');
    console.error('- Database is running');
    console.error('- Database credentials in .env file');
    console.error('- PostgreSQL connection');
    throw error;
  } finally {
    if (client) {
      await client.end();
      console.log('🔗 Database connection closed');
    }
  }
}

// Run the fix
console.log('Starting direct database fix...\\n');
fixStorefrontDirect()
  .then(() => {
    console.log('✅ Direct database fix completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Direct database fix failed:', error.message);
    process.exit(1);
  });
