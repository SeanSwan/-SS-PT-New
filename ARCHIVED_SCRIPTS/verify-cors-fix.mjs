/**
 * CORS VERIFICATION SCRIPT
 * ========================
 * Test script to verify CORS configuration is working
 */

console.log('🔍 CORS VERIFICATION TEST');
console.log('========================');

const testCorsConfiguration = async () => {
  const backendUrl = 'https://swan-studios-api.onrender.com';
  const frontendOrigin = 'https://sswanstudios.com';
  
  console.log('\n📋 Testing CORS Configuration:');
  console.log(`Backend: ${backendUrl}`);
  console.log(`Frontend Origin: ${frontendOrigin}`);
  console.log(`Current Origin: ${window.location.origin}`);
  
  // Test 1: Health endpoint
  console.log('\n🔍 Test 1: Health Endpoint CORS');
  try {
    const response = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Origin': window.location.origin,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Health endpoint response status:', response.status);
    console.log('✅ CORS headers present:');
    console.log('  - Access-Control-Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'));
    console.log('  - Access-Control-Allow-Credentials:', response.headers.get('Access-Control-Allow-Credentials'));
    console.log('  - Access-Control-Allow-Methods:', response.headers.get('Access-Control-Allow-Methods'));
    
    const data = await response.json();
    console.log('✅ Health response data:', data);
    
  } catch (error) {
    console.log('❌ Health endpoint CORS test failed:', error.message);
  }
  
  // Test 2: Options preflight
  console.log('\n🔍 Test 2: OPTIONS Preflight Request');
  try {
    const response = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    console.log('✅ OPTIONS preflight status:', response.status);
    console.log('✅ Preflight CORS headers:');
    console.log('  - Access-Control-Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'));
    console.log('  - Access-Control-Allow-Methods:', response.headers.get('Access-Control-Allow-Methods'));
    console.log('  - Access-Control-Allow-Headers:', response.headers.get('Access-Control-Allow-Headers'));
    
  } catch (error) {
    console.log('❌ OPTIONS preflight test failed:', error.message);
  }
  
  // Test 3: Actual login attempt (if we have credentials)
  console.log('\n🔍 Test 3: Login Endpoint CORS');
  try {
    const response = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Origin': window.location.origin,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'test',
        password: 'test'
      })
    });
    
    console.log('✅ Login endpoint response status:', response.status);
    console.log('✅ Login CORS headers present:');
    console.log('  - Access-Control-Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'));
    
    // Don't log the actual response data for security
    console.log('✅ Login endpoint accessible (CORS working)');
    
  } catch (error) {
    console.log('❌ Login endpoint CORS test failed:', error.message);
    
    if (error.message.includes('CORS')) {
      console.log('\n🚨 CORS ISSUE DETECTED:');
      console.log('The backend is still not properly configured for CORS.');
      console.log('Check the backend logs for CORS debugging messages.');
    }
  }
  
  console.log('\n📊 CORS TEST SUMMARY:');
  console.log('=====================');
  console.log('If all tests show ✅, CORS is properly configured.');
  console.log('If any test shows ❌, there are still CORS issues to resolve.');
  console.log('\nNext steps if CORS issues persist:');
  console.log('1. Check Render backend logs for CORS debug messages');
  console.log('2. Verify backend deployment completed successfully');
  console.log('3. Check if environment variables are properly set');
};

// Run the test
testCorsConfiguration();

// Make available for manual testing
if (typeof window !== 'undefined') {
  window.testCors = testCorsConfiguration;
  console.log('\n💡 Run window.testCors() to test CORS again manually');
}
