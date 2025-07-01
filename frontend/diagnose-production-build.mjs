#!/usr/bin/env node

/**
 * Frontend Production Build Diagnostic
 * ===================================
 * Checks what Stripe key is actually in the production build
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 FRONTEND PRODUCTION BUILD DIAGNOSTIC');
console.log('======================================');

// Check current environment files
console.log('\n📋 CURRENT ENVIRONMENT FILES:');
console.log('=============================');

const envFiles = [
  path.join(__dirname, '.env'),
  path.join(__dirname, '.env.production'),
  path.join(__dirname, '.env.local')
];

envFiles.forEach(filePath => {
  const fileName = path.basename(filePath);
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf8');
    const match = content.match(/VITE_STRIPE_PUBLISHABLE_KEY=(.+)/);
    
    console.log(`✅ ${fileName}:`);
    if (match) {
      const key = match[1].trim();
      console.log(`   🔑 Key Length: ${key.length} characters`);
      console.log(`   🔑 Key Prefix: ${key.substring(0, 15)}...`);
      console.log(`   🌍 Environment: ${key.includes('_live_') ? 'LIVE' : 'TEST'}`);
    } else {
      console.log(`   ❌ VITE_STRIPE_PUBLISHABLE_KEY not found`);
    }
  } else {
    console.log(`❌ ${fileName}: Not found`);
  }
});

// Check if there's a built dist folder
console.log('\n📦 PRODUCTION BUILD CHECK:');
console.log('=========================');

const distPath = path.join(__dirname, 'dist');
if (existsSync(distPath)) {
  console.log('✅ dist/ folder exists');
  
  // Try to find built JS files that might contain the key
  const { execSync } = await import('child_process');
  try {
    const result = execSync('find dist -name "*.js" -exec grep -l "pk_" {} \\; 2>/dev/null || echo "No files found"', {
      cwd: __dirname,
      encoding: 'utf8'
    });
    
    if (result.trim() === 'No files found') {
      console.log('⚠️ No built JS files contain Stripe keys');
      console.log('This suggests the environment variable is not being included in the build');
    } else {
      console.log('🔍 Files containing potential Stripe keys:');
      console.log(result.trim());
    }
  } catch (error) {
    console.log('⚠️ Could not search built files (Windows/permission issue)');
  }
} else {
  console.log('❌ dist/ folder not found - run npm run build first');
}

// Environment variable inspection
console.log('\n🌍 RUNTIME ENVIRONMENT CHECK:');
console.log('=============================');

// Simulate what Vite sees
process.env.NODE_ENV = 'production';

// Load environment files in the order Vite would
const dotenv = await import('dotenv');

// Load .env.production if it exists
const envProdPath = path.join(__dirname, '.env.production');
if (existsSync(envProdPath)) {
  dotenv.config({ path: envProdPath });
  console.log('✅ Loaded .env.production');
}

// Load .env if it exists (will override .env.production)
const envPath = path.join(__dirname, '.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ Loaded .env');
}

const runtimeKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
if (runtimeKey) {
  console.log(`🔑 Runtime Key Length: ${runtimeKey.length} characters`);
  console.log(`🔑 Runtime Key Prefix: ${runtimeKey.substring(0, 15)}...`);
  console.log(`🌍 Runtime Environment: ${runtimeKey.includes('_live_') ? 'LIVE' : 'TEST'}`);
} else {
  console.log('❌ VITE_STRIPE_PUBLISHABLE_KEY not available at runtime');
}

console.log('\n🎯 LIKELY ISSUES:');
console.log('================');

if (!runtimeKey) {
  console.log('❌ CRITICAL: Stripe key not loading in build environment');
  console.log('Solutions:');
  console.log('1. Ensure VITE_STRIPE_PUBLISHABLE_KEY is in .env.production');
  console.log('2. Check Render environment variables');
  console.log('3. Verify Vite build process includes environment variables');
} else {
  console.log('⚠️ Key is loading correctly in build environment');
  console.log('The 401 error is likely due to:');
  console.log('1. Stripe account issues (suspended, incomplete setup)');
  console.log('2. Publishable key revoked or invalid');
  console.log('3. Mismatch between secret and publishable key accounts');
  console.log('4. Render deployment using different environment variables');
}

console.log('\n🔧 NEXT STEPS:');
console.log('==============');
console.log('1. Run the backend diagnostic: node backend/diagnose-production-stripe.mjs');
console.log('2. Check your Stripe Dashboard for account status');
console.log('3. Verify Render environment variables match local ones');
console.log('4. Consider regenerating Stripe keys if account is in good standing');
