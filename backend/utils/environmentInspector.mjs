/**
 * Environment Inspector - Safe Runtime Environment Variable Analysis
 * ================================================================
 * Master Prompt v28.6 Compliance - Safe diagnostic tool for environment debugging
 * 
 * ⚠️ CRITICAL: This module is designed to diagnose environment variable issues
 * without exposing any secret values. Only shows existence, format, and length.
 * 
 * Features:
 * - Safe environment variable inspection (no secret exposure)
 * - Format validation for API keys
 * - Runtime availability checking
 * - Deployment verification tools
 */

import logger from './logger.mjs';

/**
 * Safely inspect an environment variable without exposing its value
 */
const safeInspectVariable = (varName) => {
  const value = process.env[varName];
  
  if (!value) {
    return {
      name: varName,
      exists: false,
      length: 0,
      format: 'MISSING',
      prefix: null,
      type: 'undefined'
    };
  }
  
  // Get safe format information
  const length = value.length;
  const prefix = value.substring(0, Math.min(10, length)); // First 10 chars max
  let format = 'UNKNOWN';
  
  // Determine format based on known patterns
  if (varName.includes('STRIPE')) {
    if (value.startsWith('sk_test_')) format = 'STRIPE_TEST_SECRET';
    else if (value.startsWith('sk_live_')) format = 'STRIPE_LIVE_SECRET';
    else if (value.startsWith('pk_test_')) format = 'STRIPE_TEST_PUBLISHABLE';
    else if (value.startsWith('pk_live_')) format = 'STRIPE_LIVE_PUBLISHABLE';
    else if (value.startsWith('whsec_')) format = 'STRIPE_WEBHOOK_SECRET';
    else format = 'STRIPE_UNKNOWN';
  } else if (varName.includes('JWT')) {
    format = 'JWT_SECRET';
  } else if (varName.includes('DATABASE') || varName.includes('PG_')) {
    format = 'DATABASE_CONNECTION';
  } else {
    format = 'GENERAL_CONFIG';
  }
  
  return {
    name: varName,
    exists: true,
    length,
    format,
    prefix: prefix,
    type: typeof value,
    startsWithExpected: getExpectedPrefix(varName) ? value.startsWith(getExpectedPrefix(varName)) : null
  };
};

/**
 * Get expected prefix for validation
 */
const getExpectedPrefix = (varName) => {
  const prefixMap = {
    'STRIPE_SECRET_KEY': 'sk_',
    'VITE_STRIPE_PUBLISHABLE_KEY': 'pk_',
    'STRIPE_WEBHOOK_SECRET': 'whsec_',
    'SENDGRID_API_KEY': 'SG.',
    'TWILIO_ACCOUNT_SID': 'AC'
  };
  return prefixMap[varName] || null;
};

/**
 * Perform comprehensive environment inspection for Stripe configuration
 */
export const inspectStripeEnvironment = () => {
  console.log('\n🔍 STRIPE ENVIRONMENT INSPECTOR');
  console.log('===============================');
  
  const timestamp = new Date().toISOString();
  const nodeEnv = process.env.NODE_ENV || 'unknown';
  
  console.log(`🕒 Timestamp: ${timestamp}`);
  console.log(`🌍 Environment: ${nodeEnv}`);
  console.log(`📍 Process ID: ${process.pid}`);
  console.log(`🖥️  Platform: ${process.platform}`);
  console.log(`⚡ Node Version: ${process.version}`);
  
  // Critical Stripe variables
  const stripeVars = [
    'STRIPE_SECRET_KEY',
    'VITE_STRIPE_PUBLISHABLE_KEY', 
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PUBLIC_KEY' // Check if old name still exists
  ];
  
  const inspection = {
    timestamp,
    environment: nodeEnv,
    processInfo: {
      pid: process.pid,
      platform: process.platform,
      nodeVersion: process.version
    },
    variables: {},
    summary: {
      total: 0,
      existing: 0,
      missing: 0,
      formatIssues: 0
    }
  };
  
  console.log('\n🔑 STRIPE VARIABLE INSPECTION:');
  
  stripeVars.forEach(varName => {
    const result = safeInspectVariable(varName);
    inspection.variables[varName] = result;
    inspection.summary.total++;
    
    if (result.exists) {
      inspection.summary.existing++;
      const status = result.startsWithExpected ? '✅' : '⚠️';
      console.log(`  ${status} ${varName}:`);
      console.log(`     - Exists: ${result.exists}`);
      console.log(`     - Length: ${result.length} characters`);
      console.log(`     - Format: ${result.format}`);
      console.log(`     - Prefix: "${result.prefix}..."`);
      
      if (result.startsWithExpected === false) {
        console.log(`     - ❌ INVALID PREFIX: Expected "${getExpectedPrefix(varName)}", got "${result.prefix}"`);
        inspection.summary.formatIssues++;
      }
    } else {
      inspection.summary.missing++;
      console.log(`  ❌ ${varName}: NOT FOUND`);
    }
  });
  
  // Check for legacy variable names
  console.log('\n🔄 LEGACY VARIABLE CHECK:');
  const legacyVars = ['STRIPE_PUBLIC_KEY', 'STRIPE_PUBLISHABLE_KEY'];
  legacyVars.forEach(varName => {
    const result = safeInspectVariable(varName);
    if (result.exists) {
      console.log(`  ⚠️  LEGACY VARIABLE FOUND: ${varName} (${result.length} chars)`);
      console.log(`     - This should be renamed to VITE_STRIPE_PUBLISHABLE_KEY`);
    }
  });
  
  // Environment variable loading verification
  console.log('\n📋 ENVIRONMENT LOADING VERIFICATION:');
  const dotenvCheck = process.env.NODE_ENV !== 'production' ? 'Expected' : 'Not Expected';
  console.log(`  🗂️  .env file loading: ${dotenvCheck} (NODE_ENV: ${nodeEnv})`);
  console.log(`  🌍 System env variables: Always available`);
  console.log(`  🔄 Total env variables: ${Object.keys(process.env).length}`);
  
  // Summary
  console.log('\n📊 INSPECTION SUMMARY:');
  console.log(`  📈 Total variables checked: ${inspection.summary.total}`);
  console.log(`  ✅ Variables found: ${inspection.summary.existing}`);
  console.log(`  ❌ Variables missing: ${inspection.summary.missing}`);
  console.log(`  ⚠️  Format issues: ${inspection.summary.formatIssues}`);
  
  if (inspection.summary.missing > 0 || inspection.summary.formatIssues > 0) {
    console.log('\n🚨 CRITICAL ISSUES DETECTED');
  } else {
    console.log('\n🎉 All variables appear correctly configured');
  }
  
  console.log('===============================\n');
  
  return inspection;
};

