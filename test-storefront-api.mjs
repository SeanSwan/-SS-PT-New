#!/usr/bin/env node
/**
 * Simple test script to verify StoreFront API and seeding
 */

import axios from 'axios';

const API_BASE = process.env.API_URL || 'http://localhost:3000';

async function testStorefrontAPI() {
  console.log('🧪 Testing StoreFront API...\n');
  
  try {
    // Test API connection
    console.log('1. Testing API connection...');
    const healthResponse = await axios.get(`${API_BASE}/api/health`);
    console.log(`✅ API Health: ${healthResponse.data.status}\n`);
    
    // Test storefront endpoint
    console.log('2. Testing StoreFront endpoint...');
    const storefrontResponse = await axios.get(`${API_BASE}/api/storefront`);
    
    console.log(`✅ StoreFront API Response:
      - Success: ${storefrontResponse.data.success}
      - Items Count: ${storefrontResponse.data.items?.length || 0}
    `);
    
    if (storefrontResponse.data.items && storefrontResponse.data.items.length > 0) {
      console.log('\n📦 Packages found:');
      storefrontResponse.data.items.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - $${item.displayPrice || item.price} - Type: ${item.packageType}`);
      });
    } else {
      console.log('\n⚠️  No packages found in database!');
      console.log('\nTrying to run seeder...');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`❌ API Test Failed:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
    return false;
  }
}

async function runSeeder() {
  console.log('\n🌱 Running StoreFront seeder...\n');
  
  try {
    // Import and run the seeder
    const { seedStorefrontItems } = await import('./backend/seeders/20250516-storefront-items.mjs');
    await seedStorefrontItems();
    console.log('✅ Seeder completed successfully!\n');
    return true;
  } catch (error) {
    console.error('❌ Seeder failed:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  const apiWorking = await testStorefrontAPI();
  
  if (!apiWorking) {
    const seederWorked = await runSeeder();
    if (seederWorked) {
      console.log('🔄 Re-testing API after seeding...\n');
      await testStorefrontAPI();
    }
  }
  
  console.log('\n✨ Test complete!');
}

main().catch(console.error);
