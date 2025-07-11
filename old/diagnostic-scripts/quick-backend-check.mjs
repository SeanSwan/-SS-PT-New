#!/usr/bin/env node

/**
 * Quick Backend Health Check
 * ==========================
 * Simple test to verify backend server is running
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:10000';
const API_URL = `${BASE_URL}/api`;

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

async function quickHealthCheck() {
  log('🔍 Quick Backend Health Check', 'cyan');
  log('============================');
  
  try {
    // Test basic health endpoint
    const healthResponse = await axios.get(`${API_URL}/health`, { timeout: 5000 });
    log('✅ Backend server is running and responding', 'green');
    log(`   Port: 10000`, 'cyan');
    log(`   Status: ${healthResponse.status}`, 'cyan');
    
    // Test cart endpoint with anonymous access
    try {
      const cartResponse = await axios.get(`${API_URL}/cart`, { 
        timeout: 3000,
        validateStatus: function (status) {
          return status < 500; // Accept 401 (unauthorized) as expected
        }
      });
      
      if (cartResponse.status === 401) {
        log('✅ Cart API endpoint is working (requires authentication)', 'green');
      } else if (cartResponse.status === 200) {
        log('✅ Cart API endpoint is accessible', 'green');
      } else {
        log(`⚠️  Cart API responded with status: ${cartResponse.status}`, 'yellow');
      }
    } catch (error) {
      log(`❌ Cart API endpoint error: ${error.message}`, 'red');
    }
    
    // Test storefront endpoint
    try {
      const storeResponse = await axios.get(`${API_URL}/storefront`, { timeout: 3000 });
      log('✅ Storefront API endpoint is working', 'green');
      const items = storeResponse.data.items || storeResponse.data;
      log(`   Available items: ${Array.isArray(items) ? items.length : 'Unknown'}`, 'cyan');
    } catch (error) {
      log(`⚠️  Storefront API error: ${error.message}`, 'yellow');
    }
    
    log('\n🎉 Backend appears to be healthy!', 'green');
    log('You can now run the full cart test:', 'cyan');
    log('node test-cart-functionality.mjs', 'yellow');
    
  } catch (error) {
    log('❌ Backend server is not running or not accessible', 'red');
    log(`   Error: ${error.message}`, 'red');
    log('\nTo start the backend server:', 'yellow');
    log('1. cd backend', 'cyan');
    log('2. npm run dev', 'cyan');
    log('3. Wait for "Server running on port 10000" message', 'cyan');
  }
}

quickHealthCheck();
