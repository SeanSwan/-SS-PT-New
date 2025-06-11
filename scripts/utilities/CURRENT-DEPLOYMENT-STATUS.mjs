#!/usr/bin/env node

/**
 * COMPREHENSIVE DEPLOYMENT STATUS CHECKER
 * ========================================
 * Checks both local and remote deployment status for SwanStudios
 */

console.log('🔍 SWANSTUDIOS DEPLOYMENT STATUS CHECKER');
console.log('==========================================\n');

// Test configuration
const BACKEND_URL = 'https://swan-studios-api.onrender.com';
const FRONTEND_URL = 'https://sswanstudios.com';
const FRONTEND_ORIGIN = 'https://sswanstudios.com';

// Import required modules
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Test remote backend health
 */
async function testBackendHealth() {
  console.log('🌐 TESTING REMOTE BACKEND HEALTH');
  console.log('================================');
  
  try {
    console.log(`Testing: ${BACKEND_URL}/health`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${BACKEND_URL}/health`, {
      signal: controller.signal,
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'User-Agent': 'SwanStudios-Deployment-Checker/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    
    console.log(`✅ Response Status: ${response.status} ${response.statusText}`);
    
    // Check response headers
    console.log('\n📋 Response Headers:');
    const headers = {};
    for (const [key, value] of response.headers.entries()) {
      headers[key] = value;
      if (key.toLowerCase().includes('cors') || key.toLowerCase().includes('origin')) {
        console.log(`  🔸 ${key}: ${value}`);
      }
    }
    
    // Check for Render-specific headers
    if (headers['x-render-routing']) {
      console.log(`  ⚠️  x-render-routing: ${headers['x-render-routing']}`);
      if (headers['x-render-routing'] === 'no-server') {
        console.log('  ❌ CRITICAL: Render shows "no-server" - backend not starting!');
        return false;
      }
    }
    
    // Try to parse response
    try {
      const data = await response.json();
      console.log('\n📊 Response Data:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.status === 'ok' || data.status === 'healthy') {
        console.log('✅ Backend is healthy and responding correctly!');
        return true;
      }
    } catch (parseError) {
      const text = await response.text();
      console.log('\n📄 Response Text:');
      console.log(text);
    }
    
    return response.ok;
    
  } catch (error) {
    console.log('❌ Backend health check failed:');
    
    if (error.name === 'AbortError') {
      console.log('  💥 Connection timeout (10 seconds) - backend not responding');
    } else if (error.code === 'ENOTFOUND') {
      console.log('  💥 DNS resolution failed - domain not found');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('  💥 Connection refused - service not running');
    } else if (error.message.includes('fetch')) {
      console.log('  💥 Network error - cannot reach backend');
    } else {
      console.log(`  💥 Error: ${error.message}`);
    }
    
    return false;
  }
}

/**
 * Test CORS configuration
 */
async function testCORS() {
  console.log('\n🔒 TESTING CORS CONFIGURATION');
  console.log('=============================');
  
  try {
    console.log(`Testing CORS for: ${FRONTEND_ORIGIN} → ${BACKEND_URL}/api/auth/login`);
    
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });
    
    console.log(`✅ OPTIONS Status: ${response.status} ${response.statusText}`);
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
      'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
      'access-control-max-age': response.headers.get('access-control-max-age')
    };
    
    console.log('\n📋 CORS Headers:');
    for (const [key, value] of Object.entries(corsHeaders)) {
      if (value) {
        console.log(`  ✅ ${key}: ${value}`);
      } else {
        console.log(`  ❌ ${key}: MISSING`);
      }
    }
    
    // Check if origin is allowed
    const allowedOrigin = corsHeaders['access-control-allow-origin'];
    if (allowedOrigin === FRONTEND_ORIGIN || allowedOrigin === '*') {
      console.log(`\n✅ CORS: ${FRONTEND_ORIGIN} is allowed`);
      return true;
    } else {
      console.log(`\n❌ CORS: ${FRONTEND_ORIGIN} is NOT allowed (got: ${allowedOrigin})`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ CORS test failed: ${error.message}`);
    return false;
  }
}

/**
 * Check local files configuration
 */
