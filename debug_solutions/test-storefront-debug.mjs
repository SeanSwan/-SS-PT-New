import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';
import axios from 'axios';

// Configure environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '.env');

dotenv.config({ path: envPath });

const API_BASE_URL = 'https://ss-pt-new.onrender.com';

console.log('🔍 SwanStudios Storefront Debug Test');
console.log('=====================================');

async function testStorefrontEndpoint() {
  try {
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`, { 
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'StorefrontDebugTest/1.0'
      }
    });
    console.log('✅ Health check passed:', healthResponse.status, healthResponse.data);
    
    console.log('\n2. Testing storefront endpoint...');
    const storefrontResponse = await axios.get(`${API_BASE_URL}/api/storefront`, { 
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'StorefrontDebugTest/1.0'
      }
    });
    console.log('✅ Storefront endpoint response:', storefrontResponse.status);
    console.log('📦 Data structure:', {
      success: storefrontResponse.data?.success,
      itemsCount: storefrontResponse.data?.items?.length || 0,
      firstItem: storefrontResponse.data?.items?.[0]?.name || 'No items'
    });
    
    if (storefrontResponse.data?.items?.length > 0) {
      console.log('\n📋 Available packages:');
      storefrontResponse.data.items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name} - $${item.price || item.totalCost || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Data:', error.response?.data);
    console.error('Error Message:', error.message);
    
    if (error.response?.status === 503) {
      console.log('\n🔧 503 Service Unavailable suggests:');
      console.log('  - Database connection issues');
      console.log('  - Model/import problems');
      console.log('  - Route handler errors');
      console.log('  - Middleware blocking the request');
    }
  }
}

async function testDirect503Debug() {
  try {
    console.log('\n3. Testing direct URL that frontend uses...');
    const directResponse = await axios.get(`${API_BASE_URL}/storefront`, { 
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'StorefrontDebugTest/1.0'
      }
    });
    console.log('✅ Direct /storefront response:', directResponse.status, directResponse.data);
  } catch (error) {
    console.error('❌ Direct /storefront test failed:');
    console.error('Status:', error.response?.status);
    console.error('This explains the frontend 503 error!');
    
    if (error.response?.status === 404) {
      console.log('\n💡 The issue is clear: Frontend is trying to access /storefront');
      console.log('   But the backend only serves /api/storefront');
      console.log('   This is a routing/API service configuration issue!');
    }
  }
}

// Run tests
console.log(`🌐 Testing against: ${API_BASE_URL}`);
console.log('⏳ Running diagnostics...\n');

testStorefrontEndpoint()
  .then(() => testDirect503Debug())
  .then(() => {
    console.log('\n🎯 Debug test completed!');
    console.log('If storefront works but /storefront doesn\'t, the issue is in the frontend API configuration.');
  })
  .catch(error => {
    console.error('Fatal error during testing:', error.message);
  });
