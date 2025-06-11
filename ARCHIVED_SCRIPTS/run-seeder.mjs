#!/usr/bin/env node

/**
 * Run Luxury Packages Seeder
 * ===========================
 * This script runs the luxury packages seeder to populate the database
 * with the SwanStudios luxury package collection.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Get directory name equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '.env');
if (existsSync(envPath)) {
  console.log(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log('Using default environment variables');
  dotenv.config();
}

async function runSeeder() {
  try {
    console.log('🚀 RUNNING SWANSTUDIOS LUXURY PACKAGES SEEDER');
    console.log('===============================================');
    
    // Import and run the seeder
    const seedLuxuryPackagesProduction = await import('./backend/seeders/luxury-swan-packages-production.mjs');
    const seeder = seedLuxuryPackagesProduction.default;
    
    const result = await seeder();
    
    if (result.success) {
      console.log('🎉 SUCCESS!');
      console.log(`✅ Created ${result.packagesCreated} luxury packages`);
      console.log('\n🎯 Now checking what was created...');
      
      // Check what was created
      const checkStorefront = await import('./check-storefront-items.mjs');
      await checkStorefront.default();
      
      return { success: true, count: result.packagesCreated };
    } else {
      console.log('❌ Seeder returned unsuccessful result');
      return { success: false, error: 'Seeder unsuccessful' };
    }
    
  } catch (error) {
    console.error('💥 ERROR running seeder:', error.message);
    console.error('Stack trace:', error.stack);
    return { success: false, error: error.message };
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSeeder()
    .then((result) => {
      if (result.success) {
        console.log('\n🎉 Seeder completed successfully!');
        console.log('🛒 Cart functionality should now work.');
      } else {
        console.log('\n⚠️  Seeder failed.');
        console.log('   Error:', result.error);
      }
      process.exit(result.success ? 0 : 1);
    });
}

export default runSeeder;
