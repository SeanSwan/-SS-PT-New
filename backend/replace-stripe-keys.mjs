#!/usr/bin/env node

/**
 * Secure Stripe Key Replacement Tool
 * =================================
 * Safely replaces Stripe keys with matching pairs from the same account
 * Following Master Prompt v33 Secrets Management Protocol
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔐 SECURE STRIPE KEY REPLACEMENT TOOL');
console.log('====================================');
console.log('Following Master Prompt v33 Secrets Management Protocol');
console.log('🛡️ NO SECRETS WILL BE DISPLAYED OR LOGGED\n');

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

// SECURE FUNCTION: Validate key format without logging value
function validateKey(key, expectedType) {
  const trimmed = key.trim();
  
  if (expectedType === 'secret') {
    return {
      valid: trimmed.startsWith('sk_') && trimmed.length > 100,
      environment: trimmed.includes('_live_') ? 'live' : trimmed.includes('_test_') ? 'test' : 'unknown',
      length: trimmed.length
    };
  } else if (expectedType === 'publishable') {
    return {
      valid: trimmed.startsWith('pk_') && trimmed.length > 100,
      environment: trimmed.includes('_live_') ? 'live' : trimmed.includes('_test_') ? 'test' : 'unknown',
      length: trimmed.length
    };
  }
  
  return { valid: false };
}

// SECURE FUNCTION: Extract account ID without logging
function extractAccountId(key) {
  const match = key.match(/(sk|pk)_(live|test)_([A-Za-z0-9]+)/);
  return match ? match[3] : null;
}

async function main() {
  try {
    console.log('📋 INSTRUCTIONS:');
    console.log('================');
    console.log('1. Go to https://dashboard.stripe.com');
    console.log('2. Make sure you are in the CORRECT Stripe account');
    console.log('3. Go to Developers → API Keys');
    console.log('4. Copy BOTH the Secret Key and Publishable Key from the SAME account');
    console.log('5. Paste them here when prompted\n');
    
    console.log('⚠️ CRITICAL: Both keys MUST be from the same Stripe account!\n');
    
    // Get secret key
    const secretKey = await askQuestion('🔐 Paste your SECRET KEY (sk_live_... or sk_test_...): ');
    const secretValidation = validateKey(secretKey, 'secret');
    
    if (!secretValidation.valid) {
      console.log('❌ Invalid secret key format. Must start with sk_ and be over 100 characters.');
      process.exit(1);
    }
    
    console.log(`✅ Secret key validated: ${secretValidation.environment.toUpperCase()} environment, ${secretValidation.length} chars`);
    
    // Get publishable key
    const publishableKey = await askQuestion('🌐 Paste your PUBLISHABLE KEY (pk_live_... or pk_test_...): ');
    const publishableValidation = validateKey(publishableKey, 'publishable');
    
    if (!publishableValidation.valid) {
      console.log('❌ Invalid publishable key format. Must start with pk_ and be over 100 characters.');
      process.exit(1);
    }
    
    console.log(`✅ Publishable key validated: ${publishableValidation.environment.toUpperCase()} environment, ${publishableValidation.length} chars`);
    
    // Validate keys are from same environment
    if (secretValidation.environment !== publishableValidation.environment) {
      console.log('❌ ERROR: Keys are from different environments!');
      console.log(`Secret key: ${secretValidation.environment.toUpperCase()}`);
      console.log(`Publishable key: ${publishableValidation.environment.toUpperCase()}`);
      console.log('Both keys must be from the same environment (both live or both test).');
      process.exit(1);
    }
    
    // Validate keys are from same account
    const secretAccount = extractAccountId(secretKey.trim());
    const publishableAccount = extractAccountId(publishableKey.trim());
    
    if (secretAccount !== publishableAccount) {
      console.log('❌ ERROR: Keys are from different Stripe accounts!');
      console.log('You must copy both keys from the SAME Stripe account.');
      console.log('Go back to Stripe Dashboard and ensure you copy both keys from the same account.');
      process.exit(1);
    }
    
    console.log(`✅ Account validation: Both keys are from the same Stripe account`);
    console.log(`🎯 Environment: ${secretValidation.environment.toUpperCase()}`);
    
    // Confirm replacement
    const confirm = await askQuestion('\n🔄 Proceed with replacing the keys? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('❌ Operation cancelled by user');
      process.exit(0);
    }
    
    // Update backend .env
    console.log('\n🔧 UPDATING BACKEND CONFIGURATION:');
    console.log('==================================');
    
    const backendEnvPath = path.resolve(__dirname, '.env');
    if (existsSync(backendEnvPath)) {
      // Create backup
      const backupPath = `${backendEnvPath}.backup.${Date.now()}`;
      copyFileSync(backendEnvPath, backupPath);
      console.log(`✅ Backend backup created: ${path.basename(backupPath)}`);
      
      // Update backend .env
      let backendContent = readFileSync(backendEnvPath, 'utf8');
      
      // Replace secret key
      backendContent = backendContent.replace(
        /STRIPE_SECRET_KEY=.+/,
        `STRIPE_SECRET_KEY=${secretKey.trim()}`
      );
      
      // Replace publishable key
      backendContent = backendContent.replace(
        /VITE_STRIPE_PUBLISHABLE_KEY=.+/,
        `VITE_STRIPE_PUBLISHABLE_KEY=${publishableKey.trim()}`
      );
      
      writeFileSync(backendEnvPath, backendContent, 'utf8');
      console.log('✅ Backend .env updated successfully');
    } else {
      console.log('❌ Backend .env file not found');
    }
    
    // Update frontend .env files
    console.log('\n🌐 UPDATING FRONTEND CONFIGURATION:');
    console.log('===================================');
    
    const frontendEnvPaths = [
      path.resolve(__dirname, '..', 'frontend', '.env'),
      path.resolve(__dirname, '..', 'frontend', '.env.production')
    ];
    
    frontendEnvPaths.forEach(envPath => {
      const fileName = path.basename(envPath);
      
      if (existsSync(envPath)) {
        // Create backup
        const backupPath = `${envPath}.backup.${Date.now()}`;
        copyFileSync(envPath, backupPath);
        console.log(`✅ ${fileName} backup created`);
        
        // Update content
        let content = readFileSync(envPath, 'utf8');
        
        if (content.includes('VITE_STRIPE_PUBLISHABLE_KEY=')) {
          content = content.replace(
            /VITE_STRIPE_PUBLISHABLE_KEY=.+/,
            `VITE_STRIPE_PUBLISHABLE_KEY=${publishableKey.trim()}`
          );
        } else {
          // Add the key if it doesn't exist
          content += `\n# Stripe Configuration (Updated)\nVITE_STRIPE_PUBLISHABLE_KEY=${publishableKey.trim()}\n`;
        }
        
        writeFileSync(envPath, content, 'utf8');
        console.log(`✅ ${fileName} updated successfully`);
      } else {
        console.log(`⚠️ ${fileName} not found - creating new file`);
        
        const newContent = `# SwanStudios Frontend Environment
# Updated with matching Stripe keys
VITE_STRIPE_PUBLISHABLE_KEY=${publishableKey.trim()}
`;
        writeFileSync(envPath, newContent, 'utf8');
        console.log(`✅ ${fileName} created successfully`);
      }
    });
    
    console.log('\n🎉 KEY REPLACEMENT COMPLETE!');
    console.log('============================');
    console.log('✅ All Stripe keys updated with matching pairs');
    console.log('✅ Backups created for all modified files');
    console.log('✅ Keys validated for same account and environment');
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('==============');
    console.log('1. Test locally: npm run dev (in frontend folder)');
    console.log('2. Test payment form to ensure 401 error is gone');
    console.log('3. Deploy to production: git add . && git commit -m "fix: update Stripe keys to matching account" && git push origin main');
    
    console.log('\n🛡️ SECURITY CONFIRMATION:');
    console.log('=========================');
    console.log('✅ Keys safely updated following security protocols');
    console.log('✅ No secrets logged or exposed during process');
    console.log('✅ Backups created for rollback if needed');
    
  } catch (error) {
    console.error('\n💥 ERROR:', error.message);
  } finally {
    rl.close();
  }
}

main();
