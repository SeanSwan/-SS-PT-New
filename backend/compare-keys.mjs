#!/usr/bin/env node

/**
 * Frontend/Backend Key Comparison Tool
 * ===================================
 * Safely compares Stripe keys between frontend and backend
 * WITHOUT exposing any secret information
 */

import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from both locations
const projectRootDir = path.resolve(__dirname, '..');
const backendEnvPath = path.resolve(projectRootDir, 'backend', '.env');
const frontendEnvPath = path.resolve(projectRootDir, 'frontend', '.env');
const projectRootEnvPath = path.resolve(projectRootDir, '.env');

console.log('🔍 FRONTEND/BACKEND KEY COMPARISON');
console.log('==================================');
console.log(`Project root: ${projectRootDir}`);
console.log(`Backend .env: ${backendEnvPath} (exists: ${existsSync(backendEnvPath)})`);
console.log(`Frontend .env: ${frontendEnvPath} (exists: ${existsSync(frontendEnvPath)})`);
console.log(`Project root .env: ${projectRootEnvPath} (exists: ${existsSync(projectRootEnvPath)})`);

// Function to safely extract key info without exposing secrets
function extractKeyInfo(key, keyName) {
  if (!key) {
    return { 
      name: keyName,
      exists: false, 
      error: 'Key not found' 
    };
  }
  
  const match = key.match(/(sk|pk)_(live|test)_([^_]+)/);
  if (!match) {
    return { 
      name: keyName,
      exists: true,
      error: 'Invalid key format',
      length: key.length
    };
  }
  
  const [, type, env, accountId] = match;
  
  return {
    name: keyName,
    exists: true,
    type,
    environment: env,
    accountId,
    length: key.length,
    prefix: key.substring(0, 15) + '...',
    suffix: '...' + key.substring(key.length - 8),
    isValid: true
  };
}

// Load backend environment
let backendKeys = {};
if (existsSync(projectRootEnvPath)) {
  console.log('\n📁 Loading backend environment from PROJECT ROOT...');
  dotenv.config({ path: projectRootEnvPath });
  backendKeys = {
    secret: process.env.STRIPE_SECRET_KEY,
    webhook: process.env.STRIPE_WEBHOOK_SECRET,
    publishable: process.env.VITE_STRIPE_PUBLISHABLE_KEY
  };
} else if (existsSync(backendEnvPath)) {
  console.log('\n📁 Loading backend environment from BACKEND folder...');
  dotenv.config({ path: backendEnvPath });
  backendKeys = {
    secret: process.env.STRIPE_SECRET_KEY,
    webhook: process.env.STRIPE_WEBHOOK_SECRET,
    publishable: process.env.VITE_STRIPE_PUBLISHABLE_KEY
  };
} else {
  console.log('❌ No backend .env file found!');
}

// Load frontend environment (clear process.env first to avoid contamination)
let frontendKeys = {};
if (existsSync(frontendEnvPath)) {
  console.log('📁 Loading frontend environment...');
  // Create a fresh environment for frontend
  const originalEnv = { ...process.env };
  
  // Clear Stripe keys from process.env
  delete process.env.VITE_STRIPE_PUBLISHABLE_KEY;
  
  // Load frontend .env
  dotenv.config({ path: frontendEnvPath });
  frontendKeys = {
    publishable: process.env.VITE_STRIPE_PUBLISHABLE_KEY
  };
  
  // Restore original environment
  process.env = originalEnv;
} else {
  console.log('❌ No frontend .env file found!');
}

// Analyze keys
console.log('\n🔑 BACKEND KEYS ANALYSIS:');
console.log('========================');

const backendSecretInfo = extractKeyInfo(backendKeys.secret, 'STRIPE_SECRET_KEY');
const backendWebhookInfo = extractKeyInfo(backendKeys.webhook, 'STRIPE_WEBHOOK_SECRET');
const backendPublishableInfo = extractKeyInfo(backendKeys.publishable, 'VITE_STRIPE_PUBLISHABLE_KEY');

[backendSecretInfo, backendWebhookInfo, backendPublishableInfo].forEach(info => {
  if (info.exists && info.isValid) {
    console.log(`✅ ${info.name}:`);
    console.log(`   Environment: ${info.environment}`);
    console.log(`   Account: ${info.accountId}`);
    console.log(`   Length: ${info.length}`);
    console.log(`   Format: ${info.prefix}${info.suffix}`);
  } else {
    console.log(`❌ ${info.name}: ${info.error || 'Missing'}`);
  }
});

console.log('\n🌐 FRONTEND KEYS ANALYSIS:');
console.log('=========================');

// Read frontend .env file directly to avoid env contamination
let frontendPublishableKey = null;
if (existsSync(frontendEnvPath)) {
  try {
    const fs = await import('fs');
    const frontendEnvContent = fs.readFileSync(frontendEnvPath, 'utf8');
    const publishableMatch = frontendEnvContent.match(/VITE_STRIPE_PUBLISHABLE_KEY=(.+)/);
    if (publishableMatch) {
      frontendPublishableKey = publishableMatch[1].trim();
    }
  } catch (error) {
    console.log('❌ Error reading frontend .env file:', error.message);
  }
}

