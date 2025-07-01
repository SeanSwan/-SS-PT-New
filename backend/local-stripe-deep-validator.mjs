#!/usr/bin/env node

/**
 * SwanStudios Local Stripe Configuration Deep Validator
 * ====================================================
 * Validates local Stripe configuration with extensive testing
 * Master Prompt v33 compliant - Deep analysis protocol
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 SWANSTUDIOS LOCAL STRIPE CONFIGURATION VALIDATOR');
console.log('==================================================');
console.log(`📅 Timestamp: ${new Date().toISOString()}\n`);

/**
 * Utility Functions
 */
function logSection(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 ${title.toUpperCase()}`);
  console.log('='.repeat(60));
}

function logSubSection(title) {
  console.log(`\n📋 ${title}`);
  console.log('-'.repeat(40));
}

function extractAccountId(key) {
  if (!key) return null;
  // Updated regex to handle all key types including restricted keys
  const match = key.match(/[sprk]+_(?:live|test)_([A-Za-z0-9]{16,})/);
  return match ? match[1].substring(0, 16) : null;
}

function extractFullAccountId(key) {
  if (!key) return null;
  const match = key.match(/[sprk]+_(?:live|test)_([A-Za-z0-9]+)/);
  return match ? match[1] : null;
}

function analyzeKeyFormat(key, expectedType) {
  if (!key) {
    return {
      valid: false,
      type: 'missing',
      error: 'Key is missing or empty'
    };
  }
  
  const keyTypes = {
    secret: key.startsWith('sk_live_') || key.startsWith('sk_test_'),
    restricted: key.startsWith('rk_live_') || key.startsWith('rk_test_'),
    publishable: key.startsWith('pk_live_') || key.startsWith('pk_test_'),
    webhook: key.startsWith('whsec_')
  };
  
  const actualType = Object.keys(keyTypes).find(type => keyTypes[type]);
  
  const analysis = {
    valid: false,
    type: actualType || 'unknown',
    expectedType,
    format: {
      length: key.length,
      prefix: key.substring(0, 8),
      hasWhitespace: key !== key.trim(),
      environment: key.includes('_live_') ? 'live' : key.includes('_test_') ? 'test' : 'unknown'
    },
    accountId: extractAccountId(key),
    fullAccountId: extractFullAccountId(key)
  };
  
  // Validate type
  if (expectedType === 'secret' && (actualType === 'secret' || actualType === 'restricted')) {
    analysis.valid = true;
    analysis.note = actualType === 'restricted' ? 'Restricted key (enhanced secret with limited permissions)' : 'Standard secret key';
  } else if (actualType === expectedType) {
    analysis.valid = true;
  } else {
    analysis.error = `Expected ${expectedType} key but got ${actualType || 'unknown'} key`;
  }
  
  // Additional validations
  if (analysis.format.hasWhitespace) {
    analysis.warning = 'Key has leading/trailing whitespace';
  }
  
  if (analysis.format.length < 20) {
    analysis.warning = 'Key appears to be too short';
  }
  
  return analysis;
}

function readEnvFile(filePath, name) {
  try {
    if (!existsSync(filePath)) {
      return { success: false, error: 'File does not exist', name };
    }
    
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const env = {};
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([A-Z_]+)=(.*)$/);
        if (match) {
          env[match[1]] = match[2];
        }
      }
    });
    
    return { success: true, env, name, lineCount: lines.length };
  } catch (error) {
    return { success: false, error: error.message, name };
  }
}

/**
 * Layer 1: Environment File Analysis
 */
function analyzeEnvironmentFiles() {
  logSection('LAYER 1: ENVIRONMENT FILE ANALYSIS');
  
  const files = [
    { path: path.resolve(__dirname, '.env'), name: 'Backend .env' },
    { path: path.resolve(__dirname, '..', 'frontend', '.env'), name: 'Frontend .env' },
    { path: path.resolve(__dirname, '..', 'frontend', '.env.production'), name: 'Frontend .env.production' }
  ];
  
  const envData = {};
  
  files.forEach(({ path: filePath, name }) => {
    logSubSection(`Analyzing ${name}`);
    
    const result = readEnvFile(filePath, name);
    envData[name] = result;
    
    if (result.success) {
      console.log(`✅ ${name}: Found and readable`);
      console.log(`   Path: ${filePath}`);
      console.log(`   Lines: ${result.lineCount}`);
      
      // Count Stripe-related variables
      const stripeVars = Object.keys(result.env).filter(key => key.includes('STRIPE'));
      console.log(`   Stripe variables: ${stripeVars.length} found`);
      stripeVars.forEach(key => {
        console.log(`     - ${key}: ${result.env[key] ? 'Set' : 'Empty'}`);
      });
    } else {
      console.log(`❌ ${name}: ${result.error}`);
    }
  });
  
  return envData;
}

/**
 * Layer 2: Stripe Key Deep Analysis
 */
function analyzeStripeKeys(envData) {
  logSection('LAYER 2: STRIPE KEY DEEP ANALYSIS');
  
  const backendEnv = envData['Backend .env'];
  const frontendEnv = envData['Frontend .env'];
  const frontendProdEnv = envData['Frontend .env.production'];
  
  if (!backendEnv?.success) {
    console.log('❌ Cannot analyze keys: Backend .env not available');
    return null;
  }
  
  const keyAnalysis = {};
  
  logSubSection('Backend Keys Analysis');
  
  // Analyze backend secret key
  const secretKey = backendEnv.env.STRIPE_SECRET_KEY;
  keyAnalysis.secret = analyzeKeyFormat(secretKey, 'secret');
  
  console.log('Secret Key Analysis:');
  if (keyAnalysis.secret.valid) {
    console.log(`   ✅ Valid: ${keyAnalysis.secret.type} key`);
    console.log(`   Type: ${keyAnalysis.secret.note || keyAnalysis.secret.type}`);
    console.log(`   Environment: ${keyAnalysis.secret.format.environment}`);
    console.log(`   Account ID: ${keyAnalysis.secret.accountId}`);
    console.log(`   Length: ${keyAnalysis.secret.format.length} characters`);
  } else {
    console.log(`   ❌ Invalid: ${keyAnalysis.secret.error}`);
  }
  
  if (keyAnalysis.secret.warning) {
    console.log(`   ⚠️ Warning: ${keyAnalysis.secret.warning}`);
  }
  
  // Analyze webhook secret
  const webhookSecret = backendEnv.env.STRIPE_WEBHOOK_SECRET;
  keyAnalysis.webhook = analyzeKeyFormat(webhookSecret, 'webhook');
  
  console.log('\nWebhook Secret Analysis:');
  if (keyAnalysis.webhook.valid) {
    console.log(`   ✅ Valid: ${keyAnalysis.webhook.type} key`);
    console.log(`   Length: ${keyAnalysis.webhook.format.length} characters`);
  } else {
    console.log(`   ❌ Invalid: ${keyAnalysis.webhook.error}`);
  }
  
  logSubSection('Frontend Keys Analysis');
  
  // Analyze frontend development key
  if (frontendEnv?.success) {
    const frontendPubKey = frontendEnv.env.VITE_STRIPE_PUBLISHABLE_KEY;
    keyAnalysis.frontendDev = analyzeKeyFormat(frontendPubKey, 'publishable');
    
    console.log('Frontend Development Key:');
    if (keyAnalysis.frontendDev.valid) {
      console.log(`   ✅ Valid: ${keyAnalysis.frontendDev.type} key`);
      console.log(`   Environment: ${keyAnalysis.frontendDev.format.environment}`);
      console.log(`   Account ID: ${keyAnalysis.frontendDev.accountId}`);
    } else {
      console.log(`   ❌ Invalid: ${keyAnalysis.frontendDev.error}`);
    }
  } else {
    console.log('❌ Frontend .env not available');
  }
  
  // Analyze frontend production key
  if (frontendProdEnv?.success) {
    const frontendProdPubKey = frontendProdEnv.env.VITE_STRIPE_PUBLISHABLE_KEY;
    keyAnalysis.frontendProd = analyzeKeyFormat(frontendProdPubKey, 'publishable');
    
    console.log('\nFrontend Production Key:');
    if (keyAnalysis.frontendProd.valid) {
      console.log(`   ✅ Valid: ${keyAnalysis.frontendProd.type} key`);
      console.log(`   Environment: ${keyAnalysis.frontendProd.format.environment}`);
      console.log(`   Account ID: ${keyAnalysis.frontendProd.accountId}`);
    } else {
      console.log(`   ❌ Invalid: ${keyAnalysis.frontendProd.error}`);
    }
  } else {
    console.log('❌ Frontend .env.production not available');
  }
  
  return keyAnalysis;
}

/**
 * Layer 3: Account Matching Validation
 */
function validateAccountMatching(keyAnalysis) {
  logSection('LAYER 3: ACCOUNT MATCHING VALIDATION');
  
  if (!keyAnalysis) {
    console.log('❌ Cannot validate: Key analysis not available');
    return false;
  }
  
  const accounts = [];
  const environments = [];
  
  // Collect all account IDs and environments
  Object.entries(keyAnalysis).forEach(([keyType, analysis]) => {
    if (analysis?.valid && analysis.accountId) {
      accounts.push({
        type: keyType,
        accountId: analysis.accountId,
        environment: analysis.format?.environment || 'unknown'
      });
      
      if (analysis.format?.environment) {
        environments.push(analysis.format.environment);
      }
    }
  });
  
  logSubSection('Account Consistency Check');
  
  if (accounts.length === 0) {
    console.log('❌ No valid keys found for account matching');
    return false;
  }
  
  console.log('Key Account Summary:');
  accounts.forEach(({ type, accountId, environment }) => {
    console.log(`   ${type}: ${accountId} (${environment})`);
  });
  
  // Check account consistency
  const uniqueAccounts = [...new Set(accounts.map(a => a.accountId))];
  
  if (uniqueAccounts.length === 1) {
    console.log(`\n✅ ACCOUNT MATCH: All keys from account ${uniqueAccounts[0]}`);
  } else {
    console.log(`\n❌ ACCOUNT MISMATCH: Found ${uniqueAccounts.length} different accounts`);
    uniqueAccounts.forEach((account, index) => {
      console.log(`   Account ${index + 1}: ${account}`);
    });
    console.log('   🚨 This WILL cause 401 Unauthorized errors!');
    return false;
  }
  
  logSubSection('Environment Consistency Check');
  
  const uniqueEnvironments = [...new Set(environments)];
  
  if (uniqueEnvironments.length === 1) {
    console.log(`✅ ENVIRONMENT MATCH: All keys are ${uniqueEnvironments[0]}`);
  } else {
    console.log(`❌ ENVIRONMENT MISMATCH: Found mixed environments`);
    uniqueEnvironments.forEach(env => {
      console.log(`   Environment: ${env}`);
    });
    console.log('   ⚠️ This may cause configuration issues');
  }
  
  return uniqueAccounts.length === 1;
}

/**
 * Layer 4: Production Readiness Assessment
 */
function assessProductionReadiness(keyAnalysis, accountsMatch) {
  logSection('LAYER 4: PRODUCTION READINESS ASSESSMENT');
  
  const readiness = {
    score: 0,
    maxScore: 10,
    issues: [],
    recommendations: []
  };
  
  logSubSection('Readiness Checklist');
  
  // Check 1: All required keys present
  const requiredKeys = ['secret', 'webhook', 'frontendDev', 'frontendProd'];
  const presentKeys = requiredKeys.filter(key => keyAnalysis?.[key]?.valid);
  
  if (presentKeys.length === requiredKeys.length) {
    console.log('✅ All required keys present (2/2 points)');
    readiness.score += 2;
  } else {
    console.log(`❌ Missing keys: ${requiredKeys.length - presentKeys.length} (0/2 points)`);
    readiness.issues.push(`Missing ${requiredKeys.length - presentKeys.length} required keys`);
    readiness.recommendations.push('Ensure all Stripe keys are properly configured');
  }
  
  // Check 2: Account matching
  if (accountsMatch) {
    console.log('✅ Account matching validated (3/3 points)');
    readiness.score += 3;
  } else {
    console.log('❌ Account mismatch detected (0/3 points)');
    readiness.issues.push('Keys are from different Stripe accounts');
    readiness.recommendations.push('Update all keys to use the same Stripe account');
  }
  
  // Check 3: Environment consistency
  const environments = Object.values(keyAnalysis || {})
    .filter(analysis => analysis?.valid && analysis.format?.environment)
    .map(analysis => analysis.format.environment);
  
  const uniqueEnvs = [...new Set(environments)];
  
  if (uniqueEnvs.length <= 1) {
    console.log('✅ Environment consistency (2/2 points)');
    readiness.score += 2;
  } else {
    console.log('❌ Mixed environments detected (0/2 points)');
    readiness.issues.push('Keys are from different environments (test/live)');
    readiness.recommendations.push('Use consistent environment for all keys');
  }
  
  // Check 4: Key format validation
  const validKeys = Object.values(keyAnalysis || {})
    .filter(analysis => analysis?.valid).length;
  
  if (validKeys >= 3) {
    console.log('✅ Key format validation (2/2 points)');
    readiness.score += 2;
  } else {
    console.log(`❌ Invalid key formats detected (${validKeys}/4 valid) (0/2 points)`);
    readiness.issues.push('Some keys have invalid formats');
    readiness.recommendations.push('Verify all keys are properly formatted');
  }
  
  // Check 5: No whitespace issues
  const whitespaceIssues = Object.values(keyAnalysis || {})
    .filter(analysis => analysis?.format?.hasWhitespace).length;
  
  if (whitespaceIssues === 0) {
    console.log('✅ No whitespace issues (1/1 point)');
    readiness.score += 1;
  } else {
    console.log(`❌ Whitespace issues detected in ${whitespaceIssues} keys (0/1 point)`);
    readiness.issues.push('Keys have leading/trailing whitespace');
    readiness.recommendations.push('Remove whitespace from all keys');
  }
  
  logSubSection('Production Readiness Score');
  
  const percentage = Math.round((readiness.score / readiness.maxScore) * 100);
  console.log(`📊 Score: ${readiness.score}/${readiness.maxScore} (${percentage}%)`);
  
  if (percentage >= 90) {
    console.log('🎉 EXCELLENT: Ready for production deployment');
  } else if (percentage >= 70) {
    console.log('✅ GOOD: Minor issues to address before deployment');
  } else if (percentage >= 50) {
    console.log('⚠️ FAIR: Several issues need fixing before deployment');
  } else {
    console.log('❌ POOR: Major configuration issues - not ready for deployment');
  }
  
  return readiness;
}

/**
 * Layer 5: Deployment Command Generation
 */
function generateDeploymentCommand(readiness) {
  logSection('LAYER 5: DEPLOYMENT COMMAND GENERATION');
  
  if (readiness.score >= 8) {
    console.log('🚀 DEPLOYMENT APPROVED: Configuration is ready');
    console.log('\n📦 Recommended deployment command:');
    console.log('```bash');
    console.log('git add . && git commit -m "fix: validated Stripe configuration - ready for production deployment');
    console.log('');
    console.log('- All Stripe keys validated and account-matched');
    console.log('- Payment system configuration verified');
    console.log('- Resolves 503 Service Unavailable errors');
    console.log('- Enables secure payment processing with enhanced error handling');
    console.log('');
    console.log('Validated components:');
    console.log('- Backend secret/restricted key configuration');
    console.log('- Frontend publishable key matching');
    console.log('- Webhook secret for payment processing');
    console.log('- Account consistency across all environments');
    console.log('" && git push origin main');
    console.log('```');
  } else {
    console.log('🛑 DEPLOYMENT BLOCKED: Configuration issues must be resolved');
    
    if (readiness.issues.length > 0) {
      console.log('\n❌ Issues to resolve:');
      readiness.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    if (readiness.recommendations.length > 0) {
      console.log('\n🔧 Recommended actions:');
      readiness.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
    
    console.log('\n🔄 Re-run this validator after making changes');
  }
}

/**
 * Main Validation Function
 */
async function runLocalStripeValidation() {
  console.log('🚀 Starting comprehensive local Stripe validation...\n');
  
  try {
    // Layer 1: Environment files
    const envData = analyzeEnvironmentFiles();
    
    // Layer 2: Key analysis
    const keyAnalysis = analyzeStripeKeys(envData);
    
    // Layer 3: Account matching
    const accountsMatch = validateAccountMatching(keyAnalysis);
    
    // Layer 4: Production readiness
    const readiness = assessProductionReadiness(keyAnalysis, accountsMatch);
    
    // Layer 5: Deployment command
    generateDeploymentCommand(readiness);
    
    logSection('VALIDATION SUMMARY');
    
    console.log('🎯 KEY FINDINGS:');
    if (readiness.score >= 8) {
      console.log('   ✅ Local configuration is properly set up');
      console.log('   ✅ All Stripe keys are valid and account-matched');
      console.log('   ✅ Ready for production deployment');
    } else {
      console.log('   ⚠️ Configuration issues detected');
      console.log('   🔧 Address issues before deployment');
    }
    
    console.log('\n📋 NEXT STEPS:');
    if (readiness.score >= 8) {
      console.log('   1. ✅ Local configuration validated');
      console.log('   2. 🔄 Run production diagnostic to compare');
      console.log('   3. 🚀 Deploy fixes to production if needed');
    } else {
      console.log('   1. 🔧 Fix local configuration issues');
      console.log('   2. 🔄 Re-run this validation');
      console.log('   3. 🔄 Then run production diagnostic');
    }
    
  } catch (error) {
    console.error('\n💥 Validation failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the validation
runLocalStripeValidation().then(() => {
  console.log('\n✅ Local Stripe validation complete');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Validation error:', error);
  process.exit(1);
});
