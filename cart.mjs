#!/usr/bin/env node

/**
 * Cart Fix Script
 * ===============
 * This script fixes cart functionality by ensuring all packages exist in database
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

async function fixCart() {
  try {
    console.log('🛒 CART FIX SCRIPT');
    console.log('==================');
    console.log('Fixing SwanStudios cart functionality...');
    console.log('');
    
    // Import and run the swan luxury collection
    const swanFix = await import('./swan.mjs');
    const result = await swanFix.default();
    
    if (result.success) {
      console.log('\n🎉 CART FIXES COMPLETED SUCCESSFULLY!');
      console.log('=====================================');
      console.log(`✅ Packages created: ${result.packagesCreated}`);
      console.log(`🔄 Packages updated: ${result.packagesUpdated}`);
      console.log(`📊 Total packages: ${result.totalPackages}`);
      console.log(`🧪 Lookup success: ${result.lookupSuccess ? 'YES' : 'NO'}`);
      console.log('');
      console.log('🛒 CART FUNCTIONALITY SHOULD NOW WORK!');
      console.log('');
      console.log('🧪 TO TEST:');
      console.log('1. Visit: https://ss-pt-new.onrender.com');
      console.log('2. Navigate to storefront');
      console.log('3. Click "Add to Cart" on any package');
      console.log('4. Verify no "Training package not found" errors');
      
      return { success: true, ...result };
    } else {
      console.log('\n💥 CART FIX FAILED!');
      console.log('===================');
      console.log(`Error: ${result.error}`);
      
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.error('\n💥 CART FIX SCRIPT FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Make sure DATABASE_URL is set in .env');
    console.log('2. Check database connection is working');
    console.log('3. Verify StorefrontItem model exists');
    console.log('4. Try running: node database.bat');
    
    return { success: false, error: error.message };
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixCart()
    .then((result) => {
      if (result.success) {
        console.log(`\n🎊 CART FUNCTIONALITY FIXED!`);
        process.exit(0);
      } else {
        console.log('\n💥 FIX FAILED - See troubleshooting steps above');
        process.exit(1);
      }
    });
}

export default fixCart;