const frontendPublishableInfo = extractKeyInfo(frontendPublishableKey, 'VITE_STRIPE_PUBLISHABLE_KEY (Frontend)');

if (frontendPublishableInfo.exists && frontendPublishableInfo.isValid) {
  console.log(`✅ ${frontendPublishableInfo.name}:`);
  console.log(`   Environment: ${frontendPublishableInfo.environment}`);
  console.log(`   Account: ${frontendPublishableInfo.accountId}`);
  console.log(`   Length: ${frontendPublishableInfo.length}`);
  console.log(`   Format: ${frontendPublishableInfo.prefix}${frontendPublishableInfo.suffix}`);
} else {
  console.log(`❌ ${frontendPublishableInfo.name}: ${frontendPublishableInfo.error || 'Missing'}`);
}

// Compare keys
console.log('\n🔗 KEY COMPARISON RESULTS:');
console.log('=========================');

// Check if backend and frontend publishable keys match
if (backendPublishableInfo.isValid && frontendPublishableInfo.isValid) {
  const publishableKeysMatch = backendKeys.publishable === frontendPublishableKey;
  
  console.log(`\n📋 Publishable Key Comparison:`);
  console.log(`   Backend source: ${backendPublishableInfo.accountId} (${backendPublishableInfo.environment})`);
  console.log(`   Frontend source: ${frontendPublishableInfo.accountId} (${frontendPublishableInfo.environment})`);
  console.log(`   Keys identical: ${publishableKeysMatch ? '✅ YES' : '❌ NO'}`);
  
  if (!publishableKeysMatch) {
    console.log('\n🚨 MISMATCH DETECTED!');
    console.log('   Backend and frontend are using DIFFERENT publishable keys!');
    console.log('   This will cause payment authentication failures.');
    
    console.log('\n📝 TO FIX:');
    console.log('   1. Decide which key is correct (usually the one in backend/.env)');
    console.log('   2. Copy the correct key to both files');
    console.log('   3. Ensure both frontend and backend use the same publishable key');
  }
} else {
  console.log('❌ Cannot compare - one or both publishable keys are missing/invalid');
}

// Check backend key consistency
if (backendSecretInfo.isValid && backendPublishableInfo.isValid) {
  const backendKeysMatch = backendSecretInfo.accountId === backendPublishableInfo.accountId;
  const backendEnvsMatch = backendSecretInfo.environment === backendPublishableInfo.environment;
  
  console.log(`\n📋 Backend Key Consistency:`);
  console.log(`   Secret/Publishable accounts match: ${backendKeysMatch ? '✅ YES' : '❌ NO'}`);
  console.log(`   Secret/Publishable environments match: ${backendEnvsMatch ? '✅ YES' : '❌ NO'}`);
  
  if (!backendKeysMatch || !backendEnvsMatch) {
    console.log('\n🚨 BACKEND KEY MISMATCH!');
    console.log('   Your backend secret key and publishable key are from different accounts/environments!');
    
    if (!backendKeysMatch) {
      console.log(`   Secret account: ${backendSecretInfo.accountId}`);
      console.log(`   Publishable account: ${backendPublishableInfo.accountId}`);
    }
    
    if (!backendEnvsMatch) {
      console.log(`   Secret environment: ${backendSecretInfo.environment}`);
      console.log(`   Publishable environment: ${backendPublishableInfo.environment}`);
    }
  }
}

// Final recommendation
console.log('\n🎯 RECOMMENDATION:');
console.log('==================');

if (backendSecretInfo.isValid && backendPublishableInfo.isValid && frontendPublishableInfo.isValid) {
  const allAccountsMatch = backendSecretInfo.accountId === backendPublishableInfo.accountId && 
                          backendPublishableInfo.accountId === frontendPublishableInfo.accountId;
  const allEnvsMatch = backendSecretInfo.environment === backendPublishableInfo.environment && 
                      backendPublishableInfo.environment === frontendPublishableInfo.environment;
  const keysIdentical = backendKeys.publishable === frontendPublishableKey;
  
  if (allAccountsMatch && allEnvsMatch && keysIdentical) {
    console.log('🎉 ✅ PERFECT! All keys are consistent and from the same Stripe account.');
    console.log(`   Account: ${backendSecretInfo.accountId}`);
    console.log(`   Environment: ${backendSecretInfo.environment.toUpperCase()}`);
    console.log('   Your payment system should work correctly!');
  } else {
    console.log('❌ Issues found that need to be resolved:');
    
    if (!allAccountsMatch) {
      console.log('   • Keys are from different Stripe accounts');
    }
    if (!allEnvsMatch) {
      console.log('   • Keys are from different environments (live vs test)');
    }
    if (!keysIdentical) {
      console.log('   • Frontend and backend are using different publishable keys');
    }
    
    console.log('\n   Fix by ensuring ALL keys come from the same Stripe account and environment.');
  }
} else {
  console.log('❌ Cannot fully analyze - some keys are missing or invalid.');
}

console.log('\n✅ Analysis complete!');