function checkLocalConfiguration() {
  console.log('\n📁 CHECKING LOCAL CONFIGURATION');
  console.log('===============================');
  
  const criticalFiles = [
    'backend/render.yaml',
    'backend/scripts/render-start.mjs',
    'backend/core/app.mjs',
    'backend/models/Achievement.mjs',
    'frontend/.env.production',
    'frontend/src/services/api.service.ts',
    'frontend/src/context/AuthContext.tsx',
    'frontend/vite.config.js'
  ];
  
  let allFilesExist = true;
  
  for (const file of criticalFiles) {
    const fullPath = join(__dirname, file);
    if (existsSync(fullPath)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - MISSING!`);
      allFilesExist = false;
    }
  }
  
  return allFilesExist;
}

/**
 * Test frontend accessibility
 */
async function testFrontend() {
  console.log('\n🎨 TESTING FRONTEND ACCESSIBILITY');
  console.log('=================================');
  
  try {
    console.log(`Testing: ${FRONTEND_URL}`);
    
    const response = await fetch(FRONTEND_URL, {
      headers: {
        'User-Agent': 'SwanStudios-Deployment-Checker/1.0'
      }
    });
    
    console.log(`✅ Frontend Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('✅ Frontend is accessible!');
      return true;
    } else {
      console.log('❌ Frontend returned error status');
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Frontend test failed: ${error.message}`);
    return false;
  }
}

/**
 * Generate deployment report
 */
function generateReport(results) {
  console.log('\n📊 DEPLOYMENT STATUS REPORT');
  console.log('===========================');
  
  const { backendHealth, cors, localConfig, frontend } = results;
  
  console.log(`Backend Health:        ${backendHealth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`CORS Configuration:    ${cors ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Local Configuration:   ${localConfig ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Frontend Accessibility: ${frontend ? '✅ PASS' : '❌ FAIL'}`);
  
  const overallSuccess = backendHealth && cors && localConfig && frontend;
  
  console.log('\n🎯 OVERALL STATUS:');
  if (overallSuccess) {
    console.log('✅ ALL SYSTEMS OPERATIONAL - Login should work!');
  } else {
    console.log('❌ ISSUES DETECTED - See specific failures above');
    
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    if (!backendHealth) {
      console.log('  1. Check Render dashboard for deployment status');
      console.log('  2. Verify environment variables in Render');
      console.log('  3. Check Render deployment logs for errors');
    }
    if (!cors) {
      console.log('  1. Verify FRONTEND_ORIGINS environment variable in Render');
      console.log('  2. Check if backend is actually running (not just deployed)');
    }
    if (!localConfig) {
      console.log('  1. Ensure all critical files are present');
      console.log('  2. Run git status to check for uncommitted changes');
    }
    if (!frontend) {
      console.log('  1. Check frontend deployment status');
      console.log('  2. Verify frontend is pointing to correct backend URL');
    }
  }
  
  console.log('\n🚀 NEXT STEPS:');
  console.log('==============');
  if (backendHealth && cors) {
    console.log('1. Try logging in at: https://sswanstudios.com/login');
    console.log('2. Use credentials: admin / admin123');
    console.log('3. Check browser console for any remaining errors');
  } else {
    console.log('1. Fix backend deployment issues first');
    console.log('2. Check Render dashboard and logs');
    console.log('3. Verify environment variables are set correctly');
    console.log('4. Re-run this checker after fixes');
  }
}

/**
 * Main execution
 */
async function main() {
  const results = {
    backendHealth: false,
    cors: false,
    localConfig: false,
    frontend: false
  };
  
  // Run all tests
  results.localConfig = checkLocalConfiguration();
  results.backendHealth = await testBackendHealth();
  
  if (results.backendHealth) {
    results.cors = await testCORS();
  } else {
    console.log('\n⏭️  Skipping CORS test - backend not responding');
  }
  
  results.frontend = await testFrontend();
  
  // Generate report
  generateReport(results);
  
  console.log('\n✨ Deployment status check complete!');
}

// Run the checker
main().catch(error => {
  console.error('💥 Deployment checker failed:', error);
  process.exit(1);
});
