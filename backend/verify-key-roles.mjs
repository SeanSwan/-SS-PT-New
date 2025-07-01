#!/usr/bin/env node

/**
 * SwanStudios Key Role Verification Tool
 * =====================================
 * Detects if keys are being used in wrong roles
 * Prevents main-ss key from being used as publishable key
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 SWANSTUDIOS KEY ROLE VERIFICATION');
console.log('====================================');
console.log('Checking if keys are being used in correct roles...\n');

function analyzeKeyRole(key, expectedRole) {
  if (!key) return { valid: false, error: 'Key not found' };
  
  const keyTypes = {
    secret: key.startsWith('sk_live_') || key.startsWith('sk_test_'),
    restricted: key.startsWith('rk_live_') || key.startsWith('rk_test_'),
    publishable: key.startsWith('pk_live_') || key.startsWith('pk_test_')
  };
  
  const actualRole = Object.keys(keyTypes).find(role => keyTypes[role]);
  
  // FIXED: Restricted keys ARE valid secret keys (just with limited permissions)
  const isCorrectRole = actualRole === expectedRole || 
                       (expectedRole === 'secret' && actualRole === 'restricted');
  
  return {
    valid: isCorrectRole,
    actualRole: actualRole === 'restricted' ? 'restricted (enhanced secret)' : actualRole,
    expectedRole,
    keyPrefix: key.substring(0, 25) + '...',
    accountId: extractAccountId(key),
    error: isCorrectRole ? null : `Expected ${expectedRole} key, but got ${actualRole} key`
  };
}

function extractAccountId(key) {
  // Enhanced to handle all key types including restricted keys
  const match = key.match(/[sprk]+_(?:live|test)_([A-Za-z0-9]{16,})/);
  return match ? match[1].substring(0, 16) : null;
}

function readEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match) env[match[1]] = match[2];
    });
    return env;
  } catch (error) {
    return null;
  }
}

function main() {
  // Read environment files
  const backendEnv = readEnvFile(path.resolve(__dirname, '.env'));
  const frontendEnv = readEnvFile(path.resolve(__dirname, '..', 'frontend', '.env'));
  
  if (!backendEnv) {
    console.log('❌ Cannot read backend .env file');
    return;
  }
  
  if (!frontendEnv) {
    console.log('❌ Cannot read frontend .env file');
    return;
  }
  
  console.log('🔐 BACKEND KEY ROLE ANALYSIS:');
  console.log('=============================');
  
  // Analyze backend secret key
  const secretKey = backendEnv.STRIPE_SECRET_KEY;
  const secretAnalysis = analyzeKeyRole(secretKey, 'secret');
  
  if (secretAnalysis.valid) {
    console.log(`✅ Secret Key: Correctly configured as ${secretAnalysis.actualRole}`);
    console.log(`   Account: ${secretAnalysis.accountId}`);
    console.log(`   Prefix: ${secretAnalysis.keyPrefix}`);
  } else {
    console.log(`❌ Secret Key: ${secretAnalysis.error}`);
    console.log(`   Found: ${secretAnalysis.actualRole} (${secretAnalysis.keyPrefix})`);
    console.log(`   Expected: ${secretAnalysis.expectedRole}`);
  }
  
  // Check if backend has publishable key (it shouldn't be the main one used)
  const backendPubKey = backendEnv.VITE_STRIPE_PUBLISHABLE_KEY;
  if (backendPubKey) {
    console.log(`ℹ️  Backend also has publishable key: ${backendPubKey.substring(0, 15)}...`);
  }
  
  console.log('\n🌐 FRONTEND KEY ROLE ANALYSIS:');
  console.log('==============================');
  
  // Analyze frontend publishable key
  const publishableKey = frontendEnv.VITE_STRIPE_PUBLISHABLE_KEY;
  const publishableAnalysis = analyzeKeyRole(publishableKey, 'publishable');
  
  if (publishableAnalysis.valid) {
    console.log(`✅ Publishable Key: Correctly configured as ${publishableAnalysis.actualRole}`);
    console.log(`   Account: ${publishableAnalysis.accountId}`);
    console.log(`   Prefix: ${publishableAnalysis.keyPrefix}`);
  } else {
    console.log(`❌ Publishable Key: ${publishableAnalysis.error}`);
    console.log(`   Found: ${publishableAnalysis.actualRole} (${publishableAnalysis.keyPrefix})`);
    console.log(`   Expected: ${publishableAnalysis.expectedRole}`);
  }
  
  console.log('\n🎯 ACCOUNT MATCHING ANALYSIS:');
  console.log('=============================');
  
  const secretAccount = secretAnalysis.accountId;
  const publishableAccount = publishableAnalysis.accountId;
  
  if (secretAccount && publishableAccount) {
    if (secretAccount === publishableAccount) {
      console.log('✅ ACCOUNT MATCH: Both keys from same Stripe account');
      console.log(`   Shared Account: ${secretAccount}`);
    } else {
      console.log('❌ ACCOUNT MISMATCH: Keys from different Stripe accounts');
      console.log(`   Secret Account: ${secretAccount}`);
      console.log(`   Publishable Account: ${publishableAccount}`);
      console.log('   🚨 This WILL cause 401 Unauthorized errors!');
    }
  } else {
    console.log('❌ Cannot compare accounts - missing key information');
  }
  
  console.log('\n🔍 POTENTIAL ISSUES DETECTED:');
  console.log('=============================');
  
  const issues = [];
  
  // Check for key role mismatches
  if (!secretAnalysis.valid) {
    issues.push(`Secret key role mismatch: ${secretAnalysis.error}`);
  }
  
  if (!publishableAnalysis.valid) {
    issues.push(`Publishable key role mismatch: ${publishableAnalysis.error}`);
  }
  
  // Check for account mismatches
  if (secretAccount && publishableAccount && secretAccount !== publishableAccount) {
    issues.push('Keys from different Stripe accounts');
  }
  
  // Check for main-ss key being used as publishable key
  if (publishableKey && publishableKey.includes('wXIZ')) {
    issues.push('WARNING: main-ss key pattern detected in publishable key position');
  }
  
  if (secretKey && !secretKey.startsWith('sk_') && !secretKey.startsWith('rk_')) {
    issues.push('WARNING: Non-standard secret key format detected');
  }
  
  if (issues.length === 0) {
    console.log('✅ No configuration issues detected');
    console.log('✅ All keys appear to be in correct roles');
    console.log('✅ Account matching validated');
  } else {
    console.log('⚠️  Configuration issues detected:');
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }
  
  console.log('\n🚀 NEXT STEPS:');
  console.log('==============');
  
  if (issues.length === 0) {
    console.log('✅ Configuration looks good - ready to test payment system');
    console.log('✅ Deploy when ready');
  } else {
    console.log('🔧 Fix the detected issues before deployment:');
    
    if (!secretAnalysis.valid || !publishableAnalysis.valid) {
      console.log('   - Ensure secret key starts with sk_live_ or rk_live_');
      console.log('   - Ensure publishable key starts with pk_live_');
    }
    
    if (secretAccount !== publishableAccount) {
      console.log('   - Get both keys from the same Stripe account');
      console.log('   - Update .env files with matching account keys');
    }
    
    console.log('   - Re-run this verification after fixes');
  }
  
  console.log('\n' + '='.repeat(50));
}

main();