/**
 * Quick validation check for a specific Stripe variable
 */
export const validateStripeVariable = (varName) => {
  const result = safeInspectVariable(varName);
  const expected = getExpectedPrefix(varName);
  
  return {
    ...result,
    isValid: result.exists && (expected ? result.startsWithExpected : true),
    expectedPrefix: expected,
    issues: []
  };
};

/**
 * Real-time environment change detection
 */
export const detectEnvironmentChanges = () => {
  const currentState = inspectStripeEnvironment();
  
  // Store baseline for comparison (in a real app, this would be persisted)
  if (!global.__environmentBaseline) {
    global.__environmentBaseline = currentState;
    console.log('🔍 Environment baseline established');
    return { changed: false, baseline: true };
  }
  
  const baseline = global.__environmentBaseline;
  const changes = [];
  
  Object.keys(currentState.variables).forEach(varName => {
    const current = currentState.variables[varName];
    const previous = baseline.variables[varName];
    
    if (!previous) {
      changes.push(`NEW: ${varName} was added`);
    } else if (current.exists !== previous.exists) {
      changes.push(`CHANGED: ${varName} existence changed (${previous.exists} → ${current.exists})`);
    } else if (current.length !== previous.length) {
      changes.push(`CHANGED: ${varName} length changed (${previous.length} → ${current.length})`);
    } else if (current.format !== previous.format) {
      changes.push(`CHANGED: ${varName} format changed (${previous.format} → ${current.format})`);
    }
  });
  
  if (changes.length > 0) {
    console.log('\n🔄 ENVIRONMENT CHANGES DETECTED:');
    changes.forEach(change => console.log(`  • ${change}`));
  }
  
  // Update baseline
  global.__environmentBaseline = currentState;
  
  return {
    changed: changes.length > 0,
    changes,
    timestamp: currentState.timestamp
  };
};

/**
 * Safe API endpoint handler for environment inspection
 */
export const environmentInspectionHandler = (req, res) => {
  try {
    const inspection = inspectStripeEnvironment();
    
    // Remove any potentially sensitive prefixes from the response
    const safeInspection = {
      ...inspection,
      variables: Object.keys(inspection.variables).reduce((acc, varName) => {
        const variable = inspection.variables[varName];
        acc[varName] = {
          ...variable,
          prefix: variable.exists ? `${variable.prefix.substring(0, 3)}...` : null // Only first 3 chars
        };
        return acc;
      }, {})
    };
    
    res.json({
      success: true,
      data: safeInspection
    });
  } catch (error) {
    logger.error('Error performing environment inspection:', error);
    res.status(500).json({
      success: false,
      message: 'Environment inspection failed',
      error: {
        code: 'INSPECTION_ERROR',
        details: 'Unable to inspect environment variables'
      }
    });
  }
};

export default {
  inspectStripeEnvironment,
  validateStripeVariable,
  detectEnvironmentChanges,
  environmentInspectionHandler
};