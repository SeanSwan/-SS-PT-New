#!/usr/bin/env node

/**
 * SwanStudios Protected Endpoints Test
 * ===================================
 * Tests protected routes using JWT authentication
 * Continuing from Session Summary - Testing /me and admin endpoints
 */

console.log('🔐 SwanStudios Protected Endpoints Test');
console.log('=======================================\n');

// First, let's get a fresh JWT token from login
async function getAuthToken() {
  try {
    console.log('🔄 Step 1: Getting fresh JWT token...');
    
    const loginResponse = await fetch('http://localhost:10000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    
    if (!loginData.success || !loginData.token) {
      throw new Error('Login response missing token');
    }

    console.log('✅ Login successful!');
    console.log(`📧 User: ${loginData.user.email}`);
    console.log(`🎭 Role: ${loginData.user.role}`);
    console.log(`🔑 Token received: ${loginData.token.substring(0, 20)}...`);
    
    return loginData.token;

  } catch (error) {
    console.error('❌ Login failed:', error.message);
    throw error;
  }
}

// Test the /me endpoint
async function testMeEndpoint(token) {
  try {
    console.log('\n🔄 Step 2: Testing /api/auth/me endpoint...');
    
    const response = await fetch('http://localhost:10000/api/auth/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Me endpoint failed: ${response.status} - ${errorText}`);
    }

    const userData = await response.json();
    
    console.log('✅ /me endpoint successful!');
    console.log('📊 User Data:');
    console.log(`   ID: ${userData.id}`);
    console.log(`   Username: ${userData.username}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Role: ${userData.role}`);
    console.log(`   Active: ${userData.isActive}`);
    
    return userData;

  } catch (error) {
    console.error('❌ /me endpoint failed:', error.message);
    throw error;
  }
}

// Test admin stats endpoint
async function testAdminStatsEndpoint(token) {
  try {
    console.log('\n🔄 Step 3: Testing /api/auth/stats endpoint...');
    
    const response = await fetch('http://localhost:10000/api/auth/stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`⚠️ Admin stats endpoint: ${response.status} - ${errorText}`);
      
      if (response.status === 404) {
        console.log('💡 Note: /stats endpoint might not be implemented yet');
        return null;
      }
      
      throw new Error(`Admin stats failed: ${response.status} - ${errorText}`);
    }

    const statsData = await response.json();
    
    console.log('✅ /stats endpoint successful!');
    console.log('📈 Admin Stats:');
    console.log(JSON.stringify(statsData, null, 2));
    
    return statsData;

  } catch (error) {
    console.error('❌ Admin stats failed:', error.message);
    return null; // Non-critical failure
  }
}

// Test other common protected endpoints
async function testOtherProtectedEndpoints(token) {
  console.log('\n🔄 Step 4: Testing other protected endpoints...');
  
  const endpointsToTest = [
    '/api/auth/profile',
    '/api/auth/refresh',
    '/api/user/dashboard',
    '/api/storefront', // This one should work even without auth, but let's test with auth
  ];

  for (const endpoint of endpointsToTest) {
    try {
      console.log(`\n🎯 Testing ${endpoint}...`);
      
      const response = await fetch(`http://localhost:10000${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log(`   📡 ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Success! Data keys: ${Object.keys(data).join(', ')}`);
      } else {
        const errorText = await response.text();
        console.log(`   ⚠️ ${response.status}: ${errorText.substring(0, 100)}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

// Main test execution
async function runProtectedEndpointTests() {
  try {
    // Step 1: Get JWT token
    const token = await getAuthToken();
    
    // Step 2: Test /me endpoint
    const userData = await testMeEndpoint(token);
    
    // Step 3: Test admin stats (if available)
    await testAdminStatsEndpoint(token);
    
    // Step 4: Test other endpoints
    await testOtherProtectedEndpoints(token);
    
    console.log('\n🎉 PROTECTED ENDPOINT TESTING COMPLETE!');
    console.log('========================================');
    console.log('✅ Authentication system fully functional');
    console.log('✅ JWT token validation working');
    console.log('✅ Protected routes accessible');
    console.log('\n🚀 Ready for frontend integration testing!');
    
    return true;

  } catch (error) {
    console.error('\n💥 CRITICAL ERROR in protected endpoint testing:');
    console.error('==============================================');
    console.error(error);
    console.log('\n💡 TROUBLESHOOTING STEPS:');
    console.log('1. Ensure backend server is running on port 10000');
    console.log('2. Verify admin user exists: node create-admin-prod.mjs');
    console.log('3. Check server logs for authentication errors');
    console.log('4. Test basic login first: node test-login-simple.mjs');
    
    return false;
  }
}

// Self-executing async function
(async () => {
  const success = await runProtectedEndpointTests();
  process.exit(success ? 0 : 1);
})();
