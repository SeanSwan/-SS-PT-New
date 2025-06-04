/**
 * Backend URL Verification
 * ========================
 * Tests if the correct backend URL is accessible
 */

console.log('🔍 BACKEND URL VERIFICATION');
console.log('===========================\n');

// Test the URLs we think should work
const urlsToTest = [
  'https://swan-studios-api.onrender.com/api/health',
  'https://swan-studios-api.onrender.com/api/auth/health',
  'https://swan-studios-api.onrender.com/'
];

async function testBackendUrl() {
  console.log('Testing backend connectivity...\n');
  
  for (const url of urlsToTest) {
    console.log(`🔍 Testing: ${url}`);
    
    try {
      // Use fetch if available, otherwise provide manual test instructions
      if (typeof fetch !== 'undefined') {
        const response = await fetch(url, { 
          method: 'GET',
          timeout: 10000 
        });
        
        console.log(`   Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          console.log('   ✅ Backend is accessible!');
        } else {
          console.log('   ⚠️ Backend returned error status');
        }
      } else {
        console.log('   ℹ️ Manual test needed - check this URL in browser');
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log(''); // Add spacing
  }
}

async function testLoginEndpoint() {
  console.log('🔐 Testing login endpoint...\n');
  
  const loginUrl = 'https://swan-studios-api.onrender.com/api/auth/login';
  console.log(`Testing: ${loginUrl}`);
  
  try {
    // For security, we won't actually send credentials in this test
    // Just check if the endpoint exists
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}) // Empty body should return validation error, not 404
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 400 || response.status === 422) {
      console.log('✅ Login endpoint exists and is working (validation error expected)');
    } else if (response.status === 404) {
      console.log('❌ Login endpoint not found - backend may not be deployed');
    } else {
      console.log(`ℹ️ Unexpected status ${response.status} - check manually`);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Browser-compatible version (no fetch)
function browserTest() {
  console.log('🌐 BROWSER TEST INSTRUCTIONS');
  console.log('============================\n');
  
  console.log('1. Open these URLs in a new browser tab:');
  urlsToTest.forEach((url, index) => {
    console.log(`   ${index + 1}. ${url}`);
  });
  
  console.log('\n2. Expected results:');
  console.log('   ✅ Should see "OK", "Server running", or similar');
  console.log('   ❌ If you see "Application error" or timeout, backend is down');
  
  console.log('\n3. Test login endpoint:');
  console.log('   URL: https://swan-studios-api.onrender.com/api/auth/login');
  console.log('   Method: POST (will show error without credentials - that\'s normal)');
  
  console.log('\n4. If backend is down:');
  console.log('   - Check Render dashboard');
  console.log('   - Look for build/deployment errors');
  console.log('   - Check environment variables are set');
}

// Run the test
if (typeof window === 'undefined') {
  // Node.js environment
  if (typeof fetch === 'undefined') {
    console.log('⚠️ fetch not available - showing manual test instructions\n');
    browserTest();
  } else {
    testBackendUrl().then(() => testLoginEndpoint());
  }
} else {
  // Browser environment
  if (typeof fetch !== 'undefined') {
    testBackendUrl().then(() => testLoginEndpoint());
  } else {
    browserTest();
  }
}
