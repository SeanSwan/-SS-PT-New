#!/usr/bin/env node
/**
 * LOGIN TEST SCRIPT
 * =================
 * This script tests the login process end-to-end to verify the fix works
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  cyan: '\x1b[36m'
};

const log = (color, message) => console.log(`${colors[color]}${message}${colors.reset}`);

async function testLogin() {
  log('cyan', '🧪 TESTING LOGIN PROCESS');
  log('cyan', '=' .repeat(50));
  
  const serverUrl = process.env.VITE_BACKEND_URL || 'http://localhost:10000';
  const username = 'Swanstudios';
  const password = 'TempPassword123!';
  
  log('blue', `Server URL: ${serverUrl}`);
  log('blue', `Testing login with username: ${username}`);
  log('blue', `Password: ${password}`);
  
  try {
    // Step 1: Test server health
    log('yellow', '\n🔍 STEP 1: Testing server health...');
    
    try {
      const healthResponse = await fetch(`${serverUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        log('green', '✅ Server is healthy');
        log('blue', `   Status: ${healthData.status}`);
        log('blue', `   Environment: ${healthData.environment}`);
      } else {
        log('red', `❌ Server health check failed: ${healthResponse.status}`);
        return;
      }
    } catch (healthError) {
      log('red', `❌ Cannot reach server: ${healthError.message}`);
      log('yellow', '💡 Make sure the server is running:');
      log('cyan', '   1. cd C:\\Users\\ogpsw\\Desktop\\quick-pt\\SS-PT\\backend');
      log('cyan', '   2. npm start');
      return;
    }
    
    // Step 2: Test login endpoint
    log('yellow', '\n🔍 STEP 2: Testing login...');
    
    const loginResponse = await fetch(`${serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username,
        password: password
      })
    });
    
    const loginData = await loginResponse.json();
    
    log('blue', `   Response Status: ${loginResponse.status}`);
    log('blue', `   Response OK: ${loginResponse.ok}`);
    
    if (loginResponse.ok) {
      log('green', '✅ LOGIN SUCCESSFUL!');
      log('blue', `   User ID: ${loginData.user?.id}`);
      log('blue', `   Username: ${loginData.user?.username}`);
      log('blue', `   Email: ${loginData.user?.email}`);
      log('blue', `   Role: ${loginData.user?.role}`);
      log('blue', `   Token Length: ${loginData.token?.length || 0} characters`);
      
      // Step 3: Test token validation
      log('yellow', '\n🔍 STEP 3: Testing token validation...');
      
      const validateResponse = await fetch(`${serverUrl}/api/auth/validate-token`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        }
      });
      
      if (validateResponse.ok) {
        const validateData = await validateResponse.json();
        log('green', '✅ TOKEN VALIDATION SUCCESSFUL!');
        log('blue', `   Validated User: ${validateData.user?.username}`);
      } else {
        log('red', `❌ Token validation failed: ${validateResponse.status}`);
        const errorData = await validateResponse.json();
        log('red', `   Error: ${errorData.message}`);
      }
      
      // Step 4: Test profile endpoint
      log('yellow', '\n🔍 STEP 4: Testing profile access...');
      
      const profileResponse = await fetch(`${serverUrl}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        }
      });
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        log('green', '✅ PROFILE ACCESS SUCCESSFUL!');
        log('blue', `   Profile User: ${profileData.user?.username}`);
      } else {
        log('red', `❌ Profile access failed: ${profileResponse.status}`);
      }
      
    } else {
      log('red', '❌ LOGIN FAILED!');
      log('red', `   Status: ${loginResponse.status}`);
      log('red', `   Message: ${loginData.message || 'Unknown error'}`);
      
      if (loginData.error) {
        log('red', `   Error Details: ${loginData.error}`);
      }
      
      if (loginResponse.status === 401) {
        log('yellow', '\n💡 401 Unauthorized suggests:');
        log('cyan', '   1. Username/password is incorrect');
        log('cyan', '   2. Account may be locked or inactive');
        log('cyan', '   3. Password hash may be corrupted');
        log('cyan', '   4. Run the fix script: FIX-AUTH-NOW.bat');
      }
      
      if (loginResponse.status === 500) {
        log('yellow', '\n💡 500 Server Error suggests:');
        log('cyan', '   1. Database connection issue');
        log('cyan', '   2. Password verification error');
        log('cyan', '   3. Check server console for detailed errors');
      }
    }
    
  } catch (error) {
    log('red', `❌ Test failed with error: ${error.message}`);
  }
  
  log('yellow', '\n📋 SUMMARY:');
  log('cyan', 'If login succeeded: ✅ Your authentication is working!');
  log('cyan', 'If login failed: ❌ Run FIX-AUTH-NOW.bat to fix the issue');
  log('cyan', 'If server unreachable: 🚀 Start your backend server first');
}

// Run the test
testLogin().catch(console.error);
