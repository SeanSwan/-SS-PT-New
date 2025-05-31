#!/usr/bin/env node

/**
 * Production Authentication Verification Script
 * Verifies that the authentication fixes are working correctly
 */

import https from 'https';
import { URL } from 'url';

const BACKEND_URL = 'https://ss-pt-new.onrender.com';

async function testEndpoint(endpoint, description, options = {}) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, BACKEND_URL);
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SwanStudios-Auth-Verification/1.0',
        ...options.headers
      }
    };
    
    const req = https.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const success = res.statusCode >= 200 && res.statusCode < 400;
        console.log(`${success ? '✅' : '❌'} ${description}: ${res.statusCode}`);
        
        if (!success && data) {
          try {
            const errorData = JSON.parse(data);
            console.log(`   Error: ${errorData.message || 'Unknown error'}`);
            if (errorData.errorCode) {
              console.log(`   Code: ${errorData.errorCode}`);
            }
          } catch (e) {
            console.log(`   Response: ${data.substring(0, 100)}`);
          }
        } else if (success && data && options.showSuccess) {
          try {
            const responseData = JSON.parse(data);
            console.log(`   Success: ${responseData.message || responseData.status || 'OK'}`);
          } catch (e) {
            console.log(`   Response: ${data.substring(0, 50)}...`);
          }
        }
        
        resolve({ success, status: res.statusCode, data });
      });
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.on('error', (error) => {
      console.log(`❌ ${description}: ERROR - ${error.message}`);
      resolve({ success: false, error: error.message });
    });
    
    req.setTimeout(15000, () => {
      req.abort();
      console.log(`❌ ${description}: TIMEOUT`);
      resolve({ success: false, error: 'Timeout' });
    });
    
    req.end();
  });
}

async function runVerification() {
  console.log('🔍 PRODUCTION AUTHENTICATION VERIFICATION');
  console.log('========================================');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);
  
  const tests = [
    {
      endpoint: '/health',
      description: 'Backend Health Check',
      showSuccess: true
    },
    {
      endpoint: '/test',
      description: 'Basic Test Endpoint',
      showSuccess: true
    },
    {
      endpoint: '/api/auth/validate-token',
      description: 'Auth Validation (No Token)',
      expectedFail: true
    },
    {
      endpoint: '/api/auth/me',
      description: 'Get Current User (No Token)',
      expectedFail: true
    }
  ];
  
  let passedTests = 0;
  let expectedFailures = 0;
  const totalTests = tests.length;
  
  for (const test of tests) {
    const result = await testEndpoint(test.endpoint, test.description, {
      showSuccess: test.showSuccess,
      ...test.options
    });
    
    if (test.expectedFail) {
      // For these tests, we expect them to fail with 401
      if (!result.success && result.status === 401) {
        expectedFailures++;
        console.log(`   Expected 401 - Authentication properly required ✅`);
      } else {
        console.log(`   Unexpected result - should return 401 ❌`);
      }
    } else if (result.success) {
      passedTests++;
    }
  }
  
  console.log(`\n📊 VERIFICATION RESULTS:`);
  console.log(`✅ Health/Basic Tests: ${passedTests}/${totalTests - tests.filter(t => t.expectedFail).length} passed`);
  console.log(`✅ Auth Security Tests: ${expectedFailures}/${tests.filter(t => t.expectedFail).length} properly secured`);
  
  const allTestsPassed = passedTests === (totalTests - tests.filter(t => t.expectedFail).length) && 
                         expectedFailures === tests.filter(t => t.expectedFail).length;
  
  if (allTestsPassed) {
    console.log('\n🎉 ALL VERIFICATION TESTS PASSED!');
    console.log('✅ Backend is responding correctly');
    console.log('✅ Authentication endpoints are properly secured');
    console.log('✅ Ready for frontend authentication testing');
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Clear browser localStorage/sessionStorage');
    console.log('2. Test login flow from frontend');
    console.log('3. Verify no 401 errors in browser console');
    console.log('4. Check that authentication works end-to-end');
    
  } else {
    console.log('\n⚠️  SOME VERIFICATION TESTS FAILED');
    
    console.log('\n🔧 TROUBLESHOOTING STEPS:');
    console.log('1. Check that JWT_SECRET is set in Render dashboard');
    console.log('2. Verify FRONTEND_ORIGINS is configured correctly');
    console.log('3. Ensure service was redeployed after setting env vars');
    console.log('4. Check Render deployment logs for errors');
    
    console.log('\n📞 RENDER DASHBOARD CHECKLIST:');
    console.log('□ Environment variables updated');
    console.log('□ Service redeployed successfully');
    console.log('□ No errors in deployment logs');
    console.log('□ Database connection working');
  }
  
  console.log('\n🔗 USEFUL LINKS:');
  console.log(`• Backend Health: ${BACKEND_URL}/health`);
  console.log(`• Render Dashboard: https://dashboard.render.com`);
  console.log(`• Backend Logs: Check your service logs in Render dashboard`);
  
  console.log('\n💡 MANUAL TESTING:');
  console.log('Run these in browser console after clearing storage:');
  console.log('• localStorage.clear(); sessionStorage.clear();');
  console.log('• Then try logging in through your frontend');
  console.log('• Check for 401 errors in Network tab');
}

// Additional diagnostic function
async function runDiagnostics() {
  console.log('\n🔍 ADDITIONAL DIAGNOSTICS');
  console.log('========================');
  
  // Test CORS preflight
  console.log('\n🌐 Testing CORS Configuration...');
  
  try {
    const corsTest = await testEndpoint('/api/auth/me', 'CORS Preflight Test', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://sswanstudios.com',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization'
      }
    });
    
    if (corsTest.success || corsTest.status === 204) {
      console.log('✅ CORS preflight working correctly');
    } else {
      console.log('❌ CORS preflight issues detected');
    }
  } catch (error) {
    console.log('⚠️  CORS test failed:', error.message);
  }
}

// Run verification
console.log('Starting production authentication verification...\n');

runVerification()
  .then(() => runDiagnostics())
  .catch((error) => {
    console.error('\n💥 Verification failed with error:', error);
    process.exit(1);
  });
