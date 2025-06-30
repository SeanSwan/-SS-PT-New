#!/usr/bin/env node

/**
 * Stripe 401 Error Diagnostic Script
 * =================================
 * Identifies the exact cause of the Stripe 401 Unauthorized error
 * Following Master Prompt v33 Secrets Management Protocol
 */

import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables exactly like the server does
const projectRootDir = path.resolve(__dirname, '..');
const envPath = path.resolve(projectRootDir, '.env');

console.log('🔍 STRIPE 401 ERROR DIAGNOSTIC');
console.log('==============================');
console.log(`📁 Backend env path: ${envPath}`);

if (existsSync(envPath)) {
  console.log('✅ Backend .env file found, loading...');
  dotenv.config({ path: envPath });
} else {
  console.log('❌ Backend .env file not found!');
  process.exit(1);
}

console.log('\n🔧 BACKEND STRIPE CONFIGURATION:');
console.log('================================');

const backendSecret = process.env.STRIPE_SECRET_KEY;
const backendPublishable = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
const backendWebhook = process.env.STRIPE_WEBHOOK_SECRET;

// SAFE LOGGING - Only show format and length, never actual values
console.log(`📊 Backend Environment Analysis:`);
console.log(`   - STRIPE_SECRET_KEY: ${backendSecret ? '✅ Present' : '❌ Missing'}`);
if (backendSecret) {
  console.log(`     * Length: ${backendSecret.length} characters`);
  console.log(`     * Format: ${backendSecret.startsWith('sk_') ? '✅ Valid (sk_...)' : '❌ Invalid format'}`);
  console.log(`     * Environment: ${backendSecret.includes('_live_') ? 'LIVE' : backendSecret.includes('_test_') ? 'TEST' : 'UNKNOWN'}`);
  console.log(`     * Has whitespace: ${backendSecret.trim() !== backendSecret ? '⚠️ YES' : '✅ NO'}`);
}

console.log(`   - VITE_STRIPE_PUBLISHABLE_KEY: ${backendPublishable ? '✅ Present' : '❌ Missing'}`);
if (backendPublishable) {
  console.log(`     * Length: ${backendPublishable.length} characters`);
  console.log(`     * Format: ${backendPublishable.startsWith('pk_') ? '✅ Valid (pk_...)' : '❌ Invalid format'}`);
  console.log(`     * Environment: ${backendPublishable.includes('_live_') ? 'LIVE' : backendPublishable.includes('_test_') ? 'TEST' : 'UNKNOWN'}`);
  console.log(`     * Has whitespace: ${backendPublishable.trim() !== backendPublishable ? '⚠️ YES' : '✅ NO'}`);
}

console.log(`   - STRIPE_WEBHOOK_SECRET: ${backendWebhook ? '✅ Present' : '❌ Missing'}`);

// Check frontend environment files
console.log('\n🌐 FRONTEND STRIPE CONFIGURATION:');
console.log('=================================');

const frontendDevEnvPath = path.resolve(__dirname, '..', 'frontend', '.env');
const frontendProdEnvPath = path.resolve(__dirname, '..', 'frontend', '.env.production');

console.log(`📁 Frontend dev env path: ${frontendDevEnvPath}`);
console.log(`📁 Frontend prod env path: ${frontendProdEnvPath}`);

// Check dev environment
if (existsSync(frontendDevEnvPath)) {
  console.log('\n📊 Frontend Development Environment:');
  console.log('===================================');
  
  // Read file content manually to check for the key
  const fs = await import('fs');
  const frontendDevContent = fs.readFileSync(frontendDevEnvPath, 'utf8');
  
  const frontendDevMatch = frontendDevContent.match(/VITE_STRIPE_PUBLISHABLE_KEY=(.+)/);
  if (frontendDevMatch) {
    const frontendDevKey = frontendDevMatch[1].trim();
    console.log(`   - VITE_STRIPE_PUBLISHABLE_KEY: ✅ Found in .env`);
    console.log(`     * Length: ${frontendDevKey.length} characters`);
    console.log(`     * Format: ${frontendDevKey.startsWith('pk_') ? '✅ Valid (pk_...)' : '❌ Invalid format'}`);
    console.log(`     * Environment: ${frontendDevKey.includes('_live_') ? 'LIVE' : frontendDevKey.includes('_test_') ? 'TEST' : 'UNKNOWN'}`);
    
    // Compare with backend
    if (backendPublishable && frontendDevKey === backendPublishable) {
      console.log(`     * Matches backend: ✅ IDENTICAL`);
    } else {
      console.log(`     * Matches backend: ❌ DIFFERENT`);
      console.log(`       Backend length: ${backendPublishable?.length || 0}, Frontend length: ${frontendDevKey.length}`);
    }
  } else {
    console.log(`   - VITE_STRIPE_PUBLISHABLE_KEY: ❌ Not found in .env`);
  }
} else {
  console.log('❌ Frontend .env file not found!');
}

