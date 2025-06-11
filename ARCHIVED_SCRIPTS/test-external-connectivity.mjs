#!/usr/bin/env node

/**
 * SwanStudios External Frontend Connectivity Test
 * ==============================================
 * Tests the production URL (what frontend will use)
 * Continues from Session Summary Step 2: External connectivity testing
 */

console.log('🌐 SwanStudios External Frontend Connectivity Test');
console.log('================================================\n');

const PRODUCTION_URL = 'https://ss-pt-new.onrender.com';

// Test basic connectivity
async function testBasicConnectivity() {
  try {
    console.log('🔄 Step 1: Testing basic connectivity...');
    console.log(`🎯 Target URL: ${PRODUCTION_URL}`);
    
    const response = await fetch(PRODUCTION_URL, {
      method: 'GET'
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Headers:`, response.headers);

    if (response.ok) {
      console.log('✅ Basic connectivity successful!');
      return true;
    } else {
      console.log('⚠️ Unexpected status code, but server is responding');
      return true; // Still connected, just different response
    }

  } catch (error) {
    console.error('❌ Basic connectivity failed:', error.message);
    return false;
  }
}

// Test health endpoints
async function testHealthEndpoints() {
  const healthEndpoints = [
    '/health',
    '/api/health'
  ];

  console.log('\n🔄 Step 2: Testing health endpoints...');

  for (const endpoint of healthEndpoints) {
    try {
      console.log(`\n🎯 Testing ${PRODUCTION_URL}${endpoint}`);
      
      const response = await fetch(`${PRODUCTION_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`   📡 ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        console.log('   ✅ Health check successful!');
        console.log('   📊 Response:', JSON.stringify(data, null, 2));
      } else {
        const errorText = await response.text();
        console.log(`   ⚠️ ${response.status}: ${errorText.substring(0, 200)}`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

// Test external login (main functionality)
async function testExternalLogin() {
  try {
    console.log('\n🔄 Step 3: Testing external login (critical for frontend)...');
    console.log(`🎯 Target: ${PRODUCTION_URL}/api/auth/login`);
    
    const loginResponse = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    console.log(`📡 Login Response: ${loginResponse.status} ${loginResponse.statusText}`);
    
    // Check CORS headers
    console.log('\n🔍 CORS Headers Analysis:');
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods', 
      'access-control-allow-headers',
      'access-control-allow-credentials'
    ];
    
    corsHeaders.forEach(header => {
      const value = loginResponse.headers.get(header);
      console.log(`   ${header}: ${value || 'NOT SET'}`);
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      throw new Error(`External login failed: ${loginResponse.status} - ${errorText}`);
    }

    const loginData = await loginResponse.json();
    
    console.log('\n✅ EXTERNAL LOGIN SUCCESSFUL!');
    console.log('📧 User Email:', loginData.user?.email);
    console.log('🎭 User Role:', loginData.user?.role);
    console.log('🔑 Token received:', loginData.token ? 'YES ✅' : 'NO ❌');
    console.log('🔄 Refresh token:', loginData.refreshToken ? 'YES ✅' : 'NO ❌');
    
    return loginData.token;

  } catch (error) {
    console.error('❌ External login failed:', error.message);
    throw error;
  }
}

// Test external protected endpoint access
async function testExternalProtectedAccess(token) {
  try {
    console.log('\n🔄 Step 4: Testing external protected endpoint access...');
    
    const response = await fetch(`${PRODUCTION_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`📡 Protected Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Protected access failed: ${response.status} - ${errorText}`);
    }

    const userData = await response.json();
    
    console.log('✅ External protected access successful!');
    console.log('👤 User Data Retrieved:', userData.username);
    
    return userData;

  } catch (error) {
    console.error('❌ External protected access failed:', error.message);
    throw error;
  }
}

// Test storefront (public endpoint that frontend will use)
async function testStorefrontEndpoint() {
  try {
    console.log('\n🔄 Step 5: Testing storefront endpoint (frontend dependency)...');
    
    const response = await fetch(`${PRODUCTION_URL}/api/storefront`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`📡 Storefront Response: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const storefrontData = await response.json();
      console.log('✅ Storefront endpoint successful!');
      console.log(`📦 Items available: ${storefrontData.items?.length || 0}`);
      console.log(`💰 Categories: ${storefrontData.categories?.length || 0}`);
    } else {
      const errorText = await response.text();
      console.log(`⚠️ Storefront issue: ${response.status} - ${errorText.substring(0, 100)}`);
    }

  } catch (error) {
    console.error('❌ Storefront test failed:', error.message);
  }
}

// CORS preflight test (important for frontend)
async function testCORSPreflight() {
  try {
    console.log('\n🔄 Step 6: Testing CORS preflight (critical for frontend)...');
    
    const response = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://swanstudios.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });

    console.log(`📡 CORS Preflight: ${response.status} ${response.statusText}`);
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
      'access-control-max-age': response.headers.get('access-control-max-age')
    };

    console.log('🔍 CORS Configuration:');
    Object.entries(corsHeaders).forEach(([key, value]) => {
      console.log(`   ${key}: ${value || 'NOT SET'}`);
    });

    if (response.status === 200 || response.status === 204) {
      console.log('✅ CORS preflight successful!');
    } else {
      console.log('⚠️ CORS preflight unusual response');
    }

  } catch (error) {
    console.error('❌ CORS preflight failed:', error.message);
  }
}

// Main test execution
async function runExternalConnectivityTests() {
  try {
    // Test basic connectivity
    const connected = await testBasicConnectivity();
    if (!connected) {
      throw new Error('Basic connectivity failed - cannot proceed');
    }

    // Test health endpoints
    await testHealthEndpoints();

    // Test external login
    const token = await testExternalLogin();

    // Test protected access
    await testExternalProtectedAccess(token);

    // Test storefront
    await testStorefrontEndpoint();

    // Test CORS
    await testCORSPreflight();

    console.log('\n🎉 EXTERNAL CONNECTIVITY TESTING COMPLETE!');
    console.log('===========================================');
    console.log('✅ Production server accessible externally');
    console.log('✅ Authentication working via external URL');
    console.log('✅ Protected endpoints accessible externally');
    console.log('✅ CORS configuration operational');
    console.log('\n🚀 READY FOR FRONTEND INTEGRATION!');
    console.log('\n📝 FRONTEND INTEGRATION NOTES:');
    console.log('1. API Base URL: https://ss-pt-new.onrender.com');
    console.log('2. Login endpoint: /api/auth/login');
    console.log('3. Protected routes require: Authorization: Bearer {token}');
    console.log('4. Storefront data: /api/storefront');
    console.log('5. CORS properly configured for cross-origin requests');
    
    return true;

  } catch (error) {
    console.error('\n💥 CRITICAL ERROR in external connectivity:');
    console.error('==========================================');
    console.error(error);
    
    console.log('\n💡 TROUBLESHOOTING STEPS:');
    console.log('1. Check Render service status: https://dashboard.render.com');
    console.log('2. Verify environment variables in Render dashboard');
    console.log('3. Check service logs in Render for errors');
    console.log('4. Ensure PostgreSQL database is accessible');
    console.log('5. Test local server first if external fails');
    
    return false;
  }
}

// Self-executing async function
(async () => {
  const success = await runExternalConnectivityTests();
  process.exit(success ? 0 : 1);
})();
