#!/usr/bin/env node
/**
 * 🦢 PRODUCTION SEEDER: Restore Swan Packages on Render
 * ===================================================
 * This connects directly to your production database to restore packages
 */

import dotenv from 'dotenv';

// Load environment for production database
dotenv.config();

// Set environment to production to use DATABASE_URL
process.env.NODE_ENV = 'production';

console.log('🦢 RESTORING LUXURY SWAN PACKAGES TO PRODUCTION...');
console.log('===============================================');

try {
  // Check if DATABASE_URL is available (from Render)
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found. Make sure you have production credentials.');
    console.log('💡 Alternative: Set up local PostgreSQL and use the regular restore script.');
    process.exit(1);
  }

  const { default: seedLuxuryPackagesProduction } = await import('./backend/seeders/luxury-swan-packages-production.mjs');
  
  console.log('🚀 Starting production luxury package restoration...');
  const result = await seedLuxuryPackagesProduction();
  
  console.log('\n🎉 ✅ SUCCESS: LUXURY SWAN PACKAGES RESTORED TO PRODUCTION!');
  console.log('======================================================');
  console.log(`📦 Packages created: ${result.packagesCreated}`);
  console.log('🦢 Your beautiful Swan-themed names are now live in production!');
  
} catch (error) {
  console.error('💥 ❌ FAILED to restore packages to production:', error.message);
  console.error('Full error:', error);
  process.exit(1);
}
