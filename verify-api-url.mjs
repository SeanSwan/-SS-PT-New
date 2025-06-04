/**
 * FRONTEND API URL VERIFICATION SCRIPT
 * ===================================
 * Test script to verify the correct API URL is being used in the built frontend
 */

console.log('🔍 FRONTEND API URL VERIFICATION');
console.log('================================');

// Test the environment variable reading
const testApiConfig = () => {
  console.log('\n📋 Environment Variables Check:');
  
  // Check what Vite environment variables are available
  const envVars = {
    VITE_API_URL: import.meta.env?.VITE_API_URL,
    VITE_API_BASE_URL: import.meta.env?.VITE_API_BASE_URL,
    VITE_BACKEND_URL: import.meta.env?.VITE_BACKEND_URL,
    MODE: import.meta.env?.MODE,
    PROD: import.meta.env?.PROD
  };
  
  console.log('Available environment variables:', envVars);
  
  // Simulate the API service URL detection logic
  const IS_PRODUCTION = import.meta.env?.PROD || 
                       window.location.hostname.includes('render.com') || 
                       window.location.hostname.includes('sswanstudios.com') ||
                       window.location.hostname.includes('swanstudios.com');
  
  const API_BASE_URL = import.meta.env?.VITE_API_URL || 
                       import.meta.env?.VITE_BACKEND_URL ||
                       import.meta.env?.VITE_API_BASE_URL ||
                       (IS_PRODUCTION
                         ? 'https://swan-studios-api.onrender.com'
                         : 'http://localhost:10000');
  
  console.log('\n🎯 Final Configuration:');
  console.log('IS_PRODUCTION:', IS_PRODUCTION);
  console.log('API_BASE_URL:', API_BASE_URL);
  console.log('Current hostname:', window.location.hostname);
  
  // Verify the correct URL is being used
  const expectedUrl = 'https://swan-studios-api.onrender.com';
  const isCorrect = API_BASE_URL === expectedUrl;
  
  console.log('\n✅ VERIFICATION RESULT:');
  console.log(`Expected URL: ${expectedUrl}`);
  console.log(`Actual URL: ${API_BASE_URL}`);
  console.log(`Status: ${isCorrect ? '✅ CORRECT' : '❌ WRONG'}`);
  
  if (!isCorrect) {
    console.log('\n🚨 API URL IS INCORRECT!');
    console.log('The frontend is not using the correct backend URL.');
    console.log('This means the build was not properly configured or deployed.');
  } else {
    console.log('\n🎉 API URL IS CORRECT!');
    console.log('The frontend should now make requests to the correct backend.');
  }
  
  return { isCorrect, actualUrl: API_BASE_URL, expectedUrl };
};

// Run the test
const result = testApiConfig();

// Make this available in browser console for manual testing
if (typeof window !== 'undefined') {
  window.testApiConfig = testApiConfig;
  window.verifyApiUrl = () => {
    console.log('🔍 Manual API URL verification:');
    return testApiConfig();
  };
}

export default result;
