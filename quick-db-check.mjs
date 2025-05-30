#!/usr/bin/env node

/**
 * Quick Database Check
 * ====================
 * Quick check to see database status and storefront item count
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

async function quickCheck() {
  try {
    console.log('🔍 QUICK DATABASE CHECK');
    console.log('=======================');
    
    const { default: sequelize } = await import('./backend/database.mjs');
    const { default: StorefrontItem } = await import('./backend/models/StorefrontItem.mjs');
    
    console.log('📊 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    const count = await StorefrontItem.count();
    console.log(`📦 Found ${count} storefront items in database`);
    
    if (count === 0) {
      console.log('\n❌ NO PACKAGES FOUND - This explains the cart error!');
      console.log('💡 Solution: Run the seeder to create packages');
      console.log('   Command: node run-seeder.mjs');
    } else {
      console.log('✅ Packages exist - checking first few...');
      const items = await StorefrontItem.findAll({ 
        limit: 3,
        attributes: ['id', 'name', 'price', 'sessions', 'totalSessions']
      });
      items.forEach(item => {
        console.log(`   - ID ${item.id}: ${item.name} ($${item.price})`);
      });
    }
    
    await sequelize.close();
    return { success: true, count };
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    return { success: false, error: error.message };
  }
}

quickCheck()
  .then((result) => {
    if (result.success) {
      console.log(`\n🎯 Database check complete. Found ${result.count} packages.`);
    } else {
      console.log('\n💥 Database check failed:', result.error);
    }
    process.exit(result.success ? 0 : 1);
  });
