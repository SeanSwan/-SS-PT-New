#!/usr/bin/env node

/**
 * SwanStudios Login Flow Test (No Dependencies)
 * Tests the complete authentication flow using only built-in Node.js modules
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

console.log('🧪 SwanStudios Login Flow Test');
console.log('====================================\n');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const client = options.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsedBody = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedBody
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testLoginFlow() {
  const baseURL = process.env.NODE_ENV === 'production' 
    ? 'https://sswanstudios.com' 
    : 'http://localhost:10000';
  
  const testCredentials = {
    username: 'admin',
    password: 'admin123'
  };

  console.log(`🌐 Testing against: ${baseURL}`);
  console.log(`👤 Username: ${testCredentials.username}`);
  console.log(`🔑 Password: ${testCredentials.password}\n`);

  try {
    const url = new URL(baseURL);
    
    // Step 1: Test backend health
    console.log('Step 1: Testing backend health...');
    try {
      const healthOptions = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: '/api/health',
        method: 'GET',
        protocol: url.protocol,
        timeout: 5000
      };

      const healthResponse = await makeRequest(healthOptions);
      console.log(`✅ Backend is running (${healthResponse.status})`);
    } catch (healthError) {
      console.log(`❌ Backend health check failed: ${healthError.message}`);
      if (healthError.code === 'ECONNREFUSED') {
        console.log('💡 Start your backend server: cd backend && npm start');
        return false;
      }
    }

    // Step 2: Test login endpoint
    console.log('\nStep 2: Testing login endpoint...');
    try {
      const loginOptions = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: '/api/auth/login',
        method: 'POST',
        protocol: url.protocol,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      };

      const loginResponse = await makeRequest(loginOptions, testCredentials);

      if (loginResponse.status === 200 && loginResponse.data.success) {
        console.log('✅ LOGIN SUCCESSFUL!');
        console.log(`   User: ${loginResponse.data.user.firstName} ${loginResponse.data.user.lastName}`);
        console.log(`   Role: ${loginResponse.data.user.role}`);
        console.log(`   Token received: ${loginResponse.data.token ? 'Yes' : 'No'}`);
        
        // Step 3: Test token validation
        console.log('\nStep 3: Testing token validation...');
        const tokenOptions = {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: '/api/auth/validate-token',
          method: 'GET',
          protocol: url.protocol,
          headers: {
            'Authorization': `Bearer ${loginResponse.data.token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        };

        const tokenResponse = await makeRequest(tokenOptions);

        if (tokenResponse.status === 200 && tokenResponse.data.success) {
          console.log('✅ TOKEN VALIDATION SUCCESSFUL!');
          console.log(`   User ID: ${tokenResponse.data.user.id}`);
          console.log(`   Email: ${tokenResponse.data.user.email}`);
        } else {
          console.log('❌ Token validation failed');
        }

        console.log('\n🎉 AUTHENTICATION FLOW COMPLETELY WORKING!');
        console.log('\n📋 Your login credentials:');
        console.log(`   Username: ${testCredentials.username}`);
        console.log(`   Password: ${testCredentials.password}`);
        console.log(`\n🌐 Login URL: ${baseURL}`);
        
        return true;

      } else {
        console.log('❌ Login failed with unexpected response');
        console.log(`   Status: ${loginResponse.status}`);
        console.log(`   Response: ${JSON.stringify(loginResponse.data, null, 2)}`);
        return false;
      }

    } catch (loginError) {
      console.log('❌ LOGIN FAILED!');
      
      if (loginError.response) {
        console.log(`   Status: ${loginError.response.status}`);
        console.log(`   Message: ${loginError.response.data.message || 'Unknown error'}`);
        
        if (loginError.response.status === 401) {
          console.log('\n💡 This is the authentication issue we need to fix!');
        }
      } else {
        console.log(`   Error: ${loginError.message}`);
      }
      return false;
    }

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    return false;
  }
}

// Run test
async function main() {
  console.log('Starting authentication flow test...\n');
  
  const success = await testLoginFlow();
  
  if (success) {
    console.log('\n✅ ALL TESTS PASSED - Authentication is working!');
    process.exit(0);
  } else {
    console.log('\n❌ TESTS FAILED - Authentication needs fixing');
    console.log('\n🔧 Run the diagnostic tool:');
    console.log('   cd backend && node diagnose-auth-issue.mjs');
    process.exit(1);
  }
}

main();
