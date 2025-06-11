#!/usr/bin/env node

/**
 * BACKEND VERIFICATION FOR PROXY FIX
 * =================================
 * Verifies the backend is responding correctly for the proxy
 */

import https from 'https';

console.log('🔍 Backend Verification for Proxy Fix');
console.log('=====================================\n');

const backendUrl = 'https://swan-studios-api.onrender.com';

async function checkEndpoint(path, description) {
    return new Promise((resolve) => {
        const url = `${backendUrl}${path}`;
        console.log(`🔍 Testing: ${description}`);
        console.log(`   URL: ${url}`);
        
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`   Status: ${res.statusCode}`);
                console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
                
                if (res.headers['access-control-allow-origin']) {
                    console.log(`   ✅ CORS header present: ${res.headers['access-control-allow-origin']}`);
                } else {
                    console.log(`   ⚠️  No CORS header (may be normal for some endpoints)`);
                }
                
                console.log(`   Response preview: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}\n`);
                resolve({ status: res.statusCode, success: res.statusCode < 400 });
            });
        });
        
        req.on('error', (error) => {
            console.log(`   ❌ ERROR: ${error.message}\n`);
            resolve({ status: 'ERROR', success: false, error: error.message });
        });
        
        req.setTimeout(10000, () => {
            console.log(`   ❌ TIMEOUT after 10 seconds\n`);
            req.destroy();
            resolve({ status: 'TIMEOUT', success: false });
        });
    });
}

async function main() {
    const endpoints = [
        { path: '/health', description: 'Health Check' },
        { path: '/api/health', description: 'API Health Check' },
        { path: '/api/auth/login', description: 'Login Endpoint (should return method not allowed for GET)' }
    ];
    
    let allGood = true;
    
    for (const endpoint of endpoints) {
        const result = await checkEndpoint(endpoint.path, endpoint.description);
        if (!result.success && endpoint.path !== '/api/auth/login') {
            allGood = false;
        }
        // Login endpoint returning 405 (Method Not Allowed) for GET is actually good
        if (endpoint.path === '/api/auth/login' && result.status === 405) {
            console.log('   ✅ Login endpoint correctly rejects GET requests\n');
        }
    }
    
    console.log('📋 BACKEND STATUS SUMMARY:');
    console.log('=========================');
    
    if (allGood) {
        console.log('✅ Backend appears to be running and responsive');
        console.log('✅ Ready for proxy requests from frontend');
        console.log('\n💡 Once frontend proxy is deployed:');
        console.log('   - Frontend will make requests to /api/* (same-origin)');
        console.log('   - Proxy will forward to https://swan-studios-api.onrender.com/api/*');
        console.log('   - CORS issues should be eliminated');
    } else {
        console.log('❌ Backend may have issues - check Render dashboard');
        console.log('⚠️  Proxy fix may not work until backend is healthy');
    }
}

main().catch(console.error);
