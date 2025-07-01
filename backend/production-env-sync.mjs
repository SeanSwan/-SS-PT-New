#!/usr/bin/env node

/**
 * SwanStudios Production Environment Synchronization Tool
 * ======================================================
 * Generates exact environment variables for Render deployment
 * Master Prompt v33 compliant - Production deployment safety
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 SWANSTUDIOS PRODUCTION ENVIRONMENT SYNCHRONIZATION');
console.log('====================================================');
console.log(`📅 Timestamp: ${new Date().toISOString()}\n`);

/**
 * Utility Functions
 */
function logSection(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔧 ${title.toUpperCase()}`);
  console.log('='.repeat(60));
}

function logSubSection(title) {
  console.log(`\n📋 ${title}`);
  console.log('-'.repeat(40));
}

function readLocalEnv() {
  try {
    const envPath = path.resolve(__dirname, '.env');
    if (!existsSync(envPath)) {
      throw new Error('Backend .env file not found');
    }
    
    const content = readFileSync(envPath, 'utf8');
    const env = {};
    
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([A-Z_]+)=(.*)$/);
        if (match) {
          env[match[1]] = match[2];
        }
      }
    });
    
    return env;
  } catch (error) {
    throw new Error(`Cannot read local .env: ${error.message}`);
  }
}

function extractAccountId(key) {
  if (!key) return null;
  const match = key.match(/[sprk]+_(?:live|test)_([A-Za-z0-9]{16,})/);
  return match ? match[1].substring(0, 16) : null;
}

function validateKey(key, expectedType) {
  if (!key) return { valid: false, error: 'Missing' };
  
  const validations = {
    secret: key.startsWith('sk_') || key.startsWith('rk_'),
    publishable: key.startsWith('pk_'),
    webhook: key.startsWith('whsec_')
  };
  
  const isValid = validations[expectedType];
  const environment = key.includes('_live_') ? 'live' : key.includes('_test_') ? 'test' : 'unknown';
  
  return {
    valid: isValid,
    environment,
    accountId: extractAccountId(key),
    length: key.length,
    hasWhitespace: key !== key.trim(),
    error: isValid ? null : `Invalid ${expectedType} key format`
  };
}

/**
 * Layer 1: Local Configuration Analysis
 */
function analyzeLocalConfiguration() {
  logSection('LAYER 1: LOCAL CONFIGURATION ANALYSIS');
  
  let localEnv;
  try {
    localEnv = readLocalEnv();
    console.log('✅ Local .env file loaded successfully');
  } catch (error) {
    console.log(`❌ Failed to load local .env: ${error.message}`);
    return null;
  }
  
  logSubSection('Stripe Configuration Analysis');
  
  const stripeKeys = {
    secret: localEnv.STRIPE_SECRET_KEY,
    webhook: localEnv.STRIPE_WEBHOOK_SECRET,
    publishable: localEnv.VITE_STRIPE_PUBLISHABLE_KEY
  };
  
  const keyValidation = {};
  
  Object.entries(stripeKeys).forEach(([type, key]) => {
    const validation = validateKey(key, type);
    keyValidation[type] = validation;
    
    console.log(`${type.toUpperCase()} Key:`);
    if (validation.valid) {
      console.log(`   ✅ Valid (${validation.length} chars, ${validation.environment})`);
      console.log(`   Account: ${validation.accountId}`);
      if (validation.hasWhitespace) {
        console.log(`   ⚠️ Warning: Has whitespace`);
      }
    } else {
      console.log(`   ❌ Invalid: ${validation.error}`);
    }
  });
  
  // Check account consistency
  const accounts = Object.values(keyValidation)
    .filter(v => v.valid && v.accountId)
    .map(v => v.accountId);
  
  const uniqueAccounts = [...new Set(accounts)];
  
  console.log('\nAccount Consistency:');
  if (uniqueAccounts.length === 1) {
    console.log(`   ✅ All keys from account: ${uniqueAccounts[0]}`);
  } else if (uniqueAccounts.length > 1) {
    console.log(`   ❌ Multiple accounts detected: ${uniqueAccounts.join(', ')}`);
  } else {
    console.log(`   ❌ No valid account IDs found`);
  }
  
  return {
    env: localEnv,
    validation: keyValidation,
    accountConsistent: uniqueAccounts.length === 1,
    primaryAccount: uniqueAccounts[0] || null
  };
}

/**
 * Layer 2: Production Environment Variable Generation
 */
function generateProductionEnvironment(localConfig) {
  logSection('LAYER 2: PRODUCTION ENVIRONMENT VARIABLE GENERATION');
  
  if (!localConfig) {
    console.log('❌ Cannot generate: Local configuration not available');
    return null;
  }
  
  logSubSection('Required Production Variables');
  
  // Core production variables that should match local
  const productionVars = {
    // Node.js Environment
    NODE_ENV: 'production',
    PORT: '10000',
    
    // Database
    DATABASE_URL: localConfig.env.DATABASE_URL,
    
    // Stripe Configuration (CRITICAL)
    STRIPE_SECRET_KEY: localConfig.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: localConfig.env.STRIPE_WEBHOOK_SECRET,
    
    // JWT Configuration
    JWT_SECRET: localConfig.env.JWT_SECRET,
    JWT_REFRESH_SECRET: localConfig.env.JWT_REFRESH_SECRET,
    JWT_EXPIRES_IN: localConfig.env.JWT_EXPIRES_IN || '3h',
    ACCESS_TOKEN_EXPIRY: localConfig.env.ACCESS_TOKEN_EXPIRY || '10800',
    REFRESH_TOKEN_EXPIRY: localConfig.env.REFRESH_TOKEN_EXPIRY || '604800',
    
    // CORS Configuration
    FRONTEND_ORIGINS: 'https://sswanstudios.com,https://www.sswanstudios.com,https://swanstudios.com,https://www.swanstudios.com',
    
    // Email Configuration
    SENDGRID_API_KEY: localConfig.env.SENDGRID_API_KEY,
    SENDGRID_FROM_EMAIL: localConfig.env.SENDGRID_FROM_EMAIL,
    
    // SMS Configuration
    TWILIO_ACCOUNT_SID: localConfig.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: localConfig.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: localConfig.env.TWILIO_PHONE_NUMBER,
    
    // Admin Configuration
    ADMIN_ACCESS_CODE: localConfig.env.ADMIN_ACCESS_CODE,
    ADMIN_USERNAME: localConfig.env.ADMIN_USERNAME,
    ADMIN_PASSWORD: localConfig.env.ADMIN_PASSWORD,
    ADMIN_FIRST_NAME: localConfig.env.ADMIN_FIRST_NAME,
    ADMIN_LAST_NAME: localConfig.env.ADMIN_LAST_NAME,
    ADMIN_EMAIL: localConfig.env.ADMIN_EMAIL,
    
    // Contact Information
    CONTACT_EMAIL: localConfig.env.CONTACT_EMAIL,
    OWNER_EMAIL: localConfig.env.OWNER_EMAIL,
    OWNER_WIFE_EMAIL: localConfig.env.OWNER_WIFE_EMAIL,
    OWNER_PHONE: localConfig.env.OWNER_PHONE,
    OWNER_WIFE_PHONE: localConfig.env.OWNER_WIFE_PHONE,
    
    // Feature Flags
    USE_SQLITE_FALLBACK: 'false',
    REDIS_ENABLED: 'false',
    FORCE_APP_CORS: 'true'
  };
  
  // Validate critical variables
  const critical = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'DATABASE_URL', 'JWT_SECRET'];
  const missing = critical.filter(key => !productionVars[key]);
  
  if (missing.length > 0) {
    console.log(`❌ Missing critical variables: ${missing.join(', ')}`);
    return null;
  }
  
  console.log('✅ All critical production variables present');
  console.log(`📊 Total variables: ${Object.keys(productionVars).length}`);
  
  return productionVars;
}

/**
 * Layer 3: Render Environment Instructions
 */
function generateRenderInstructions(productionVars, localConfig) {
  logSection('LAYER 3: RENDER ENVIRONMENT SETUP INSTRUCTIONS');
  
  if (!productionVars) {
    console.log('❌ Cannot generate instructions: Production variables not available');
    return;
  }
  
  logSubSection('Step-by-Step Render Configuration');
  
  console.log('1. 🌐 Open your Render dashboard');
  console.log('2. 🔍 Navigate to your service: swan-studios-api');
  console.log('3. ⚙️ Go to Environment section');
  console.log('4. 🔧 Update/Add the following variables:');
  console.log('');
  
  // Group variables by category for easier management
  const categories = {
    'Core Configuration': ['NODE_ENV', 'PORT', 'FRONTEND_ORIGINS', 'FORCE_APP_CORS'],
    'Database': ['DATABASE_URL'],
    'Stripe Payment System': ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    'Authentication': ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'JWT_EXPIRES_IN', 'ACCESS_TOKEN_EXPIRY', 'REFRESH_TOKEN_EXPIRY'],
    'Email Services': ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'],
    'SMS Services': ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
    'Admin Access': ['ADMIN_ACCESS_CODE', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'ADMIN_FIRST_NAME', 'ADMIN_LAST_NAME', 'ADMIN_EMAIL'],
    'Contact Information': ['CONTACT_EMAIL', 'OWNER_EMAIL', 'OWNER_WIFE_EMAIL', 'OWNER_PHONE', 'OWNER_WIFE_PHONE'],
    'Feature Flags': ['USE_SQLITE_FALLBACK', 'REDIS_ENABLED']
  };
  
  Object.entries(categories).forEach(([category, variables]) => {
    console.log(`\n📋 ${category}:`);
    console.log('-'.repeat(category.length + 4));
    
    variables.forEach(varName => {
      const value = productionVars[varName];
      if (value) {
        // Mask sensitive values for display
        let displayValue = value;
        if (varName.includes('SECRET') || varName.includes('PASSWORD') || varName.includes('TOKEN')) {
          if (value.length > 10) {
            displayValue = value.substring(0, 8) + '...' + value.substring(value.length - 4);
          } else {
            displayValue = '***MASKED***';
          }
        }
        console.log(`   ${varName}=${displayValue}`);
      } else {
        console.log(`   ${varName}=(not set)`);
      }
    });
  });
  
  logSubSection('Critical Stripe Configuration Verification');
  
  console.log('🚨 CRITICAL: Verify these Stripe variables exactly match your local setup:');
  console.log('');
  
  const stripeVars = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
  stripeVars.forEach(varName => {
    const value = productionVars[varName];
    if (value) {
      const validation = validateKey(value, varName.includes('WEBHOOK') ? 'webhook' : 'secret');
      console.log(`${varName}:`);
      console.log(`   Environment: ${validation.environment}`);
      console.log(`   Account: ${validation.accountId}`);
      console.log(`   Length: ${validation.length} characters`);
      console.log(`   Valid: ${validation.valid ? '✅' : '❌'}`);
      console.log('');
    }
  });
  
  if (localConfig.accountConsistent) {
    console.log(`✅ Account consistency verified: ${localConfig.primaryAccount}`);
  } else {
    console.log('❌ Account consistency issue detected');
  }
}

/**
 * Layer 4: Generate Environment File for Reference
 */
function generateReferenceFile(productionVars) {
  logSection('LAYER 4: REFERENCE FILE GENERATION');
  
  if (!productionVars) {
    console.log('❌ Cannot generate reference file: Production variables not available');
    return;
  }
  
  logSubSection('Creating Production Reference File');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `production-env-reference-${timestamp}.txt`;
  const filepath = path.resolve(__dirname, filename);
  
  let content = `# SwanStudios Production Environment Variables\n`;
  content += `# Generated: ${new Date().toISOString()}\n`;
  content += `# FOR RENDER DEPLOYMENT\n`;
  content += `# ========================================\n\n`;
  
  content += `# IMPORTANT: Copy these values to your Render service environment variables\n`;
  content += `# Do NOT commit this file to git - it contains sensitive data\n\n`;
  
  Object.entries(productionVars).forEach(([key, value]) => {
    if (value) {
      content += `${key}=${value}\n`;
    }
  });
  
  content += `\n# End of production environment variables\n`;
  
  try {
    writeFileSync(filepath, content, 'utf8');
    console.log(`✅ Reference file created: ${filename}`);
    console.log(`📁 Location: ${filepath}`);
    console.log('⚠️ Warning: This file contains sensitive data - do not share or commit');
  } catch (error) {
    console.log(`❌ Failed to create reference file: ${error.message}`);
  }
  
  return filename;
}

