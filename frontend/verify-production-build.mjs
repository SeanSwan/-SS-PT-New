#!/usr/bin/env node

/**
 * 🚀 RENDER FRONTEND BUILD VERIFICATION TOOL
 * Comprehensive build verification for SwanStudios frontend deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 VERIFYING FRONTEND BUILD FOR RENDER DEPLOYMENT...\n');

const checks = [];

// Check 1: Verify dist directory exists
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  checks.push('✅ dist/ directory exists');
} else {
  checks.push('❌ dist/ directory MISSING - Run: npm run build');
}

// Check 2: Verify index.html exists in dist
if (fs.existsSync(path.join(__dirname, 'dist', 'index.html'))) {
  checks.push('✅ dist/index.html exists');
} else {
  checks.push('❌ dist/index.html MISSING - Build failed');
}

// Check 3: Verify _redirects file exists in dist
if (fs.existsSync(path.join(__dirname, 'dist', '_redirects'))) {
  checks.push('✅ dist/_redirects exists (SPA routing)');
} else {
  checks.push('❌ dist/_redirects MISSING - SPA routing will fail');
}

// Check 4: Verify assets directory exists
if (fs.existsSync(path.join(__dirname, 'dist', 'assets'))) {
  checks.push('✅ dist/assets/ directory exists');
} else {
  checks.push('❌ dist/assets/ directory MISSING');
}

// Check 5: Verify .env.production exists
if (fs.existsSync(path.join(__dirname, '.env.production'))) {
  checks.push('✅ .env.production exists');
  
  // Check environment variables
  const envContent = fs.readFileSync(path.join(__dirname, '.env.production'), 'utf8');
  if (envContent.includes('VITE_API_URL=https://ss-pt-new.onrender.com')) {
    checks.push('✅ Production API URL correctly configured');
  } else {
    checks.push('❌ Production API URL not configured correctly');
  }
} else {
  checks.push('❌ .env.production MISSING');
}

// Check 6: Verify package.json has correct build script
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
if (packageJson.scripts && packageJson.scripts.build) {
  checks.push('✅ build script exists in package.json');
} else {
  checks.push('❌ build script MISSING in package.json');
}

// Check 7: Verify vite.config.js exists
if (fs.existsSync(path.join(__dirname, 'vite.config.js'))) {
  checks.push('✅ vite.config.js exists');
} else {
  checks.push('❌ vite.config.js MISSING');
}

// Display results
console.log('📋 BUILD VERIFICATION RESULTS:\n');
checks.forEach(check => console.log(check));

const failedChecks = checks.filter(check => check.startsWith('❌'));

if (failedChecks.length === 0) {
  console.log('\n🎉 ALL CHECKS PASSED! Frontend is ready for Render deployment.');
  console.log('\n📌 RENDER FRONTEND SERVICE CONFIGURATION:');
  console.log('   Root Directory: frontend');
  console.log('   Build Command: npm install && npm run build');
  console.log('   Publish Directory: dist');
  console.log('\n🚀 Deploy at: https://render.com/');
} else {
  console.log(`\n⚠️  ${failedChecks.length} ISSUES FOUND - Fix these before deploying:`);
  failedChecks.forEach(check => console.log(`   ${check}`));
  
  console.log('\n🔧 QUICK FIXES:');
  console.log('   1. Run: npm run build:production');
  console.log('   2. Verify: npm run verify-build');
  console.log('   3. Test locally: npm run preview');
}

console.log('\n📊 DEPLOYMENT STATUS:', failedChecks.length === 0 ? '🟢 READY' : '🔴 NOT READY');
