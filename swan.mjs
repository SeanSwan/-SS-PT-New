#!/usr/bin/env node

/**
 * SwanStudios Luxury Collection Script
 * ====================================
 * Uses the proper luxury seeder to create swan-themed packages
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createSwanCollection() {
  try {
    console.log('🦢 SWANSTUDIOS LUXURY COLLECTION');
    console.log('=================================');
    console.log('Creating luxury swan-themed packages...');
    console.log('');
    
    // Import and run the luxury seeder
    const luxurySeeder = await import('./backend/seeders/luxury-swan-packages-production.mjs');
    const result = await luxurySeeder.default();
    
    if (result.success) {
      console.log('\n🎉 SWANSTUDIOS LUXURY COLLECTION COMPLETE!');
      console.log('==========================================');
      console.log(`🦢 Swan packages created: ${result.packagesCreated}`);
      console.log('');
      console.log('💎 Your luxury swan collection:');
      console.log('• Silver Swan Wing - $175');
      console.log('• Golden Swan Flight - $1,360');
      console.log('• Sapphire Swan Soar - $3,300');
      console.log('• Platinum Swan Grace - $8,000');
      console.log('• Emerald Swan Evolution - $8,060');
      console.log('• Diamond Swan Dynasty - $15,600');
      console.log('• Ruby Swan Reign - $22,620');
      console.log('• Rhodium Swan Royalty - $29,120');
      console.log('');
      console.log('🛒 Cart functionality ready with proper swan branding!');
      
      return { success: true, ...result };
    } else {
      console.log('\n💥 SWAN COLLECTION CREATION FAILED!');
      console.log('===================================');
      console.log(`Error: ${result.error}`);
      
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.error('\n💥 SWAN COLLECTION SCRIPT FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Check DATABASE_URL is set in .env');
    console.log('2. Verify backend/seeders/luxury-swan-packages-production.mjs exists');
    console.log('3. Ensure database connection is working');
    console.log('4. Try running: production.mjs as fallback');
    
    return { success: false, error: error.message };
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createSwanCollection()
    .then((result) => {
      if (result.success) {
        console.log(`\n🦢 SWAN COLLECTION CREATED SUCCESSFULLY!`);
        process.exit(0);
      } else {
        console.log('\n💥 CREATION FAILED - See troubleshooting steps above');
        process.exit(1);
      }
    });
}

export default createSwanCollection;
