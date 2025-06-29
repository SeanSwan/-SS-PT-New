/**
 * Environment Variable Inspector - SwanStudios Payment System Diagnostics
 * =====================================================================
 * Master Prompt v33 Compliance - Production-ready environment inspection
 * 
 * Features:
 * - Safe environment variable inspection (no secret exposure)
 * - Stripe configuration validation
 * - Format checking and validation
 * - Express route handler for real-time inspection
 * 
 * Security: NEVER exposes actual secret values, only configuration status
 */

import logger from './logger.mjs';

/**
 * Required environment variables for payment processing
 */
const REQUIRED_STRIPE_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET'
];

const OPTIONAL_STRIPE_VARS = [
  'VITE_STRIPE_PUBLISHABLE_KEY'
];

/**
 * Environment variable format validators
 */
const FORMAT_VALIDATORS = {
  STRIPE_SECRET_KEY: (value) => {
    if (!value) return { valid: false, error: 'Missing value' };
    if (!value.startsWith('sk_')) return { valid: false, error: 'Must start with sk_' };
    if (value.length < 20) return { valid: false, error: 'Key too short' };
    return { valid: true };
  },
  
  STRIPE_WEBHOOK_SECRET: (value) => {
    if (!value) return { valid: false, error: 'Missing value' };
    if (!value.startsWith('whsec_')) return { valid: false, error: 'Must start with whsec_' };
    if (value.length < 20) return { valid: false, error: 'Secret too short' };
    return { valid: true };
  },
  
  VITE_STRIPE_PUBLISHABLE_KEY: (value) => {
    if (!value) return { valid: false, error: 'Missing value' };
    if (!value.startsWith('pk_')) return { valid: false, error: 'Must start with pk_' };
    if (value.length < 20) return { valid: false, error: 'Key too short' };
    return { valid: true };
  }
};

/**
 * Safe variable inspection - shows only structure, not values
 */
function inspectVariable(name, value) {
  const exists = value !== undefined && value !== null;
  const isEmpty = !value || value.trim() === '';
  const hasWhitespace = value && (value !== value.trim());
  
  const inspection = {
    name,
    exists,
    isEmpty,
    hasWhitespace,
    length: value ? value.length : 0,
    prefix: value ? value.substring(0, Math.min(8, value.length)) + '...' : null,
    format: null
  };
  
  // Apply format validation if available
  if (FORMAT_VALIDATORS[name] && value) {
    inspection.format = FORMAT_VALIDATORS[name](value);
  }
  
  return inspection;
}

/**
 * Comprehensive environment inspection
 */
export function inspectStripeEnvironment() {
  console.log('\n🔍 ENVIRONMENT INSPECTOR: Starting inspection...');
  console.log('=================================================');
  
  const inspection = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    required: {},
    optional: {},
    summary: {
      existing: 0,
      missing: 0,
      formatIssues: 0,
      whitespaceIssues: 0
    }
  };
  
  // Inspect required variables
  console.log('\n📋 Required Environment Variables:');
  for (const varName of REQUIRED_STRIPE_VARS) {
    const result = inspectVariable(varName, process.env[varName]);
    inspection.required[varName] = result;
    
    console.log(`   ${varName}:`);
    console.log(`     - Exists: ${result.exists ? '✅' : '❌'}`);
    console.log(`     - Length: ${result.length}`);
    console.log(`     - Prefix: ${result.prefix || 'N/A'}`);
    
    if (result.hasWhitespace) {
      console.log(`     - ⚠️ Has whitespace issues`);
      inspection.summary.whitespaceIssues++;
    }
    
    if (result.format && !result.format.valid) {
      console.log(`     - ❌ Format issue: ${result.format.error}`);
      inspection.summary.formatIssues++;
    } else if (result.format && result.format.valid) {
      console.log(`     - ✅ Format valid`);
    }
    
    if (result.exists && !result.isEmpty) {
      inspection.summary.existing++;
    } else {
      inspection.summary.missing++;
    }
  }
  
  // Inspect optional variables
  console.log('\n📋 Optional Environment Variables:');
  for (const varName of OPTIONAL_STRIPE_VARS) {
    const result = inspectVariable(varName, process.env[varName]);
    inspection.optional[varName] = result;
    
    console.log(`   ${varName}:`);
    console.log(`     - Exists: ${result.exists ? '✅' : '⚠️'}`);
    console.log(`     - Length: ${result.length}`);
    console.log(`     - Prefix: ${result.prefix || 'N/A'}`);
    
    if (result.hasWhitespace) {
      console.log(`     - ⚠️ Has whitespace issues`);
      inspection.summary.whitespaceIssues++;
    }
    
    if (result.format && !result.format.valid) {
      console.log(`     - ❌ Format issue: ${result.format.error}`);
      inspection.summary.formatIssues++;
    } else if (result.format && result.format.valid) {
      console.log(`     - ✅ Format valid`);
    }
  }
  
  // Summary
  console.log('\n📊 Inspection Summary:');
  console.log(`   - Variables found: ${inspection.summary.existing}`);
  console.log(`   - Variables missing: ${inspection.summary.missing}`);
  console.log(`   - Format issues: ${inspection.summary.formatIssues}`);
  console.log(`   - Whitespace issues: ${inspection.summary.whitespaceIssues}`);
  
  console.log('=================================================\n');
  
  return inspection;
}

