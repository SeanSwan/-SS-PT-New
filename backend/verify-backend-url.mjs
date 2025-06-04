#!/usr/bin/env node

/**
 * Backend URL & Health Verification
 * =================================
 * Tests if the correct backend URL is accessible and working
 */

console.log('🔍 Backend URL & Health Verification');
console.log('====================================\n');

const BACKEND_URLS = [
  'https://swan-studios-api.onrender.com',
  'https://ss-pt-new.onrender.com' // Old URL for comparison
];

async function testUrl(baseUrl, endpoint = '/api/health') {
  const fullUrl = `${baseUrl}${endpoint}`;
  console.log(`🧪 Testing: ${fullUrl}`);
  
  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      timeout: 15000
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const responseText = await response.text();
      console.log(`   Response: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}`);
      console.log('   ✅ Backend is accessible!');
      return true;
    } else {
      console.log('   ❌ Backend returned error status');
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function testLogin(baseUrl, credentials = { username: 'admin', password: 'admin123' }) {
  const loginUrl = `${baseUrl}/api/auth/login`;
  console.log(`🔐 Testing login: ${loginUrl}`);
  
  try {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials)
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 200) {
      console.log('   ✅ LOGIN SUCCESS!');
      const data = await response.json();
      if (data.user) {
        console.log(`   User: ${data.user.username} (${data.user.role})`);
      }
      return true;
    } else if (response.status === 401) {
      console.log('   ❌ Invalid credentials (expected if admin user not created yet)');
      return false;
    } else if (response.status === 404) {
      console.log('   ❌ Login endpoint not found');
      return false;
    } else {
      console.log('   ❌ Other error');
      const text = await response.text();
      console.log(`   Response: ${text.substring(0, 200)}`);
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🎯 Checking which backend URL is working...\n');
  
  let workingUrl = null;
  
  // Test each backend URL
  for (const url of BACKEND_URLS) {
    console.log(`📡 Testing: ${url}`);
    console.log('-'.repeat(50));
    
    const healthOk = await testUrl(url);
    
    if (healthOk) {
      console.log(`✅ ${url} is accessible\n`);
      workingUrl = url;
      
      // Also test login endpoint
      await testLogin(url);
      console.log('');
      break;
    } else {
      console.log(`❌ ${url} is not accessible\n`);
    }
  }
  
  console.log('📊 SUMMARY:');
  console.log('===========');
  
  if (workingUrl) {
    console.log(`✅ Working backend: ${workingUrl}`);
    
    if (workingUrl.includes('swan-studios-api')) {
      console.log('✅ This is the CORRECT backend URL');
      console.log('');
      console.log('🔧 Next steps:');
      console.log('1. Run: node create-admin-prod.mjs (to create admin user)');
      console.log('2. Rebuild frontend to use this URL');
      console.log('3. Deploy frontend');
    } else {
      console.log('⚠️ This is the OLD backend URL');
      console.log('Frontend should call swan-studios-api.onrender.com instead');
    }
  } else {
    console.log('❌ No working backend URL found');
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('1. Check Render dashboard for deployment status');
    console.log('2. Check if backend is deployed to swan-studios-api.onrender.com');
    console.log('3. Check build/deployment logs for errors');
  }
  
  console.log('');
  console.log('🌐 Manual verification:');
  console.log('Open these URLs in browser:');
  BACKEND_URLS.forEach(url => {
    console.log(`   ${url}/api/health`);
  });
}

// Check for fetch availability
if (typeof fetch === 'undefined') {
  console.log('❌ Error: This script requires Node.js 18+ with fetch support');
  console.log('');
  console.log('🌐 Manual verification instead:');
  console.log('Open these URLs in your browser:');
  BACKEND_URLS.forEach(url => {
    console.log(`   ${url}/api/health`);
  });
  console.log('');
  console.log('Expected: {"status": "OK"} or similar');
  process.exit(1);
}

main();
