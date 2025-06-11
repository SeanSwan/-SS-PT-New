/**
 * Direct Database Pricing Check
 * =============================
 * Checks database directly without needing server to be running
 * No external dependencies required
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { existsSync } from 'fs';
import dotenv from 'dotenv';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '.env');

if (existsSync(envPath)) {
  console.log(`[Check] Loading environment from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log('[Check] Warning: .env file not found.');
  dotenv.config();
}

console.log('💾 DIRECT DATABASE PRICING CHECK');
console.log('================================');
console.log('');

async function checkDatabaseDirectly() {
  try {
    // Import database modules
    const { default: sequelize } = await import('./backend/database.mjs');
    const { default: StorefrontItem } = await import('./backend/models/StorefrontItem.mjs');
    
    console.log('🔌 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    console.log('');
    
    console.log('📦 Checking storefront packages...');
    const items = await StorefrontItem.findAll({
      order: [['id', 'ASC']]
    });
    
    console.log(`Found ${items.length} packages in database`);
    console.log('');
    
    if (items.length === 0) {
      console.log('❌ NO PACKAGES FOUND IN DATABASE!');
      console.log('This explains why everything shows $0.');
      console.log('');
      console.log('🔧 SOLUTION: Run the emergency pricing fix');
      console.log('   FIX-PRICING-NOW.bat');
      console.log('   OR manually: cd backend && node emergency-pricing-fix.mjs');
    } else {
      console.log('💰 CURRENT PACKAGE PRICING:');
      console.log('===========================');
      
      let totalRevenue = 0;
      let validPricing = true;
      
      items.forEach((item, index) => {
        const price = parseFloat(item.price || 0);
        const pricePerSession = parseFloat(item.pricePerSession || 0);
        const totalCost = parseFloat(item.totalCost || 0);
        
        console.log(`${index + 1}. ${item.name}`);
        console.log(`   Price: $${price}`);
        console.log(`   Per Session: $${pricePerSession}`);
        console.log(`   Total Cost: $${totalCost}`);
        console.log(`   Sessions: ${item.sessions || 'N/A'}`);
        console.log(`   Type: ${item.packageType}`);
        console.log(`   Active: ${item.isActive}`);
        console.log('');
        
        if (price <= 0 || pricePerSession <= 0) {
          validPricing = false;
          console.log(`   ❌ INVALID PRICING for ${item.name}`);
        }
        
        totalRevenue += price;
      });
      
      console.log('📊 SUMMARY:');
      console.log(`   Total packages: ${items.length}`);
      console.log(`   Total revenue potential: $${totalRevenue.toFixed(2)}`);
      console.log(`   Valid pricing: ${validPricing ? 'YES ✅' : 'NO ❌'}`);
      
      if (!validPricing) {
        console.log('');
        console.log('🔧 PRICING ISSUES FOUND!');
        console.log('Run: FIX-PRICING-NOW.bat to fix all pricing');
      } else {
        console.log('');
        console.log('🎉 DATABASE PRICING IS CORRECT!');
        console.log('If frontend shows $0, the issue is in:');
        console.log('- API response transformation');
        console.log('- Frontend display logic');
        console.log('- Browser caching');
      }
    }
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    console.log('');
    console.log('This could mean:');
    console.log('1. Database connection issues');
    console.log('2. Missing environment variables');
    console.log('3. Database not properly set up');
    console.log('');
    console.log('💡 SOLUTIONS:');
    console.log('- Check .env file configuration');
    console.log('- Verify database connection string');
    console.log('- Run: FIX-PRICING-NOW.bat (includes database setup)');
  }
}

checkDatabaseDirectly().then(() => {
  console.log('🏁 Database check completed');
}).catch(error => {
  console.error('💥 Check failed:', error);
});
