#!/usr/bin/env node

/**
 * Production Login Verification
 * =============================
 * 
 * Tests the production backend and login functionality
 */

console.log('🧪 Production Login Verification');
console.log('=================================\n');

const BACKEND_URL = 'https://swan-studios-api.onrender.com';
const LOGIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

async function testBackendHealth() {
  console.log('🏥 Step 1: Test Backend Health');
  console.log('==============================\n');

  const healthUrl = `${BACKEND_URL}/api/health`;
  console.log(`Testing: ${healthUrl}`);

  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      timeout: 10000
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.text();
      console.log(`Response: ${data}`);
      console.log('✅ Backend is accessible and healthy!\n');
      return true;
    } else {
      console.log('❌ Backend health check failed');
      console.log('💡 Backend may be down or not deployed to this URL\n');
      return false;
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log('💡 Backend is not accessible at this URL\n');
    return false;
  }
}

async function testLoginEndpoint() {
  console.log('🔐 Step 2: Test Login Endpoint');
  console.log('==============================\n');

  const loginUrl = `${BACKEND_URL}/api/auth/login`;
  console.log(`Testing: ${loginUrl}`);
  console.log(`Credentials: ${LOGIN_CREDENTIALS.username} / ${LOGIN_CREDENTIALS.password}\n`);

  try {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(LOGIN_CREDENTIALS)
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    console.log('Response:', responseData);

    if (response.status === 200) {
      console.log('✅ LOGIN SUCCESS!');
      
      if (responseData.user) {
        console.log(`   User: ${responseData.user.username}`);
        console.log(`   Role: ${responseData.user.role}`);
        console.log(`   Email: ${responseData.user.email}`);
      }
      
      if (responseData.token) {
        console.log('   ✅ JWT token received');
      }
      
      console.log('\n🎉 Production login is working correctly!');
      return true;

    } else if (response.status === 401) {
      console.log('❌ LOGIN FAILED - Invalid credentials');
      console.log('💡 Solutions:');
      console.log('   1. Run: node create-admin-prod.mjs');
      console.log('   2. Check if admin user exists in database');
      console.log('   3. Verify password is correct');
      return false;

    } else if (response.status === 404) {
      console.log('❌ LOGIN ENDPOINT NOT FOUND');
      console.log('💡 Backend may not be deployed or URL is wrong');
      return false;

    } else if (response.status === 500) {
      console.log('❌ SERVER ERROR');
      console.log('💡 Solutions:');
      console.log('   1. Check backend logs in Render dashboard');
      console.log('   2. Database connection issues?');
      console.log('   3. Run: node create-admin-prod.mjs');
      return false;

    } else {
      console.log(`❌ UNEXPECTED STATUS: ${response.status}`);
      console.log('💡 Check backend logs for details');
      return false;
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log('💡 Network or connection issue');
    return false;
  }
}

async function testFrontendUrl() {
  console.log('🌐 Step 3: Test Frontend URL Check');
  console.log('==================================\n');

  console.log('Manual verification needed:');
  console.log('1. Go to: https://sswanstudios.com');
  console.log('2. Open browser dev tools (F12)');
  console.log('3. Go to Network tab');
  console.log('4. Try to login with admin/admin123');
  console.log('5. Check the network requests:\n');

  console.log('✅ Expected: POST swan-studios-api.onrender.com/api/auth/login');
  console.log('❌ Wrong: POST ss-pt-new.onrender.com/api/auth/login\n');

  console.log('If you see the wrong URL:');
  console.log('1. Run: node rebuild-frontend.mjs');
  console.log('2. Deploy the new dist/ folder');
  console.log('3. Clear browser cache and try again\n');
}

async function main() {
  console.log('🎯 Testing SwanStudios Production Login\n');

  // Test 1: Backend Health
  const healthOk = await testBackendHealth();
  
  // Test 2: Login (only if health is OK)
  let loginOk = false;
  if (healthOk) {
    loginOk = await testLoginEndpoint();
  }

  // Test 3: Frontend URL instructions
  await testFrontendUrl();

  // Summary
  console.log('📊 VERIFICATION SUMMARY');
  console.log('=======================');
  console.log(`Backend Health: ${healthOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Login Test: ${loginOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Frontend URL: Manual verification needed\n`);

  if (healthOk && loginOk) {
    console.log('🎉 PRODUCTION LOGIN IS WORKING!');
    console.log('The issue is likely just the frontend calling the wrong URL.');
    console.log('Run: node rebuild-frontend.mjs to fix it.');
  } else if (healthOk && !loginOk) {
    console.log('🔧 Backend is working but login failed.');
    console.log('Run: node create-admin-prod.mjs to create/update admin user.');
  } else {
    console.log('🚨 Backend is not accessible.');
    console.log('Check Render dashboard for deployment issues.');
  }

  console.log('\n📞 NEXT STEPS:');
  if (!healthOk) {
    console.log('1. Check Render dashboard for backend deployment');
    console.log('2. Verify backend is deployed to swan-studios-api.onrender.com');
    console.log('3. Check environment variables in Render');
  } else if (!loginOk) {
    console.log('1. Run: node create-admin-prod.mjs');
    console.log('2. Re-run this verification script');
  } else {
    console.log('1. Run: node rebuild-frontend.mjs');
    console.log('2. Deploy the new dist/ folder');
    console.log('3. Test login at https://sswanstudios.com');
  }
}

// Node.js fetch polyfill check
if (typeof fetch === 'undefined') {
  console.log('❌ Error: This script requires Node.js 18+ or a fetch polyfill');
  console.log('💡 Alternative: Test manually in browser:');
  console.log(`   Health: ${BACKEND_URL}/api/health`);
  console.log(`   Login: POST ${BACKEND_URL}/api/auth/login`);
  process.exit(1);
}

main();