// Check production environment
if (existsSync(frontendProdEnvPath)) {
  console.log('\n📊 Frontend Production Environment:');
  console.log('===================================');
  
  const fs = await import('fs');
  const frontendProdContent = fs.readFileSync(frontendProdEnvPath, 'utf8');
  
  const frontendProdMatch = frontendProdContent.match(/VITE_STRIPE_PUBLISHABLE_KEY=(.+)/);
  if (frontendProdMatch) {
    const frontendProdKey = frontendProdMatch[1].trim();
    console.log(`   - VITE_STRIPE_PUBLISHABLE_KEY: ✅ Found in .env.production`);
    console.log(`     * Length: ${frontendProdKey.length} characters`);
    console.log(`     * Format: ${frontendProdKey.startsWith('pk_') ? '✅ Valid (pk_...)' : '❌ Invalid format'}`);
    console.log(`     * Environment: ${frontendProdKey.includes('_live_') ? 'LIVE' : frontendProdKey.includes('_test_') ? 'TEST' : 'UNKNOWN'}`);
    
    // Compare with backend
    if (backendPublishable && frontendProdKey === backendPublishable) {
      console.log(`     * Matches backend: ✅ IDENTICAL`);
    } else {
      console.log(`     * Matches backend: ❌ DIFFERENT`);
      console.log(`       Backend length: ${backendPublishable?.length || 0}, Frontend length: ${frontendProdKey.length}`);
    }
  } else {
    console.log(`   - VITE_STRIPE_PUBLISHABLE_KEY: ❌ Not found in .env.production`);
  }
} else {
  console.log('❌ Frontend .env.production file not found!');
}

// Extract account information safely
console.log('\n🔗 ACCOUNT MATCHING ANALYSIS:');
console.log('=============================');

if (backendSecret && backendPublishable) {
  const secretAccountMatch = backendSecret.match(/sk_(live|test)_([A-Za-z0-9]+)/);
  const publishableAccountMatch = backendPublishable.match(/pk_(live|test)_([A-Za-z0-9]+)/);
  
  if (secretAccountMatch && publishableAccountMatch) {
    const secretEnv = secretAccountMatch[1];
    const secretAccount = secretAccountMatch[2];
    const publishableEnv = publishableAccountMatch[1];
    const publishableAccount = publishableAccountMatch[2];
    
    console.log(`📊 Account Analysis:`);
    console.log(`   - Secret key environment: ${secretEnv}`);
    console.log(`   - Publishable key environment: ${publishableEnv}`);
    console.log(`   - Environments match: ${secretEnv === publishableEnv ? '✅ YES' : '❌ NO'}`);
    console.log(`   - Accounts match: ${secretAccount === publishableAccount ? '✅ YES' : '❌ NO'}`);
    
    if (secretEnv !== publishableEnv || secretAccount !== publishableAccount) {
      console.log(`\n🚨 KEY MISMATCH DETECTED!`);
      console.log(`🔧 This is likely the cause of your 401 error.`);
    } else {
      console.log(`\n✅ Keys are from the same Stripe account and environment.`);
      console.log(`🤔 The 401 error might be caused by a different issue.`);
    }
  }
}

// Test Stripe key validity (basic format only)
console.log('\n🧪 STRIPE KEY VALIDITY TEST:');
console.log('============================');

try {
  // Import Stripe (if available)
  const Stripe = await import('stripe');
  
  if (backendSecret) {
    console.log('🔧 Testing Stripe client initialization...');
    try {
      const stripe = new Stripe.default(backendSecret, {
        apiVersion: '2023-10-16'
      });
      console.log('✅ Stripe client created successfully');
      
      // Test a simple API call (retrieve account info)
      console.log('🔧 Testing basic API call...');
      const account = await stripe.accounts.retrieve();
      console.log(`✅ API call successful - Account type: ${account.type || 'unknown'}`);
      console.log(`   Business name: ${account.business_profile?.name || 'Not set'}`);
      console.log(`   Country: ${account.country || 'Unknown'}`);
      
    } catch (stripeError) {
      console.log(`❌ Stripe API error: ${stripeError.message}`);
      if (stripeError.type === 'StripeAuthenticationError') {
        console.log(`🚨 AUTHENTICATION ERROR: Your secret key is invalid or has been revoked!`);
      }
    }
  } else {
    console.log('❌ Cannot test - no secret key available');
  }
} catch (importError) {
  console.log(`⚠️ Could not test Stripe API: ${importError.message}`);
}

console.log('\n🎯 DIAGNOSTIC SUMMARY:');
console.log('======================');

let issues = [];
let recommendations = [];

if (!backendSecret) {
  issues.push('Backend missing STRIPE_SECRET_KEY');
  recommendations.push('Add STRIPE_SECRET_KEY to backend/.env');
}

if (!backendPublishable) {
  issues.push('Backend missing VITE_STRIPE_PUBLISHABLE_KEY');
  recommendations.push('Add VITE_STRIPE_PUBLISHABLE_KEY to backend/.env');
}

if (backendSecret && backendPublishable) {
  const secretEnv = backendSecret.includes('_live_') ? 'live' : 'test';
  const publishableEnv = backendPublishable.includes('_live_') ? 'live' : 'test';
  
  if (secretEnv !== publishableEnv) {
    issues.push('Secret key and publishable key from different environments');
    recommendations.push('Ensure both keys are from the same Stripe account (live or test)');
  }
}

if (issues.length === 0) {
  console.log('✅ No critical configuration issues detected in backend');
  console.log('🤔 The 401 error may be caused by:');
  console.log('   1. Frontend not loading environment variables correctly');
  console.log('   2. Vite build/cache issues');
  console.log('   3. Runtime key loading problems');
  console.log('   4. Stripe account changes (keys revoked/regenerated)');
  
  recommendations.push('Clear Vite cache: rm -rf frontend/.vite');
  recommendations.push('Restart frontend dev server');
  recommendations.push('Check browser console for key loading errors');
  recommendations.push('Verify keys in Stripe Dashboard');
} else {
  console.log('❌ Configuration issues found:');
  issues.forEach(issue => console.log(`   - ${issue}`));
}

if (recommendations.length > 0) {
  console.log('\n📝 RECOMMENDATIONS:');
  console.log('==================');
  recommendations.forEach(rec => console.log(`   ✓ ${rec}`));
}

console.log('\n✅ Diagnostic complete! Check the analysis above to identify the issue.');
