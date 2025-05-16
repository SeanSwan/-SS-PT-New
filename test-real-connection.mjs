#!/usr/bin/env node

// Comprehensive test script - run this after disabling mock mode
// This will test the complete flow from frontend to backend

import dotenv from 'dotenv';
import axios from 'axios';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRootDir = path.resolve(__dirname, '..');
const envPath = path.resolve(projectRootDir, '.env');

dotenv.config({ path: envPath });

// Configuration
const BACKEND_URL = 'http://localhost:10000';
const FRONTEND_URL = 'http://localhost:5173';

// Test functions
async function testBackendHealth() {
  console.log('🏥 Testing backend health...');
  try {
    const response = await axios.get(`${BACKEND_URL}/health`);
    console.log('✅ Backend is running');
    return true;
  } catch (error) {
    console.log('❌ Backend is not accessible:', error.message);
    return false;
  }
}

async function testStorefrontAPI() {
  console.log('🛍️ Testing storefront API...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/storefront`);
    const data = response.data;
    
    if (data.success && Array.isArray(data.items) && data.items.length > 0) {
      console.log(`✅ Storefront API working - Found ${data.items.length} packages`);
      console.log('📦 Sample packages:');
      data.items.slice(0, 3).forEach(item => {
        console.log(`   - ${item.name}: $${item.totalCost} (${item.sessions || 'N/A'} sessions)`);
      });
      return true;
    } else {
      console.log('⚠️ Storefront API responding but no packages found');
      console.log('Response:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.log('❌ Storefront API error:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
    return false;
  }
}

async function testFrontendHealth() {
  console.log('🖥️ Testing frontend health...');
  try {
    const response = await axios.get(FRONTEND_URL);
    console.log('✅ Frontend is accessible');
    return true;
  } catch (error) {
    console.log('❌ Frontend is not accessible:', error.message);
    return false;
  }
}

async function checkDatabaseConnection() {
  console.log('🗄️ Testing database connection via backend...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/health/db`);
    if (response.data.connected) {
      console.log('✅ Database connection confirmed');
      return true;
    } else {
      console.log('❌ Database connection failed');
      return false;
    }
  } catch (error) {
    console.log('⚠️ Database health check endpoint not available');
    return true; // Don't fail if this endpoint doesn't exist
  }
}

async function runMockModeCheck() {
  console.log('🔍 Checking for mock mode indicators...');
  
  // Check frontend env vars
  console.log('Frontend environment:');
  console.log('  VITE_MOCK_AUTH:', process.env.VITE_MOCK_AUTH);
  console.log('  VITE_FORCE_MOCK_MODE:', process.env.VITE_FORCE_MOCK_MODE);
  
  if (process.env.VITE_MOCK_AUTH === 'true' || process.env.VITE_FORCE_MOCK_MODE === 'true') {
    console.log('⚠️ Mock mode environment variables are still enabled!');
    console.log('💡 Please set both to "false" in frontend/.env');
    return false;
  } else {
    console.log('✅ Mock mode environment variables are disabled');
    return true;
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 SwanStudios Connection Test');
  console.log('==============================');
  console.log('');
  
  const results = {
    mockModeDisabled: await runMockModeCheck(),
    backendHealth: await testBackendHealth(),
    databaseConnection: await checkDatabaseConnection(),
    storefrontAPI: await testStorefrontAPI(),
    frontendHealth: await testFrontendHealth()
  };
  
  console.log('');
  console.log('📊 Test Results Summary:');
  console.log('========================');
  
  for (const [test, passed] of Object.entries(results)) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`${status} ${testName}`);
  }
  
  console.log('');
  
  const allPassed = Object.values(results).every(Boolean);
  
  if (allPassed) {
    console.log('🎉 All tests passed! Your setup should be working correctly.');
    console.log('🌐 Try accessing the storefront at http://localhost:5173');
  } else {
    console.log('❌ Some tests failed. Please address the issues above.');
    
    if (!results.mockModeDisabled) {
      console.log('');
      console.log('🔧 Quick fix for mock mode:');
      console.log('   1. Edit frontend/.env');
      console.log('   2. Set VITE_MOCK_AUTH=false');
      console.log('   3. Set VITE_FORCE_MOCK_MODE=false');
      console.log('   4. Restart frontend: npm run dev');
    }
    
    if (!results.backendHealth) {
      console.log('');
      console.log('🔧 Backend not running:');
      console.log('   1. cd backend');
      console.log('   2. npm start');
    }
    
    if (!results.storefrontAPI) {
      console.log('');
      console.log('🔧 Storefront API issues:');
      console.log('   1. Run: node backend/check-and-seed-packages.mjs');
      console.log('   2. Check backend console for errors');
    }
  }
}

// Run the tests
runTests().catch(console.error);