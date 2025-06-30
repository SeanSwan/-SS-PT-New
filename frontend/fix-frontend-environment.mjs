#!/usr/bin/env node

/**
 * Frontend Environment Diagnostic & Cache Cleanup
 * ==============================================
 * Diagnoses and fixes frontend environment variable loading issues
 * Following Master Prompt v33 Secrets Management Protocol
 */

import { existsSync, rmSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧹 FRONTEND ENVIRONMENT & CACHE DIAGNOSTIC');
console.log('==========================================');

// Paths
const frontendRoot = path.resolve(__dirname, '..', 'frontend');
const viteCacheDir = path.resolve(frontendRoot, 'node_modules', '.vite');
const viteDir = path.resolve(frontendRoot, '.vite');
const envDevPath = path.resolve(frontendRoot, '.env');
const envProdPath = path.resolve(frontendRoot, '.env.production');

console.log(`📁 Frontend root: ${frontendRoot}`);
console.log(`📁 Vite cache directories to check:`);
console.log(`   - ${viteCacheDir}`);
console.log(`   - ${viteDir}`);

// Step 1: Check current environment files
console.log('\n🔍 CURRENT ENVIRONMENT FILE STATUS:');
console.log('===================================');

if (existsSync(envDevPath)) {
  const devContent = readFileSync(envDevPath, 'utf8');
  const stripeMatch = devContent.match(/VITE_STRIPE_PUBLISHABLE_KEY=(.+)/);
  
  console.log('✅ .env found');
  if (stripeMatch) {
    const key = stripeMatch[1].trim();
    console.log(`   - VITE_STRIPE_PUBLISHABLE_KEY: Present (${key.length} chars)`);
    console.log(`   - Key format: ${key.startsWith('pk_') ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`   - Environment: ${key.includes('_live_') ? 'LIVE' : 'TEST'}`);
  } else {
    console.log('   - ❌ VITE_STRIPE_PUBLISHABLE_KEY: Not found');
  }
} else {
  console.log('❌ .env file not found');
}

if (existsSync(envProdPath)) {
  const prodContent = readFileSync(envProdPath, 'utf8');
  const stripeMatch = prodContent.match(/VITE_STRIPE_PUBLISHABLE_KEY=(.+)/);
  
  console.log('✅ .env.production found');
  if (stripeMatch) {
    const key = stripeMatch[1].trim();
    console.log(`   - VITE_STRIPE_PUBLISHABLE_KEY: Present (${key.length} chars)`);
    console.log(`   - Key format: ${key.startsWith('pk_') ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`   - Environment: ${key.includes('_live_') ? 'LIVE' : 'TEST'}`);
  } else {
    console.log('   - ❌ VITE_STRIPE_PUBLISHABLE_KEY: Not found');
  }
} else {
  console.log('❌ .env.production file not found');
}

// Step 2: Clear Vite cache
console.log('\n🧹 CLEARING VITE CACHE:');
console.log('======================');

let cacheCleared = false;

if (existsSync(viteCacheDir)) {
  try {
    rmSync(viteCacheDir, { recursive: true, force: true });
    console.log('✅ Cleared node_modules/.vite cache');
    cacheCleared = true;
  } catch (error) {
    console.log(`⚠️ Failed to clear node_modules/.vite: ${error.message}`);
  }
} else {
  console.log('ℹ️ node_modules/.vite does not exist');
}

if (existsSync(viteDir)) {
  try {
    rmSync(viteDir, { recursive: true, force: true });
    console.log('✅ Cleared .vite cache');
    cacheCleared = true;
  } catch (error) {
    console.log(`⚠️ Failed to clear .vite: ${error.message}`);
  }
} else {
  console.log('ℹ️ .vite does not exist');
}

if (!cacheCleared) {
  console.log('ℹ️ No cache to clear - this is normal');
}

// Step 3: Check for potential issues
console.log('\n🔍 POTENTIAL ISSUES ANALYSIS:');
console.log('============================');

const issues = [];
const recommendations = [];

// Check if both dev and prod env files exist
if (!existsSync(envDevPath)) {
  issues.push('Missing .env file for development');
  recommendations.push('Create frontend/.env file with VITE_STRIPE_PUBLISHABLE_KEY');
}

if (!existsSync(envProdPath)) {
  issues.push('Missing .env.production file');
  recommendations.push('Create frontend/.env.production file with VITE_STRIPE_PUBLISHABLE_KEY');
}

// Check for environment loading issues
if (existsSync(envDevPath)) {
  const devContent = readFileSync(envDevPath, 'utf8');
  if (!devContent.includes('VITE_STRIPE_PUBLISHABLE_KEY')) {
    issues.push('VITE_STRIPE_PUBLISHABLE_KEY missing from .env');
    recommendations.push('Add VITE_STRIPE_PUBLISHABLE_KEY to frontend/.env');
  }
}

console.log('\n📊 SUMMARY:');
console.log('==========');

if (issues.length === 0) {
  console.log('✅ No configuration issues detected');
  console.log('🔄 Cache has been cleared - restart your dev server');
  console.log('\n🚀 NEXT STEPS:');
  console.log('1. Stop your frontend dev server (Ctrl+C)');
  console.log('2. Restart with: npm run dev');
  console.log('3. Test the payment form again');
} else {
  console.log('❌ Issues detected:');
  issues.forEach(issue => console.log(`   - ${issue}`));
  
  console.log('\n📝 RECOMMENDATIONS:');
  recommendations.forEach(rec => console.log(`   ✓ ${rec}`));
}

console.log('\n✅ Diagnostic complete!');
