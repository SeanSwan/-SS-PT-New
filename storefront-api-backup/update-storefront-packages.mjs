#!/usr/bin/env node

/**
 * Update Storefront Packages Script - CORRECTED PRICING
 * 
 * This script will:
 * 1. Clear existing packages completely
 * 2. Seed new packages with CORRECTED pricing
 * 3. Verify the pricing structure
 * 
 * CORRECTED PRICING STRUCTURE:
 * - 1 session: $175
 * - 8 sessions: $170 per session
 * - 20 sessions: $170 per session (same as 8)
 * - 50 sessions: $160 per session
 * - 3 months: $155 per session
 * - 6 months: $150 per session
 * - 9 months: $145 per session
 * - 12 months: $140 per session
 */

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the CORRECTED seeder with proper Windows path handling
const seederPath = path.join(__dirname, 'backend', 'seeders', '20250517-storefront-items-corrected-pricing.mjs');
const seederURL = pathToFileURL(seederPath).href;

async function updateStorefront() {
  console.log('🚀 Starting storefront update with CORRECTED pricing...');
  console.log('   - Clearing ALL existing packages');
  console.log('   - Adding corrected pricing packages');
  console.log('   - Session packages: 1, 8, 20, 50 sessions');
  console.log('   - Monthly packages: 3, 6, 9, 12 months');
  console.log('   - CORRECTED Price range: $175 → $140 per session');
  console.log('');

  try {
    // Dynamic import the corrected seeder using proper file URL
    const { seedStorefrontItems } = await import(seederURL);
    
    // Run the seeder
    await seedStorefrontItems();
    
    console.log('');
    console.log('✅ Storefront update completed successfully!');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Refresh your frontend');
    console.log('   3. Verify the correct packages are displayed');
    console.log('');
    console.log('📊 CORRECTED Pricing Summary:');
    console.log('   Single Session: $175/session');
    console.log('   8 Sessions: $170/session');
    console.log('   20 Sessions: $170/session (same as 8)');
    console.log('   50 Sessions: $160/session');
    console.log('   3 Months: $155/session');
    console.log('   6 Months: $150/session');
    console.log('   9 Months: $145/session');
    console.log('   12 Months: $140/session');
    
  } catch (error) {
    console.error('❌ Error updating storefront:', error);
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Make sure you\'re in the root project directory');
    console.log('   2. Verify the seeder file exists');
    console.log('   3. Check that your backend models are properly set up');
    console.log('   4. Try running the seeder directly: node backend/seeders/20250517-storefront-items-corrected-pricing.mjs');
    process.exit(1);
  }
}

// Run the update
updateStorefront();
