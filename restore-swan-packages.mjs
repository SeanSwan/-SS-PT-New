#!/usr/bin/env node
/**
 * 🦢 RESTORE LUXURY SWAN PACKAGES - P0 FIX
 * =======================================
 * This script restores the beautiful Swan-themed luxury package names
 * and fixes the cart 404 error by populating the database properly.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { existsSync } from 'fs';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend directory
const projectRoot = path.resolve(__dirname, '.');
const envPath = path.resolve(projectRoot, 'backend', '.env');

if (existsSync(envPath)) {
  console.log(`[Restore] Loading environment from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log('[Restore] Warning: .env file not found.');
  dotenv.config();
}

// Import and run the production luxury seeder
console.log('🦢 RESTORING LUXURY SWAN PACKAGES...');
console.log('===================================');

try {
  const { default: seedLuxuryPackagesProduction } = await import('./backend/seeders/luxury-swan-packages-production.mjs');
  
  console.log('🚀 Starting luxury package restoration...');
  const result = await seedLuxuryPackagesProduction();
  
  console.log('\n🎉 ✅ SUCCESS: LUXURY SWAN PACKAGES RESTORED!');
  console.log('=============================================');
  console.log(`📦 Packages created: ${result.packagesCreated}`);
  console.log('🦢 Your beautiful Swan-themed names are back:');
  console.log('   • Silver Swan Wing');
  console.log('   • Golden Swan Flight');
  console.log('   • Sapphire Swan Soar');
  console.log('   • Platinum Swan Grace');
  console.log('   • Emerald Swan Evolution');
  console.log('   • Diamond Swan Dynasty');
  console.log('   • Ruby Swan Reign');
  console.log('   • Rhodium Swan Royalty');
  console.log('');
  console.log('🛒 Cart 404 error should now be FIXED!');
  console.log('🔄 Next: Update frontend to use API packages instead of hardcoded');
  
} catch (error) {
  console.error('💥 ❌ FAILED to restore packages:', error.message);
  console.error('Full error:', error);
  process.exit(1);
}
