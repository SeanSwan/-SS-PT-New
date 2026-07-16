// 🧪 Production Proxy Test Script
// ================================
// Run this in browser console on https://sswanstudios.com after deployment

console.log('🧪 Testing Production Proxy Configuration');
console.log('=========================================');

// Test 1: Check hostname and proxy detection
console.log('\n📍 Test 1: Hostname & Proxy Detection');
console.log('Current hostname:', window.location.hostname);

const USE_PROXY = window.location.hostname.includes('sswanstudios.com') ||
                  window.location.hostname.includes('swanstudios.com');
console.log('USE_PROXY detected:', USE_PROXY);

const API_BASE_URL = USE_PROXY ? '' : 'https://swan-studios-api.onrender.com';
console.log('API_BASE_URL will be:', API_BASE_URL || '(empty - using proxy)');

// Test 2: Check what login URL will be constructed
console.log('\n🔗 Test 2: API URL Construction');
const loginUrl = (API_BASE_URL || '') + '/api/auth/login';
console.log('Login URL will be:', loginUrl);

if (loginUrl === '/api/auth/login') {
    console.log('✅ PERFECT! API calls will be same-origin (proxy enabled)');
} else {
    console.log('❌ Problem! API calls will be cross-origin (proxy not working)');
}

// Test 3: Test _redirects file accessibility
console.log('\n📄 Test 3: _redirects File Check');
fetch('/_redirects')
    .then(response => {
        if (response.ok) {
            return response.text();
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    })
    .then(content => {
        console.log('✅ _redirects file found!');
        console.log('Content:', content);
        
        if (content.includes('/api/*') && content.includes('swan-studios-api.onrender.com')) {
            console.log('✅ _redirects contains correct proxy rules!');
        } else {
            console.log('❌ _redirects missing proxy rules');
        }
    })
    .catch(error => {
        console.log('❌ _redirects file not accessible:', error.message);
        console.log('This means the updated frontend was not deployed correctly');
    });

// Test 4: Simple API connectivity test (optional)
console.log('\n🌐 Test 4: API Connectivity Test');
console.log('You can now test login - API calls should go to /api/* (same-origin)');
console.log('Watch the Network tab for requests to /api/auth/login');
console.log('NO OPTIONS preflight requests should appear!');

console.log('\n🎉 Proxy test complete! Check results above.');
