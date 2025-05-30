#!/usr/bin/env node

/**
 * Check Storefront Items Script
 * =============================
 * This script checks what storefront items are currently in the database
 * to help debug the cart "Training package not found" error.
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

async function checkStorefrontItems() {
  try {
    console.log('🔍 CHECKING STOREFRONT ITEMS IN DATABASE');
    console.log('=========================================');
    
    // Import database and model
    const { default: sequelize } = await import('./backend/database.mjs');
    const { default: StorefrontItem } = await import('./backend/models/StorefrontItem.mjs');
    
    console.log('📊 Database connection status...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    // Get all storefront items
    const items = await StorefrontItem.findAll({
      order: [['id', 'ASC']]
    });
    
    console.log(`\n📦 Found ${items.length} storefront items in database:`);
    console.log('=' .repeat(80));
    
    if (items.length === 0) {
      console.log('❌ NO STOREFRONT ITEMS FOUND!');
      console.log('   This explains the "Training package not found" error.');
      console.log('   The cart is trying to find packages that don\'t exist.');
      console.log('\n💡 SOLUTION: Run the package seeder to create packages.');
      return { found: false, count: 0 };
    }
    
    items.forEach((item, index) => {
      console.log(`\n${index + 1}. ID: ${item.id} - ${item.name}`);
      console.log(`   Type: ${item.packageType}`);
      console.log(`   Sessions: ${item.sessions || item.totalSessions}`);
      console.log(`   Price: $${item.price} (Per session: $${item.pricePerSession})`);
      console.log(`   Active: ${item.isActive !== undefined ? item.isActive : 'unknown'}`);
      console.log(`   Created: ${item.createdAt}`);
    });
    
    console.log('\n✅ STOREFRONT ITEMS SUMMARY');
    console.log('============================');
    console.log(`Total packages: ${items.length}`);
    console.log(`Fixed packages: ${items.filter(i => i.packageType === 'fixed').length}`);
    console.log(`Monthly packages: ${items.filter(i => i.packageType === 'monthly').length}`);
    
    const activeItems = items.filter(i => i.isActive !== false);
    console.log(`Active packages: ${activeItems.length}`);
    
    if (activeItems.length > 0) {
      console.log('\n🎯 CART SHOULD WORK WITH THESE PACKAGE IDs:');
      activeItems.forEach(item => {
        console.log(`   - ID ${item.id}: ${item.name} ($${item.price})`);
      });
    }
    
    return { found: true, count: items.length, items };
    
  } catch (error) {
    console.error('\n❌ ERROR checking storefront items:', error.message);
    console.error('Stack trace:', error.stack);
    return { found: false, count: 0, error: error.message };
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkStorefrontItems()
    .then((result) => {
      if (result.found) {
        console.log('\n🎉 Database check completed successfully!');
        if (result.count > 0) {
          console.log('🛒 Cart functionality should work if using valid package IDs.');
        }
      } else {
        console.log('\n⚠️  Issue found with storefront items.');
        console.log('   You need to seed the packages before cart will work.');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error.message);
      process.exit(1);
    });
}

export default checkStorefrontItems;
