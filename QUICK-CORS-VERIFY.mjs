#!/usr/bin/env node

/**
 * QUICK CORS VERIFICATION TOOL
 * ============================
 * Rapid test of CORS configuration and deployment status
 */

console.log('🚀 QUICK CORS VERIFICATION TOOL');
console.log('===============================\n');

const BACKEND_URL = 'https://swan-studios-api.onrender.com';
const FRONTEND_ORIGIN = 'https://sswanstudios.com';

async function quickTest() {
  console.log(`🎯 Testing: ${FRONTEND_ORIGIN} → ${BACKEND_URL}`);
  console.log('─'.repeat(50));
  
  try {
    // Test 1: Health check with origin
    console.log('1️⃣ Health Check...');
    const healthResponse = await fetch(`${BACKEND_URL}/health`, {
      headers: { 'Origin': FRONTEND_ORIGIN }
    });
    
    const allowOrigin = healthResponse.headers.get('access-control-allow-origin');
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   CORS Header: ${allowOrigin || 'MISSING'}`);
    
    if (allowOrigin === FRONTEND_ORIGIN) {
      console.log('   ✅ CORS: WORKING!\n');
    } else {
      console.log('   ❌ CORS: NOT WORKING\n');
    }
    
    // Test 2: Login preflight
    console.log('2️⃣ Login Preflight...');
    const preflightResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });
    
    const preflightAllowOrigin = preflightResponse.headers.get('access-control-allow-origin');
    console.log(`   Status: ${preflightResponse.status}`);
    console.log(`   CORS Header: ${preflightAllowOrigin || 'MISSING'}`);
    
    if (preflightResponse.status === 204 && preflightAllowOrigin === FRONTEND_ORIGIN) {
      console.log('   ✅ LOGIN PREFLIGHT: WORKING!\n');
      
      console.log('🎉 SUCCESS! CORS is properly configured!');
      console.log('🔥 You can now proceed with login testing:');
      console.log('   → Go to: https://sswanstudios.com/login');
      console.log('   → Use: admin / admin123');
      console.log('   → Should work without CORS errors!');
      
    } else {
      console.log('   ❌ LOGIN PREFLIGHT: NOT WORKING\n');
      console.log('🚨 CORS issues detected. Run EMERGENCY-P0-DEPLOYMENT.bat');
    }
    
  } catch (error) {
    console.log(`💥 Connection Error: ${error.message}`);
    console.log('🚨 Backend may be down or still deploying');
    console.log('💡 Wait 2-3 minutes and try again');
  }
}

quickTest();
