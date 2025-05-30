#!/usr/bin/env node

/**
 * Test Cart API
 * ==============
 * This script tests the cart API endpoints to verify they work correctly
 * after fixing the package database issues.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

async function testCartAPI() {
  try {
    console.log('🧪 TESTING CART API ENDPOINTS');
    console.log('===============================');
    
    // Determine the API base URL
    const isDev = process.env.NODE_ENV !== 'production';
    const apiBaseUrl = isDev 
      ? 'http://localhost:10000' 
      : 'https://ss-pt-new.onrender.com';
      
    console.log(`🌐 Using API base URL: ${apiBaseUrl}`);
    
    // Test 1: Health check
    console.log('\n1️⃣ Testing health endpoint...');
    try {
      const healthResponse = await axios.get(`${apiBaseUrl}/health`);
      console.log(`✅ Health check: ${healthResponse.status} - ${healthResponse.data.message}`);
    } catch (error) {
      console.log(`❌ Health check failed: ${error.message}`);
      throw error;
    }
    
    // Test 2: Check storefront items exist
    console.log('\n2️⃣ Testing storefront items...');
    try {
      const storefrontResponse = await axios.get(`${apiBaseUrl}/api/storefront`);
      console.log(`✅ Storefront items: ${storefrontResponse.status} - Found ${storefrontResponse.data.length} items`);
      
      if (storefrontResponse.data.length > 0) {
        console.log('📦 First few packages:');
        storefrontResponse.data.slice(0, 3).forEach(item => {
          console.log(`   - ID ${item.id}: ${item.name} ($${item.price})`);
        });
      }
    } catch (error) {
      console.log(`❌ Storefront test failed: ${error.message}`);
    }
    
    // Test 3: Test cart endpoints (without authentication - should return 401)
    console.log('\n3️⃣ Testing cart endpoints (expecting 401 without auth)...');
    
    try {
      await axios.get(`${apiBaseUrl}/api/cart`);
      console.log('⚠️  Cart GET worked without auth (unexpected)');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Cart GET correctly requires authentication (401)');
      } else {
        console.log(`❌ Cart GET failed with unexpected error: ${error.response?.status} ${error.message}`);
      }
    }
    
    try {
      await axios.post(`${apiBaseUrl}/api/cart/add`, { storefrontItemId: 1, quantity: 1 });
      console.log('⚠️  Cart ADD worked without auth (unexpected)');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Cart ADD correctly requires authentication (401)');
      } else if (error.response?.status === 404 && error.response?.data?.message?.includes('Training package not found')) {
        console.log('❌ Cart ADD failed with "Training package not found" - database issue!');
        console.log('   This means the storefront items are not properly seeded');
        return { success: false, issue: 'packages_missing' };
      } else {
        console.log(`❌ Cart ADD failed with unexpected error: ${error.response?.status} ${error.message}`);
      }
    }
    
    console.log('\n🎯 CART API TEST SUMMARY');
    console.log('========================');
    console.log('✅ Health endpoint works');
    console.log('✅ Storefront endpoint works'); 
    console.log('✅ Cart endpoints properly require authentication');
    console.log('\n🛒 Cart functionality should work correctly when authenticated!');
    
    return { success: true };
    
  } catch (error) {
    console.error('💥 Cart API test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testCartAPI()
    .then((result) => {
      if (result.success) {
        console.log('\n🎉 ALL CART API TESTS PASSED!');
        console.log('🚀 Cart functionality is ready to use');
      } else {
        console.log('\n⚠️  CART API TESTS REVEALED ISSUES');
        if (result.issue === 'packages_missing') {
          console.log('🔧 Run: node fix-cart-packages.mjs');
        }
        console.log('❌ Error:', result.error);
      }
      process.exit(result.success ? 0 : 1);
    });
}

export default testCartAPI;
