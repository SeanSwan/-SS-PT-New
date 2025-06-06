#!/usr/bin/env node

/**
 * IMMEDIATE FRONTEND PROXY VERIFICATION
 * ====================================
 * Verifies that the _redirects proxy fix is correctly applied
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🔍 SwanStudios Frontend Proxy Verification');
console.log('==========================================\n');

// Check if dist folder exists
const distPath = './dist';
if (!existsSync(distPath)) {
    console.log('❌ ERROR: dist folder not found');
    console.log('💡 Run: npm run build');
    process.exit(1);
}

// Check if _redirects exists in dist
const redirectsPath = join(distPath, '_redirects');
if (!existsSync(redirectsPath)) {
    console.log('❌ ERROR: _redirects file missing from dist folder');
    console.log('💡 Run: npm run copy-redirects');
    process.exit(1);
}

// Read and verify _redirects content
const redirectsContent = readFileSync(redirectsPath, 'utf8');
console.log('📋 Current _redirects content in dist folder:');
console.log('─'.repeat(50));
console.log(redirectsContent);
console.log('─'.repeat(50));

// Verify proxy configuration
const hasApiProxy = redirectsContent.includes('/api/*') && 
                   redirectsContent.includes('swan-studios-api.onrender.com');
const hasSpaFallback = redirectsContent.includes('/*') && 
                      redirectsContent.includes('/index.html');

console.log('\n🔍 Configuration Check:');
console.log(`✅ API Proxy Rule: ${hasApiProxy ? 'FOUND' : '❌ MISSING'}`);
console.log(`✅ SPA Fallback Rule: ${hasSpaFallback ? 'FOUND' : '❌ MISSING'}`);

if (hasApiProxy && hasSpaFallback) {
    console.log('\n🎉 SUCCESS: Frontend proxy configuration is correct!');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Deploy the contents of the dist/ folder to your hosting platform');
    console.log('2. Ensure the _redirects file is included in the deployment');
    console.log('3. Test login at https://sswanstudios.com/login');
    console.log('4. Check browser DevTools Network tab - API calls should be to /api/* (same-origin)');
    console.log('\n💡 Expected behavior:');
    console.log('   - Browser makes request to: https://sswanstudios.com/api/auth/login');
    console.log('   - Proxy forwards to: https://swan-studios-api.onrender.com/api/auth/login');
    console.log('   - No CORS preflight errors!');
} else {
    console.log('\n❌ ERROR: Proxy configuration incomplete');
    console.log('💡 Run: npm run build (this will rebuild with correct _redirects)');
}
