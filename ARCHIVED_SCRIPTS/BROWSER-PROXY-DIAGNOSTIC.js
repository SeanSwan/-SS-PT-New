// 🧪 COMPREHENSIVE PROXY VERIFICATION TEST
// =======================================
// Paste this entire script in browser console on https://sswanstudios.com

console.log('🧪 COMPREHENSIVE PROXY VERIFICATION TEST');
console.log('=======================================');

// Test 1: Environment Detection
console.log('\n📍 Test 1: Environment Detection');
console.log('Current hostname:', window.location.hostname);
console.log('Full URL:', window.location.href);

const IS_PRODUCTION = window.location.hostname.includes('render.com') || 
                     window.location.hostname.includes('sswanstudios.com') ||
                     window.location.hostname.includes('swanstudios.com');
console.log('IS_PRODUCTION detected:', IS_PRODUCTION);

// Test 2: Proxy Logic Detection  
console.log('\n🔄 Test 2: Proxy Logic Detection');
const USE_PROXY = window.location.hostname.includes('sswanstudios.com') ||
                  window.location.hostname.includes('swanstudios.com');
console.log('USE_PROXY should be:', USE_PROXY);

const API_BASE_URL = USE_PROXY ? '' : 'https://swan-studios-api.onrender.com';
console.log('API_BASE_URL should be:', API_BASE_URL || '(EMPTY - PROXY MODE)');

// Test 3: URL Construction
console.log('\n🔗 Test 3: API URL Construction');
const healthUrl = (API_BASE_URL || '') + '/health';
const loginUrl = (API_BASE_URL || '') + '/api/auth/login';

console.log('Health check URL:', healthUrl);
console.log('Login URL:', loginUrl);

if (loginUrl === '/api/auth/login') {
    console.log('✅ PERFECT! API calls will be same-origin (proxy enabled)');
} else {
    console.log('❌ PROBLEM! API calls will be cross-origin (proxy disabled)');
}

// Test 4: _redirects File Check
console.log('\n📄 Test 4: _redirects File Accessibility');
fetch('/_redirects')
    .then(response => {
        console.log('_redirects response status:', response.status);
        if (response.ok) {
            return response.text();
        } else {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
    })
    .then(content => {
        console.log('✅ _redirects file content:');
        console.log(content);
        
        if (content.includes('/api/*') && content.includes('swan-studios-api.onrender.com')) {
            console.log('✅ _redirects contains correct proxy rules!');
        } else {
            console.log('❌ _redirects missing expected proxy rules');
        }
    })
    .catch(error => {
        console.log('❌ _redirects file error:', error.message);
        console.log('This indicates deployment may not be complete or failed');
    });

// Test 5: API Connectivity Test (Non-intrusive)
console.log('\n🌐 Test 5: API Connectivity Test');
console.log('Testing health endpoint...');

// Use the same logic as the app
fetch(healthUrl, { 
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
})
.then(response => {
    console.log('Health check response status:', response.status);
    if (response.ok) {
        console.log('✅ Health check successful - backend reachable');
    } else {
        console.log('⚠️ Health check returned non-200 status');
    }
    return response.text();
})
.then(data => {
    console.log('Health check response:', data);
})
.catch(error => {
    console.log('❌ Health check failed:', error.message);
    
    if (error.message.includes('CORS') || error.message.includes('Access-Control-Allow-Origin')) {
        console.log('🚨 CORS ERROR DETECTED - Proxy is not working yet!');
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.log('🌐 Network error - could be CORS or connectivity issue');
    }
});

// Summary
console.log('\n📊 SUMMARY');
console.log('==========');
console.log('Expected after successful deployment:');
console.log('✅ USE_PROXY should be: true');
console.log('✅ API_BASE_URL should be: (empty)');
console.log('✅ Login URL should be: /api/auth/login');
console.log('✅ _redirects file should be accessible');
console.log('✅ Health check should work without CORS errors');
console.log('\nIf any of these fail, deployment may still be in progress or failed.');

console.log('\n🎯 NEXT STEPS:');
console.log('If tests pass: Try login - should work without CORS errors');
console.log('If tests fail: Wait longer for deployment or check Render dashboard');