/**
 * Layer 5: Deployment Verification Steps
 */
function generateVerificationSteps() {
  logSection('LAYER 5: POST-DEPLOYMENT VERIFICATION STEPS');
  
  console.log('📋 After updating Render environment variables:');
  console.log('');
  
  console.log('1. 🔄 Redeploy the service:');
  console.log('   - In Render dashboard, go to Deploys tab');
  console.log('   - Click "Redeploy latest" to apply new environment variables');
  console.log('');
  
  console.log('2. 📊 Monitor deployment logs:');
  console.log('   - Watch for Stripe initialization messages');
  console.log('   - Look for "✅ Enhanced Stripe client initialized successfully"');
  console.log('   - Verify no 503 errors during startup');
  console.log('');
  
  console.log('3. 🧪 Test critical endpoints:');
  console.log('   - Test: https://ss-pt-new.onrender.com/health');
  console.log('   - Test: https://ss-pt-new.onrender.com/api/health');
  console.log('   - Test: https://ss-pt-new.onrender.com/api/payments/diagnostics');
  console.log('');
  
  console.log('4. 💳 Test payment system:');
  console.log('   - Open: https://sswanstudios.com');
  console.log('   - Add package to cart');
  console.log('   - Try checkout - should NOT get 503 error');
  console.log('   - Payment forms should load properly');
  console.log('');
  
  console.log('5. 🔍 Run diagnostic scripts:');
  console.log('   - Run: node comprehensive-production-diagnostic.mjs');
  console.log('   - Verify all endpoints return success');
  console.log('   - Confirm Stripe configuration is valid');
  console.log('');
  
  console.log('6. 📱 Test user flow:');
  console.log('   - Login as admin');
  console.log('   - Add Silver Swan Wing to cart');
  console.log('   - Complete checkout process');
  console.log('   - Verify payment processing works');
}

