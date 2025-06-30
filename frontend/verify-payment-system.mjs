#!/usr/bin/env node

/**
 * Payment System Verification Script
 * =================================
 * Verifies that Stripe configuration is working after synchronization
 * Following Master Prompt v33 Secrets Management Protocol
 */

import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 PAYMENT SYSTEM VERIFICATION');
console.log('==============================');

// Define paths
const backendEnvPath = path.resolve(__dirname, '..', 'backend', '.env');
const frontendEnvPath = path.resolve(__dirname, '.env');
const frontendEnvProdPath = path.resolve(__dirname, '.env.production');

// SECURE FUNCTION: Extract and validate key without logging value
function validateStripeKey(content, keyName, source) {
  const regex = new RegExp(`${keyName}=(.+)`);
  const match = content.match(regex);
  
  if (!match) {
    return {
      source,
      found: false,
      valid: false,
      issues: [`${keyName} not found in ${source}`]
    };
  }
  
  const key = match[1].trim();
  const issues = [];
  
  // Validate format
  if (!key.startsWith('pk_')) {
    issues.push('Key does not start with pk_');
  }
  
  if (key.length < 50) {
    issues.push(`Key too short (${key.length} characters)`);
  }
  
  if (key.includes(' ')) {
    issues.push('Key contains whitespace');
  }
  
  const environment = key.includes('_live_') ? 'live' : key.includes('_test_') ? 'test' : 'unknown';
  
  return {
    source,
    found: true,
    valid: issues.length === 0,
    environment,
    length: key.length,
    issues,
    keyValue: key // Only used for comparison, never logged
  };
}

console.log('\n📊 ENVIRONMENT FILE VERIFICATION:');
console.log('=================================');

const results = [];

// Check backend
if (existsSync(backendEnvPath)) {
  const backendContent = readFileSync(backendEnvPath, 'utf8');
  const backendResult = validateStripeKey(backendContent, 'VITE_STRIPE_PUBLISHABLE_KEY', 'Backend');
  results.push(backendResult);
  
  console.log(`✅ Backend .env: ${backendResult.found ? 'Found' : 'Missing'}`);
  if (backendResult.found) {
    console.log(`   🔍 Length: ${backendResult.length} characters`);
    console.log(`   🌍 Environment: ${backendResult.environment.toUpperCase()}`);
    console.log(`   ✅ Valid: ${backendResult.valid ? 'Yes' : 'No'}`);
    if (!backendResult.valid) {
      backendResult.issues.forEach(issue => console.log(`     ❌ ${issue}`));
    }
  }
} else {
  console.log('❌ Backend .env: Not found');
  results.push({ source: 'Backend', found: false, valid: false, issues: ['File not found'] });
}

// Check frontend dev
if (existsSync(frontendEnvPath)) {
  const frontendContent = readFileSync(frontendEnvPath, 'utf8');
  const frontendResult = validateStripeKey(frontendContent, 'VITE_STRIPE_PUBLISHABLE_KEY', 'Frontend Dev');
  results.push(frontendResult);
  
  console.log(`✅ Frontend .env: ${frontendResult.found ? 'Found' : 'Missing'}`);
  if (frontendResult.found) {
    console.log(`   🔍 Length: ${frontendResult.length} characters`);
    console.log(`   🌍 Environment: ${frontendResult.environment.toUpperCase()}`);
    console.log(`   ✅ Valid: ${frontendResult.valid ? 'Yes' : 'No'}`);
    if (!frontendResult.valid) {
      frontendResult.issues.forEach(issue => console.log(`     ❌ ${issue}`));
    }
  }
} else {
  console.log('❌ Frontend .env: Not found');
  results.push({ source: 'Frontend Dev', found: false, valid: false, issues: ['File not found'] });
}

// Check frontend prod
if (existsSync(frontendEnvProdPath)) {
  const frontendProdContent = readFileSync(frontendEnvProdPath, 'utf8');
  const frontendProdResult = validateStripeKey(frontendProdContent, 'VITE_STRIPE_PUBLISHABLE_KEY', 'Frontend Prod');
  results.push(frontendProdResult);
  
  console.log(`✅ Frontend .env.production: ${frontendProdResult.found ? 'Found' : 'Missing'}`);
  if (frontendProdResult.found) {
    console.log(`   🔍 Length: ${frontendProdResult.length} characters`);
    console.log(`   🌍 Environment: ${frontendProdResult.environment.toUpperCase()}`);
    console.log(`   ✅ Valid: ${frontendProdResult.valid ? 'Yes' : 'No'}`);
    if (!frontendProdResult.valid) {
      frontendProdResult.issues.forEach(issue => console.log(`     ❌ ${issue}`));
    }
  }
} else {
  console.log('❌ Frontend .env.production: Not found');
  results.push({ source: 'Frontend Prod', found: false, valid: false, issues: ['File not found'] });
}