/**
 * Environment key matching analysis
 */
export function analyzeKeyMatching() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
  
  if (!secretKey || !publishableKey) {
    return {
      matched: false,
      reason: 'Missing keys',
      secretKeyAccount: null,
      publishableKeyAccount: null
    };
  }
  
  // Extract account IDs from keys
  const secretMatch = secretKey.match(/sk_(live|test)_([^_]+)/);
  const publishableMatch = publishableKey.match(/pk_(live|test)_([^_]+)/);
  
  if (!secretMatch || !publishableMatch) {
    return {
      matched: false,
      reason: 'Invalid key format',
      secretKeyAccount: null,
      publishableKeyAccount: null
    };
  }
  
  const secretEnvironment = secretMatch[1];
  const secretAccount = secretMatch[2];
  const publishableEnvironment = publishableMatch[1];
  const publishableAccount = publishableMatch[2];
  
  const environmentsMatch = secretEnvironment === publishableEnvironment;
  const accountsMatch = secretAccount === publishableAccount;
  
  return {
    matched: environmentsMatch && accountsMatch,
    environmentsMatch,
    accountsMatch,
    secretEnvironment,
    publishableEnvironment,
    secretKeyAccount: secretAccount,
    publishableKeyAccount: publishableAccount,
    reason: !environmentsMatch ? 'Environment mismatch (live vs test)' : 
            !accountsMatch ? 'Account mismatch' : 'Keys match'
  };
}

/**
 * Express route handler for environment inspection
 */
export function environmentInspectionHandler(req, res) {
  try {
    logger.info('Environment inspection requested');
    
    const inspection = inspectStripeEnvironment();
    const keyMatching = analyzeKeyMatching();
    
    const response = {
      success: true,
      data: {
        inspection,
        keyMatching,
        recommendations: generateRecommendations(inspection, keyMatching)
      }
    };
    
    res.json(response);
    
  } catch (error) {
    logger.error('Environment inspection error:', error);
    res.status(500).json({
      success: false,
      message: 'Environment inspection failed',
      error: {
        code: 'INSPECTION_ERROR',
        details: error.message
      }
    });
  }
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(inspection, keyMatching) {
  const recommendations = [];
  
  if (inspection.summary.missing > 0) {
    recommendations.push({
      type: 'critical',
      message: `${inspection.summary.missing} required environment variables are missing`,
      action: 'Add missing environment variables to your .env file'
    });
  }
  
  if (inspection.summary.formatIssues > 0) {
    recommendations.push({
      type: 'critical',
      message: `${inspection.summary.formatIssues} environment variables have format issues`,
      action: 'Check the format of your Stripe keys'
    });
  }
  
  if (inspection.summary.whitespaceIssues > 0) {
    recommendations.push({
      type: 'warning',
      message: `${inspection.summary.whitespaceIssues} environment variables have whitespace issues`,
      action: 'Remove leading/trailing spaces from environment variables'
    });
  }
  
  if (!keyMatching.matched) {
    recommendations.push({
      type: 'critical',
      message: `Stripe keys don't match: ${keyMatching.reason}`,
      action: 'Ensure your secret key and publishable key are from the same Stripe account and environment'
    });
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      message: 'All environment variables are properly configured',
      action: 'Your Stripe configuration looks good!'
    });
  }
  
  return recommendations;
}

export default {
  inspectStripeEnvironment,
  analyzeKeyMatching,
  environmentInspectionHandler
};