/**
 * Main Synchronization Function
 */
async function runProductionSync() {
  console.log('🚀 Starting production environment synchronization...\n');
  
  try {
    // Layer 1: Analyze local configuration
    const localConfig = analyzeLocalConfiguration();
    
    // Layer 2: Generate production variables
    const productionVars = generateProductionEnvironment(localConfig);
    
    // Layer 3: Generate Render instructions
    generateRenderInstructions(productionVars, localConfig);
    
    // Layer 4: Create reference file
    const referenceFile = generateReferenceFile(productionVars);
    
    // Layer 5: Verification steps
    generateVerificationSteps();
    
    logSection('SYNCHRONIZATION SUMMARY');
    
    console.log('🎯 READY FOR DEPLOYMENT:');
    if (localConfig?.accountConsistent && productionVars) {
      console.log('   ✅ Local configuration validated');
      console.log('   ✅ Production variables generated');
      console.log('   ✅ Render instructions provided');
      console.log('   ✅ Reference file created');
      console.log('');
      console.log('📋 NEXT STEPS:');
      console.log('   1. 🔧 Update Render environment variables');
      console.log('   2. 🔄 Redeploy the service');
      console.log('   3. 🧪 Run verification tests');
      console.log('   4. 💳 Test payment system');
    } else {
      console.log('   ❌ Configuration issues detected');
      console.log('   🔧 Fix local configuration first');
    }
    
  } catch (error) {
    console.error('\n💥 Synchronization failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the synchronization
runProductionSync().then(() => {
  console.log('\n✅ Production environment synchronization complete');
  console.log('🔐 Remember: Reference file contains sensitive data - handle securely');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Synchronization error:', error);
  process.exit(1);
});
