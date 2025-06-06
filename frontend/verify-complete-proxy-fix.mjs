#!/usr/bin/env node
/**
 * COMPREHENSIVE PROXY FIX VERIFICATION
 * ===================================
 * Verifies all aspects of the proxy fix are in place
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🔍 SwanStudios Comprehensive Proxy Fix Verification');
console.log('==================================================\n');

let allChecksPass = true;

// Check 1: Source _redirects file in public folder
console.log('📋 Check 1: Source _redirects configuration');
const publicRedirectsPath = './public/_redirects';
if (existsSync(publicRedirectsPath)) {
    const content = readFileSync(publicRedirectsPath, 'utf8');
    const hasApiProxy = content.includes('/api/*') && content.includes('swan-studios-api.onrender.com');
    const hasSpaFallback = content.includes('/*') && content.includes('/index.html');
    
    console.log('✅ Source _redirects file found');
    console.log(`✅ API proxy rule: ${hasApiProxy ? 'PRESENT' : '❌ MISSING'}`);
    console.log(`✅ SPA fallback rule: ${hasSpaFallback ? 'PRESENT' : '❌ MISSING'}`);
    
    if (!hasApiProxy || !hasSpaFallback) allChecksPass = false;
} else {
    console.log('❌ Source _redirects file missing from public folder');
    allChecksPass = false;
}

// Check 2: Build output _redirects file
console.log('\n📋 Check 2: Built _redirects configuration');
const distRedirectsPath = './dist/_redirects';
if (existsSync(distRedirectsPath)) {
    const content = readFileSync(distRedirectsPath, 'utf8');
    const hasApiProxy = content.includes('/api/*') && content.includes('swan-studios-api.onrender.com');
    const hasSpaFallback = content.includes('/*') && content.includes('/index.html');
    
    console.log('✅ Dist _redirects file found');
    console.log(`✅ API proxy rule: ${hasApiProxy ? 'PRESENT' : '❌ MISSING'}`);
    console.log(`✅ SPA fallback rule: ${hasSpaFallback ? 'PRESENT' : '❌ MISSING'}`);
    
    if (!hasApiProxy || !hasSpaFallback) allChecksPass = false;
} else {
    console.log('❌ Dist _redirects file missing (run npm run build)');
    allChecksPass = false;
}

// Check 3: Package.json copy-redirects script
console.log('\n📋 Check 3: Package.json copy-redirects script');
const packageJsonPath = './package.json';
if (existsSync(packageJsonPath)) {
    const packageContent = readFileSync(packageJsonPath, 'utf8');
    const packageData = JSON.parse(packageContent);
    const copyScript = packageData.scripts?.['copy-redirects'];
    
    if (copyScript && copyScript.includes('public/_redirects')) {
        console.log('✅ copy-redirects script correctly configured');
    } else {
        console.log('❌ copy-redirects script incorrect or missing');
        console.log(`   Current: ${copyScript || 'MISSING'}`);
        console.log('   Expected to include: public/_redirects');
        allChecksPass = false;
    }
} else {
    console.log('❌ package.json not found');
    allChecksPass = false;
}

// Check 4: API Service proxy detection
console.log('\n📋 Check 4: API Service proxy detection logic');
const apiServicePath = './src/services/api.service.ts';
if (existsSync(apiServicePath)) {
    const apiContent = readFileSync(apiServicePath, 'utf8');
    const hasProxyCheck = apiContent.includes('USE_PROXY') || apiContent.includes('sswanstudios.com');
    const hasEmptyBaseUrl = apiContent.includes("USE_PROXY ? ''");
    
    console.log(`✅ Proxy detection logic: ${hasProxyCheck ? 'PRESENT' : '❌ MISSING'}`);
    console.log(`✅ Empty base URL for proxy: ${hasEmptyBaseUrl ? 'PRESENT' : '❌ MISSING'}`);
    
    if (!hasProxyCheck || !hasEmptyBaseUrl) allChecksPass = false;
} else {
    console.log('❌ API service file not found');
    allChecksPass = false;
}

// Final result
console.log('\n🏁 VERIFICATION SUMMARY');
console.log('========================');

if (allChecksPass) {
    console.log('🎉 ALL CHECKS PASSED! Proxy fix is complete.');
    console.log('\n📋 DEPLOYMENT READY:');
    console.log('1. The dist folder contains correct _redirects with proxy');
    console.log('2. API service will detect sswanstudios.com and use proxy');
    console.log('3. All requests will be same-origin when deployed');
    console.log('\n🚀 Deploy dist folder contents to https://sswanstudios.com');
} else {
    console.log('❌ SOME CHECKS FAILED - Review issues above');
    console.log('💡 Fix issues and run verification again');
}
