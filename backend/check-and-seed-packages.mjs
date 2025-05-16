#!/usr/bin/env node

// Manual script to check and seed training packages
// Run this with: node check-and-seed-packages.mjs

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRootDir = path.resolve(__dirname, '..');
const envPath = path.resolve(projectRootDir, '.env');

console.log(`Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });

import seedStorefrontItems from './seedStorefrontItems.mjs';
import sequelize from './database.mjs';
import StorefrontItem from './models/StorefrontItem.mjs';

console.log('🚀 Checking and seeding training packages...\n');

try {
  // Test database connection
  console.log('1. Testing database connection...');
  await sequelize.authenticate();
  console.log('✅ Database connection established\n');

  // Check existing packages
  console.log('2. Checking existing packages...');
  const existingPackages = await StorefrontItem.findAll({
    order: [['id', 'ASC']]
  });
  
  console.log(`Found ${existingPackages.length} existing packages:`);
  existingPackages.forEach(pkg => {
    console.log(`  - ID: ${pkg.id}, Name: ${pkg.name}, Sessions: ${pkg.sessions || 'N/A'}, Price: $${pkg.totalCost}`);
  });
  console.log('');

  // Expected packages
  const expectedPackages = [
    { name: 'Single Session', sessions: 1, price: 175, perSession: 175 },
    { name: 'Gold Glimmer', sessions: 8, price: 1360, perSession: 170 },
    { name: 'Platinum Pulse', sessions: 20, price: 3300, perSession: 165 },
    { name: 'Rhodium Rise', sessions: 50, price: 7900, perSession: 158 },
    { name: 'Silver Storm', months: 3, sessions: 48, price: 7680, perSession: 160 },
    { name: 'Gold Grandeur', months: 6, sessions: 96, price: 14400, perSession: 150 },
    { name: 'Platinum Prestige', months: 9, sessions: 144, price: 20880, perSession: 145 },
    { name: 'Rhodium Reign', months: 12, sessions: 192, price: 26880, perSession: 140 }
  ];

  console.log('3. Expected packages:');
  expectedPackages.forEach(pkg => {
    const display = pkg.sessions ? 
      `${pkg.sessions} sessions` : 
      `${pkg.months} months (${pkg.months * 4 * 4} sessions)`;
    console.log(`  - ${pkg.name}: ${display}, ${pkg.price} (${pkg.perSession}/session)`);
  });
  console.log('');

  // Check for missing packages
  console.log('4. Checking for missing packages...');
  const missingPackages = [];
  
  for (const expected of expectedPackages) {
    const found = existingPackages.find(pkg => pkg.name === expected.name);
    if (!found) {
      missingPackages.push(expected.name);
    } else {
      // Check if price is correct
      const expectedPrice = parseFloat(expected.price);
      const actualPrice = parseFloat(found.totalCost);
      if (Math.abs(expectedPrice - actualPrice) > 0.01) {
        console.log(`  ⚠️ ${expected.name}: Price mismatch. Expected: $${expectedPrice}, Found: $${actualPrice}`);
      }
    }
  }

  if (missingPackages.length > 0) {
    console.log(`❌ Missing packages: ${missingPackages.join(', ')}`);
    console.log('');
    
    // Run seeder
    console.log('5. Running seeder to fix missing packages...');
    await seedStorefrontItems();
    console.log('✅ Seeder completed\n');
    
    // Check again
    console.log('6. Verifying packages after seeding...');
    const newPackages = await StorefrontItem.findAll({
      order: [['id', 'ASC']]
    });
    
    console.log(`Found ${newPackages.length} packages after seeding:`);
    newPackages.forEach(pkg => {
      console.log(`  - ID: ${pkg.id}, Name: ${pkg.name}, Sessions: ${pkg.sessions || pkg.totalSessions}, Price: $${pkg.totalCost}`);
    });
  } else {
    console.log('✅ All expected packages are present');
  }

  console.log('\n🎉 Package check completed successfully!');

} catch (error) {
  console.error('\n❌ Error checking/seeding packages:', error);
  console.error(error.stack);
} finally {
  // Close database connection
  await sequelize.close();
  console.log('\nDatabase connection closed.');
  process.exit(0);
}
