/**
 * Comprehensive API Diagnostic Script
 * ===================================
 * 
 * This script will test the client-trainer-assignments endpoint thoroughly
 * and identify the exact issue causing the circuit breaker to activate.
 */

import fetch from 'node-fetch';
import https from 'https';

// Create HTTPS agent that ignores certificate issues (for testing only)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

const BASE_URL = 'https://ss-pt-new.onrender.com';

/**
 * Test suite for client-trainer-assignments API
 */
async function runDiagnostics() {
  console.log('🔍 Starting comprehensive API diagnostics...\n');

  // Test 1: Basic server health
  console.log('📡 Test 1: Basic server health');
  try {
    const response = await fetch(`${BASE_URL}/test`, { agent: httpsAgent });
    const data = await response.json();
    console.log(`✅ Server Status: ${response.status}`);
    console.log(`📊 Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`❌ Server health check failed: ${error.message}\n`);
    return; // If server is down, no point continuing
  }

  // Test 2: Test the route registration directly
  console.log('🛣️ Test 2: Route registration test');
  try {
    const response = await fetch(`${BASE_URL}/api/assignments/test`, { 
      agent: httpsAgent,
      headers: {
        'Authorization': 'Bearer fake-token-for-route-test',
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.text(); // Get raw text first
    console.log(`📡 Status: ${response.status}`);
    console.log(`📄 Raw Response: ${data}\n`);
    
    if (response.status === 404) {
      console.log('❌ ISSUE FOUND: Route is not registered properly\n');
    } else if (response.status === 401) {
      console.log('✅ Route is registered (401 = auth required, which is expected)\n');
    } else {
      console.log('🔍 Unexpected response - investigating further\n');
    }
  } catch (error) {
    console.log(`❌ Route test failed: ${error.message}\n`);
  }

  // Test 3: Test client-trainer-assignments route without auth
  console.log('🔗 Test 3: Client-trainer-assignments route (no auth)');
  try {
    const response = await fetch(`${BASE_URL}/api/client-trainer-assignments`, { 
      agent: httpsAgent,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.text();
    console.log(`📡 Status: ${response.status}`);
    console.log(`📄 Response: ${data.substring(0, 500)}${data.length > 500 ? '...' : ''}\n`);
    
    if (response.status === 404) {
      console.log('❌ CRITICAL ISSUE: /api/client-trainer-assignments route not found\n');
    } else if (response.status === 401) {
      console.log('✅ Route exists (401 = auth required)\n');
    }
  } catch (error) {
    console.log(`❌ Route test failed: ${error.message}\n`);
  }

  // Test 4: Test assignments route without auth  
  console.log('📋 Test 4: Assignments route (no auth)');
  try {
    const response = await fetch(`${BASE_URL}/api/assignments`, { 
      agent: httpsAgent,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.text();
    console.log(`📡 Status: ${response.status}`);
    console.log(`📄 Response: ${data.substring(0, 500)}${data.length > 500 ? '...' : ''}\n`);
  } catch (error) {
    console.log(`❌ Route test failed: ${error.message}\n`);
  }

  // Test 5: Check if auth middleware is working
  console.log('🔐 Test 5: Auth middleware test');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/me`, { 
      agent: httpsAgent,
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.text();
    console.log(`📡 Status: ${response.status}`);
    console.log(`📄 Auth Response: ${data}\n`);
  } catch (error) {
    console.log(`❌ Auth test failed: ${error.message}\n`);
  }

  // Test 6: Test with mock admin credentials (if available)
  console.log('👤 Test 6: Testing with admin auth (if available)');
  console.log('Note: This requires valid admin token from the browser\n');

  // Test 7: Check model availability on server
  console.log('🗄️ Test 7: Database/Model connectivity');
  try {
    const response = await fetch(`${BASE_URL}/api/sessions`, { 
      agent: httpsAgent,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📡 Sessions endpoint status: ${response.status}`);
    if (response.status !== 401) {
      const data = await response.text();
      console.log(`📊 Sessions response: ${data.substring(0, 200)}...\n`);
    }
  } catch (error) {
    console.log(`❌ Database test failed: ${error.message}\n`);
  }

  console.log('🎯 Diagnostic Summary:');
  console.log('If you see 401 errors, that means routes are working but need authentication.');
  console.log('If you see 404 errors, that means routes are not properly registered.');
  console.log('If you see 500 errors, that means there are server/database issues.');
  console.log('\n📋 Next steps:');
  console.log('1. Copy the admin JWT token from browser dev tools');
  console.log('2. Test the endpoints with proper authentication');
  console.log('3. Check server logs on Render for detailed error messages');
}

// Run diagnostics
runDiagnostics().catch(error => {
  console.error('💥 Diagnostic script failed:', error.message);
  process.exit(1);
});
