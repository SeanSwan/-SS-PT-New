// 🚨 EMERGENCY PROXY DIAGNOSTIC - Run in console on https://sswanstudios.com
// ============================================================================

console.log('🚨 EMERGENCY PROXY DIAGNOSTIC');
console.log('=============================');

// Test hostname detection
console.log('🌐 Current hostname:', window.location.hostname);
console.log('🔍 Includes sswanstudios.com:', window.location.hostname.includes('sswanstudios.com'));

// Check production detection
const IS_PRODUCTION = window.location.hostname.includes('render.com') || 
                     window.location.hostname.includes('sswanstudios.com') ||
                     window.location.hostname.includes('swanstudios.com');
console.log('🏭 IS_PRODUCTION:', IS_PRODUCTION);

// Check proxy detection logic
const USE_PROXY = window.location.hostname.includes('sswanstudios.com') ||
                  window.location.hostname.includes('swanstudios.com');
console.log('🔄 USE_PROXY should be:', USE_PROXY);

// Check what API_BASE_URL would be
const API_BASE_URL = USE_PROXY ? '' : 'https://swan-studios-api.onrender.com';
console.log('🎯 API_BASE_URL should be:', API_BASE_URL || '(EMPTY - PROXY MODE)');

// Test what login URL would be constructed
const loginUrl = (API_BASE_URL || '') + '/api/auth/login';
console.log('🔗 Login URL would be:', loginUrl);

if (loginUrl === '/api/auth/login') {
    console.log('✅ CORRECT: Should use proxy (same-origin requests)');
} else {
    console.log('❌ PROBLEM: Will make cross-origin requests');
    console.log('❌ This explains the CORS errors!');
}

// Test _redirects file
console.log('\n📄 Testing _redirects file...');
fetch('/_redirects')
    .then(response => response.ok ? response.text() : Promise.reject(`HTTP ${response.status}`))
    .then(content => {
        console.log('✅ _redirects file found:', content);
    })
    .catch(error => {
        console.log('❌ _redirects file missing or inaccessible:', error);
    });

console.log('\n🎯 DIAGNOSIS COMPLETE - Check results above!');