// Cross-validation
console.log('\n🔗 KEY SYNCHRONIZATION VERIFICATION:');
console.log('===================================');

const validResults = results.filter(r => r.found && r.valid);

if (validResults.length < 2) {
  console.log('❌ Insufficient valid keys found for comparison');
} else {
  // Check if all keys match
  const firstKey = validResults[0].keyValue;
  const allMatch = validResults.every(r => r.keyValue === firstKey);
  
  if (allMatch) {
    console.log('✅ All Stripe keys are synchronized and identical');
    
    // Check environments match
    const environments = validResults.map(r => r.environment);
    const sameEnvironment = environments.every(env => env === environments[0]);
    
    if (sameEnvironment) {
      console.log(`✅ All keys are from the same environment: ${environments[0].toUpperCase()}`);
    } else {
      console.log('⚠️ Keys are from different environments:');
      validResults.forEach(r => console.log(`   ${r.source}: ${r.environment.toUpperCase()}`));
    }
  } else {
    console.log('❌ Keys do not match between files');
    console.log('🔧 Run the sync-stripe-keys.mjs script to fix this');
  }
}

// Overall assessment
console.log('\n🎯 OVERALL ASSESSMENT:');
console.log('=====================');

const allValid = results.every(r => r.found && r.valid);
const backendValid = results.find(r => r.source === 'Backend')?.valid || false;
const frontendDevValid = results.find(r => r.source === 'Frontend Dev')?.valid || false;
const frontendProdValid = results.find(r => r.source === 'Frontend Prod')?.valid || false;

const criticalIssues = [];
const warnings = [];
const recommendations = [];

if (!backendValid) {
  criticalIssues.push('Backend Stripe configuration invalid');
}

if (!frontendDevValid) {
  criticalIssues.push('Frontend development Stripe configuration invalid');
}

if (!frontendProdValid) {
  criticalIssues.push('Frontend production Stripe configuration invalid');
}

if (validResults.length > 1) {
  const firstKey = validResults[0].keyValue;
  const allMatch = validResults.every(r => r.keyValue === firstKey);
  if (!allMatch) {
    criticalIssues.push('Stripe keys are not synchronized between backend and frontend');
  }
}

// Generate recommendations
if (criticalIssues.length > 0) {
  console.log('❌ CRITICAL ISSUES DETECTED:');
  criticalIssues.forEach(issue => console.log(`   ❌ ${issue}`));
  
  recommendations.push('Run sync-stripe-keys.mjs to synchronize keys');
  recommendations.push('Verify keys in your Stripe Dashboard');
  recommendations.push('Check that keys are from the same Stripe account');
} else {
  console.log('✅ Configuration appears to be correct');
  
  recommendations.push('Clear Vite cache and restart dev server');
  recommendations.push('Test payment form functionality');
  recommendations.push('Check browser console for any remaining errors');
}

if (warnings.length > 0) {
  console.log('\n⚠️ WARNINGS:');
  warnings.forEach(warning => console.log(`   ⚠️ ${warning}`));
}

console.log('\n📝 RECOMMENDATIONS:');
console.log('==================');
recommendations.forEach(rec => console.log(`   ✓ ${rec}`));

// Troubleshooting guide
console.log('\n🔧 TROUBLESHOOTING GUIDE:');
console.log('========================');

if (criticalIssues.length > 0) {
  console.log('If you are still experiencing the 401 error:');
  console.log('1. Run: node sync-stripe-keys.mjs');
  console.log('2. Clear Vite cache: rm -rf .vite node_modules/.vite');
  console.log('3. Restart your frontend server: npm run dev');
  console.log('4. Test the payment form again');
  console.log('5. Check browser console for specific error messages');
} else {
  console.log('Configuration looks correct. If still getting 401 errors:');
  console.log('1. Clear browser cache and hard refresh');
  console.log('2. Check Stripe Dashboard for any account issues');
  console.log('3. Verify keys haven\'t been rotated recently');
  console.log('4. Check network connectivity to Stripe API');
}

console.log('\n✅ Verification complete!');

// Exit with appropriate code
process.exit(criticalIssues.length > 0 ? 1 : 0);
