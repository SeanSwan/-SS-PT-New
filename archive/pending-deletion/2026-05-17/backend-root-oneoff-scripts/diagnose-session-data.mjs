/**
 * Production Database Session Data Fix
 * ===================================
 * Diagnoses and fixes missing session data in storefront items
 */

import { fileURLToPath } from 'url';
import path from 'path';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 DIAGNOSING PRODUCTION DATABASE SESSION DATA...');
console.log('================================================');

try {
  // Import database and models
  const { default: sequelize } = await import('./database.mjs');
  const { default: StorefrontItem } = await import('./models/StorefrontItem.mjs');
  
  console.log('✅ Database connection established');
  
  // Check current storefront items
  console.log('\n📊 CURRENT STOREFRONT ITEMS:');
  const items = await StorefrontItem.findAll({
    attributes: ['id', 'name', 'sessions', 'totalSessions', 'packageType', 'price'],
    order: [['id', 'ASC']]
  });
  
  if (items.length === 0) {
    console.log('❌ NO STOREFRONT ITEMS FOUND!');
    console.log('   This explains why cart shows 0 sessions');
    console.log('   Need to run seeder to create packages');
  } else {
    console.log(`📦 Found ${items.length} storefront items:`);
    
    let hasSessionData = false;
    items.forEach((item, index) => {
      const sessionInfo = item.packageType === 'fixed' 
        ? `sessions: ${item.sessions || 'NULL'}`
        : `totalSessions: ${item.totalSessions || 'NULL'}`;
      
      console.log(`   ${index + 1}. ${item.name} - ${sessionInfo} ($${item.price})`);
      
      if ((item.packageType === 'fixed' && item.sessions > 0) || 
          (item.packageType === 'monthly' && item.totalSessions > 0)) {
        hasSessionData = true;
      }
    });
    
    if (!hasSessionData) {
      console.log('\n❌ PROBLEM FOUND: NO SESSION DATA IN STOREFRONT ITEMS!');
      console.log('   All items have NULL or 0 sessions');
      console.log('   This is why cart shows "0 total sessions"');
    } else {
      console.log('\n✅ Session data exists - need to debug cart calculation');
    }
  }
  
  // Recommendation
  console.log('\n🔧 RECOMMENDED FIX:');
  if (items.length === 0 || !items.some(item => 
    (item.packageType === 'fixed' && item.sessions > 0) || 
    (item.packageType === 'monthly' && item.totalSessions > 0)
  )) {
    console.log('   1. Run production seeder to populate session data');
    console.log('   2. Command: node backend/seeders/luxury-swan-packages-production.mjs');
    console.log('   3. This will create 8 packages with proper session counts');
  } else {
    console.log('   1. Session data exists - issue may be in cart calculation');
    console.log('   2. Check cart helpers or associations');
  }
  
  console.log('\n✅ DIAGNOSIS COMPLETE');
  process.exit(0);
  
} catch (error) {
  console.error('💥 DIAGNOSTIC ERROR:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
