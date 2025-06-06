// Production Proxy Detection Verification
// Run this in browser console on https://sswanstudios.com

console.log('🔍 API Service Proxy Detection Test');
console.log('===================================');

// Check hostname detection
console.log('🌐 Current hostname:', window.location.hostname);
console.log('🔍 Includes sswanstudios.com:', window.location.hostname.includes('sswanstudios.com'));

// Check if USE_PROXY would be true
const USE_PROXY = window.location.hostname.includes('sswanstudios.com') ||
                  window.location.hostname.includes('swanstudios.com');

console.log('✅ USE_PROXY should be:', USE_PROXY);

// Check what API_BASE_URL would be set to
const API_BASE_URL = USE_PROXY ? '' : 'https://swan-studios-api.onrender.com';
console.log('🎯 API_BASE_URL should be:', API_BASE_URL || '(empty - using proxy)');

// Test what URL would be constructed for login
const loginUrl = USE_PROXY ? '/api/auth/login' : 'https://swan-studios-api.onrender.com/api/auth/login';
console.log('🔗 Login URL would be:', loginUrl);

console.log('\n💡 If USE_PROXY is true and API_BASE_URL is empty, proxy should work!');
console.log('💡 If login URL starts with /api/, proxy is configured correctly');
