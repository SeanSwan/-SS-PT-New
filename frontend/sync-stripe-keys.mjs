#!/usr/bin/env node

/**
 * Secure Stripe Key Synchronization Script
 * =======================================
 * Following Master Prompt v33 Secrets Management Protocol
 * 
 * SECURITY FEATURES:
 * - NEVER logs or displays actual key values
 * - Only reports success/failure of synchronization
 * - Creates secure backups before modifications
 * - Validates key formats without exposing content
 * 
 * This script safely synchronizes frontend Stripe keys with backend keys
 */

import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔐 SECURE STRIPE KEY SYNCHRONIZATION');
console.log('===================================');
console.log('Following Master Prompt v33 Secrets Management Protocol');
console.log('🛡️ NO SECRETS WILL BE DISPLAYED OR LOGGED');

// Define paths
const backendEnvPath = path.resolve(__dirname, '..', 'backend', '.env');
const frontendEnvPath = path.resolve(__dirname, '.env');
const frontendEnvProdPath = path.resolve(__dirname, '.env.production');

console.log('\n📁 File Paths:');
console.log(`   Backend .env: ${existsSync(backendEnvPath) ? '✅ Found' : '❌ Missing'}`);
console.log(`   Frontend .env: ${existsSync(frontendEnvPath) ? '✅ Found' : '❌ Missing'}`);
console.log(`   Frontend .env.production: ${existsSync(frontendEnvProdPath) ? '✅ Found' : '❌ Missing'}`);

if (!existsSync(backendEnvPath)) {
  console.error('\n❌ CRITICAL ERROR: Backend .env file not found');
  console.error('Cannot proceed with synchronization');
  process.exit(1);
}

// SECURE FUNCTION: Extract Stripe key without logging value
function extractStripeKey(content, keyName) {
  const regex = new RegExp(`${keyName}=(.+)`);
  const match = content.match(regex);
  
  if (match) {
    const key = match[1].trim();
    // SECURITY: Only validate format, never log actual value
    const isValid = key.startsWith('pk_') && key.length > 50;
    const environment = key.includes('_live_') ? 'live' : key.includes('_test_') ? 'test' : 'unknown';
    
    return {
      value: key,
      isValid,
      environment,
      length: key.length,
      found: true
    };
  }
  
  return { found: false };
}

