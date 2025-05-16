#!/usr/bin/env node

// Script to manually seed storefront items
// Run this with: node seed-training-packages.mjs

import seedStorefrontItems from './seedStorefrontItems.mjs';
import sequelize from './database.mjs';

console.log('🚀 Starting manual seed of training packages...');

try {
  await seedStorefrontItems();
  console.log('✅ Training packages seeded successfully!');
} catch (error) {
  console.error('❌ Error seeding training packages:', error);
} finally {
  // Close database connection
  await sequelize.close();
  console.log('Database connection closed.');
  process.exit(0);
}
