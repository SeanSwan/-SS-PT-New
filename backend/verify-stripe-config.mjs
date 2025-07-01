#!/usr/bin/env node

/**
 * SwanStudios Payment System Verification Tool
 * ============================================
 * Validates Stripe configuration before deployment
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 SWANSTUDIOS PAYMENT VERIFICATION');
console.log('===================================');

function extractAccountId(key) {
  const match = key.match(/p[kr]_(?:live|test)_([A-Za-z0-9]{16,})/);
  return match ? match[1].substring(0, 16) : null;
}

function readEnvFile(filePath, name) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const env = {};
    
    lines.forEach(line => {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match) {
        env[match[1]] = match[2];
      }
    });
    
    return { success: true, env, name };
  } catch (error) {
    return { success: false, error: error.message, name };
  }
}

function main() {
  console.log('📋 CHECKING ENVIRONMENT FILES...\n');
  
  // Read environment files
  const backendEnv = readEnvFile(path.resolve(__dirname, '.env'), 'Backend .env');
  const frontendEnv = readEnvFile(path.resolve(__dirname, '..', 'frontend', '.env'), 'Frontend .env');
  const frontendProdEnv = readEnvFile(path.resolve(__dirname, '..', 'frontend', '.env.production'), 'Frontend .env.production');
  
  // Validate backend configuration
  console.log('🔐 BACKEND CONFIGURATION:');
  if (backendEnv.success) {
    const secretKey = backendEnv.env.STRIPE_SECRET_KEY;
    const backendPubKey = backendEnv.env.VITE_STRIPE_PUBLISHABLE_KEY;
    
    if (secretKey) {
      const secretAccount = extractAccountId(secretKey);
      const keyType = secretKey.startsWith('rk_live_') ? 'RESTRICTED LIVE' : 
                     secretKey.startsWith('sk_live_') ? 'SECRET LIVE' :
                     secretKey.startsWith('rk_test_') ? 'RESTRICTED TEST' :
                     secretKey.startsWith('sk_test_') ? 'SECRET TEST' : 'UNKNOWN';
      
      console.log(`  ✅ Secret Key: ${keyType} (Account: ${secretAccount})`);
    } else {
      console.log('  ❌ Secret Key: NOT FOUND');
    }
    
    if (backendPubKey) {
      const pubAccount = extractAccountId(backendPubKey);
      console.log(`  ✅ Publishable Key: (Account: ${pubAccount})`);
    } else {
      console.log('  ❌ Publishable Key: NOT FOUND');
    }
  } else {
    console.log('  ❌ Backend .env file not found or unreadable');
  }
  
  console.log('\n🌐 FRONTEND CONFIGURATION:');
  
  // Validate frontend dev configuration
  if (frontendEnv.success) {
    const frontendPubKey = frontendEnv.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (frontendPubKey) {
      const pubAccount = extractAccountId(frontendPubKey);
      console.log(`  ✅ Development Publishable Key: (Account: ${pubAccount})`);
    } else {
      console.log('  ❌ Development Publishable Key: NOT FOUND');
    }
  } else {
    console.log('  ❌ Frontend .env file not found or unreadable');
  }
  
  // Validate frontend production configuration  
  if (frontendProdEnv.success) {
    const frontendProdPubKey = frontendProdEnv.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (frontendProdPubKey) {
      const pubAccount = extractAccountId(frontendProdPubKey);
      console.log(`  ✅ Production Publishable Key: (Account: ${pubAccount})`);
    } else {
      console.log('  ❌ Production Publishable Key: NOT FOUND');
    }
  } else {
    console.log('  ❌ Frontend .env.production file not found or unreadable');
  }
  
  // Account matching validation
  console.log('\n🎯 ACCOUNT MATCHING VALIDATION:');
  
  const backendSecretAccount = backendEnv.success ? extractAccountId(backendEnv.env.STRIPE_SECRET_KEY) : null;
  const backendPubAccount = backendEnv.success ? extractAccountId(backendEnv.env.VITE_STRIPE_PUBLISHABLE_KEY) : null;
  const frontendDevAccount = frontendEnv.success ? extractAccountId(frontendEnv.env.VITE_STRIPE_PUBLISHABLE_KEY) : null;
  const frontendProdAccount = frontendProdEnv.success ? extractAccountId(frontendProdEnv.env.VITE_STRIPE_PUBLISHABLE_KEY) : null;
  
  const allAccounts = [backendSecretAccount, backendPubAccount, frontendDevAccount, frontendProdAccount].filter(Boolean);
  const uniqueAccounts = [...new Set(allAccounts)];
  
  if (uniqueAccounts.length === 1) {
    console.log(`  ✅ ALL KEYS MATCH: Account ${uniqueAccounts[0]}`);
    console.log('  ✅ No 401 authentication errors expected');
  } else if (uniqueAccounts.length > 1) {
    console.log('  ❌ ACCOUNT MISMATCH DETECTED:');
    uniqueAccounts.forEach((account, index) => {
      console.log(`    Account ${index + 1}: ${account}`);
    });
    console.log('  🚨 This WILL cause 401 Unauthorized errors!');
  } else {
    console.log('  ❌ Could not extract account information');
  }
  
  // Environment-specific validation
  console.log('\n🌍 ENVIRONMENT VALIDATION:');
  
  if (backendEnv.success && frontendEnv.success) {
    const backendSecret = backendEnv.env.STRIPE_SECRET_KEY;
    const frontendPub = frontendEnv.env.VITE_STRIPE_PUBLISHABLE_KEY;
    
    const backendIsLive = backendSecret?.includes('live');
    const frontendIsLive = frontendPub?.includes('live');
    
    if (backendIsLive && frontendIsLive) {
      console.log('  ✅ PRODUCTION ENVIRONMENT: Both keys are LIVE');
    } else if (!backendIsLive && !frontendIsLive) {
      console.log('  ✅ TEST ENVIRONMENT: Both keys are TEST');
    } else {
      console.log('  ❌ MIXED ENVIRONMENT: Backend and frontend using different environments');
    }
  }
  
  console.log('\n🚀 DEPLOYMENT READINESS:');
  
  if (uniqueAccounts.length === 1 && allAccounts.length >= 3) {
    console.log('  ✅ READY FOR DEPLOYMENT');
    console.log('  ✅ All Stripe keys properly configured');
    console.log('  ✅ Account matching validated');
    console.log('\n📦 DEPLOYMENT COMMAND:');
    console.log('git add . && git commit -m "fix: sync Stripe keys from same account - resolves 401 authentication errors" && git push origin main');
  } else {
    console.log('  ❌ NOT READY FOR DEPLOYMENT');
    console.log('  🔧 Fix key mismatches before deploying');
  }
  
  console.log('\n' + '='.repeat(50));
}

main();