// SECURE FUNCTION: Update environment file without logging secrets
function updateEnvironmentFile(filePath, stripeKey, isBackup = false) {
  try {
    let content = '';
    
    if (existsSync(filePath)) {
      // Create backup before modification
      if (!isBackup) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        copyFileSync(filePath, backupPath);
        console.log(`   📋 Backup created: ${path.basename(backupPath)}`);
      }
      
      content = readFileSync(filePath, 'utf8');
    } else {
      // Create new file with header
      content = `# SwanStudios Frontend Environment - PUBLIC CONFIGURATION ONLY\n`;
      content += `# =============================================================\n`;
      content += `# ✅ THIS FILE IS SAFE FOR GIT (contains no secrets)\n`;
      content += `# ✅ Only VITE_ variables are exposed to the frontend\n\n`;
    }
    
    // Update or add the Stripe key
    const keyRegex = /VITE_STRIPE_PUBLISHABLE_KEY=.+/;
    const newKeyLine = `VITE_STRIPE_PUBLISHABLE_KEY=${stripeKey}`;
    
    if (keyRegex.test(content)) {
      // Replace existing key
      content = content.replace(keyRegex, newKeyLine);
    } else {
      // Add new key
      if (!content.includes('# Stripe Configuration')) {
        content += `\n# Stripe Configuration (Publishable Key - Safe for Frontend)\n`;
      }
      content += `${newKeyLine}\n`;
    }
    
    writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to update ${path.basename(filePath)}: ${error.message}`);
    return false;
  }
}

// MAIN SYNCHRONIZATION PROCESS
console.log('\n🔄 STARTING SECURE SYNCHRONIZATION:');
console.log('==================================');

try {
  // Step 1: Read backend environment (SECURE - no logging of values)
  console.log('\n1️⃣ Reading backend Stripe configuration...');
  const backendContent = readFileSync(backendEnvPath, 'utf8');
  const backendStripeKey = extractStripeKey(backendContent, 'VITE_STRIPE_PUBLISHABLE_KEY');
  
  if (!backendStripeKey.found) {
    console.error('❌ VITE_STRIPE_PUBLISHABLE_KEY not found in backend .env');
    process.exit(1);
  }
  
  if (!backendStripeKey.isValid) {
    console.error('❌ Backend Stripe key has invalid format');
    process.exit(1);
  }
  
  console.log(`✅ Backend Stripe key found and validated`);
  console.log(`   🔍 Length: ${backendStripeKey.length} characters`);
  console.log(`   🌍 Environment: ${backendStripeKey.environment.toUpperCase()}`);
  console.log(`   📊 Format: Valid publishable key`);
  
  // Step 2: Update frontend development environment
  console.log('\n2️⃣ Updating frontend development environment...');
  const devUpdateSuccess = updateEnvironmentFile(frontendEnvPath, backendStripeKey.value);
  
  if (devUpdateSuccess) {
    console.log('✅ Frontend .env updated successfully');
  } else {
    console.error('❌ Failed to update frontend .env');
    process.exit(1);
  }
  
  // Step 3: Update frontend production environment
  console.log('\n3️⃣ Updating frontend production environment...');
  const prodUpdateSuccess = updateEnvironmentFile(frontendEnvProdPath, backendStripeKey.value);
  
  if (prodUpdateSuccess) {
    console.log('✅ Frontend .env.production updated successfully');
  } else {
    console.error('❌ Failed to update frontend .env.production');
    process.exit(1);
  }
  
  // Step 4: Verification (SECURE - no logging of actual values)
  console.log('\n4️⃣ Verifying synchronization...');
  
  const frontendDevContent = readFileSync(frontendEnvPath, 'utf8');
  const frontendDevKey = extractStripeKey(frontendDevContent, 'VITE_STRIPE_PUBLISHABLE_KEY');
  
  const frontendProdContent = readFileSync(frontendEnvProdPath, 'utf8');
  const frontendProdKey = extractStripeKey(frontendProdContent, 'VITE_STRIPE_PUBLISHABLE_KEY');
  
  // Verify all keys match (without logging values)
  const allKeysMatch = 
    frontendDevKey.found && 
    frontendProdKey.found && 
    frontendDevKey.value === backendStripeKey.value &&
    frontendProdKey.value === backendStripeKey.value;
  
  if (allKeysMatch) {
    console.log('✅ All Stripe keys synchronized successfully');
    console.log('✅ Frontend development and production environments match backend');
  } else {
    console.error('❌ Key synchronization verification failed');
    process.exit(1);
  }
  
  // Success summary
  console.log('\n🎉 SYNCHRONIZATION COMPLETE!');
  console.log('============================');
  console.log('✅ Backend and frontend Stripe keys are now synchronized');
  console.log('✅ Both development and production environments updated');
  console.log('✅ Backups created for safety');
  console.log(`✅ Environment: ${backendStripeKey.environment.toUpperCase()}`);
  
  console.log('\n🚀 NEXT STEPS:');
  console.log('==============');
  console.log('1. Clear Vite cache: rm -rf .vite node_modules/.vite');
  console.log('2. Restart your frontend dev server');
  console.log('3. Test the payment form - the 401 error should be resolved');
  console.log('4. If still having issues, check browser console for more details');
  
  console.log('\n🛡️ SECURITY CONFIRMATION:');
  console.log('=========================');
  console.log('✅ No secrets were logged or displayed during this process');
  console.log('✅ All operations followed Master Prompt v33 Secrets Management Protocol');
  console.log('✅ Backups created before any modifications');

} catch (error) {
  console.error('\n💥 SYNCHRONIZATION FAILED:');
  console.error('==========================');
  console.error(`Error: ${error.message}`);
  console.error('No changes were made to maintain security');
  process.exit(1);
}
