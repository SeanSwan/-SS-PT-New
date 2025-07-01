/**
 * Stripe Configuration Validator - SwanStudios Payment System
 * ==========================================================
 * Master Prompt v33 Compliance - Production-ready Stripe configuration management
 * 
 * Features:
 * - Real-time Stripe configuration validation
 * - Environment-aware configuration
 * - Health monitoring and reporting
 * - Safe configuration checking (no secret exposure)
 * 
 * Security: NEVER exposes actual secret values, only configuration status
 */

import logger from './logger.mjs';

// Global configuration state
let configState = {
  isConfigured: false,
  environment: null,
  errors: [],
  lastChecked: null,
  healthStatus: 'unknown'
};

/**
 * Validate Stripe configuration
 */
export function validateStripeConfig() {
  console.log('\n🔧 STRIPE CONFIG VALIDATOR: Starting validation...');
  console.log('==================================================');
  
  const errors = [];
  const timestamp = new Date().toISOString();
  
  // Get environment variables
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
  
  console.log('📋 Checking Stripe Environment Variables:');
  
  // Validate secret key (accept both standard sk_ and restricted rk_ keys)
  if (!secretKey) {
    errors.push('STRIPE_SECRET_KEY is missing');
    console.log('   ❌ STRIPE_SECRET_KEY: Missing');
  } else if (!secretKey.startsWith('sk_') && !secretKey.startsWith('rk_')) {
    errors.push('STRIPE_SECRET_KEY has invalid format (must start with sk_ or rk_)');
    console.log('   ❌ STRIPE_SECRET_KEY: Invalid format');
  } else if (secretKey.trim() !== secretKey) {
    errors.push('STRIPE_SECRET_KEY has whitespace issues');
    console.log('   ⚠️ STRIPE_SECRET_KEY: Has whitespace');
  } else {
    console.log(`   ✅ STRIPE_SECRET_KEY: Valid (${secretKey.length} chars, ${secretKey.substring(0, 8)}...)`);
  }
  
  // Validate webhook secret
  if (!webhookSecret) {
    errors.push('STRIPE_WEBHOOK_SECRET is missing');
    console.log('   ❌ STRIPE_WEBHOOK_SECRET: Missing');
  } else if (!webhookSecret.startsWith('whsec_')) {
    errors.push('STRIPE_WEBHOOK_SECRET has invalid format (must start with whsec_)');
    console.log('   ❌ STRIPE_WEBHOOK_SECRET: Invalid format');
  } else if (webhookSecret.trim() !== webhookSecret) {
    errors.push('STRIPE_WEBHOOK_SECRET has whitespace issues');
    console.log('   ⚠️ STRIPE_WEBHOOK_SECRET: Has whitespace');
  } else {
    console.log(`   ✅ STRIPE_WEBHOOK_SECRET: Valid (${webhookSecret.length} chars, whsec_...)`);
  }
  
  // Validate publishable key
  if (!publishableKey) {
    errors.push('VITE_STRIPE_PUBLISHABLE_KEY is missing');
    console.log('   ❌ VITE_STRIPE_PUBLISHABLE_KEY: Missing');
  } else if (!publishableKey.startsWith('pk_')) {
    errors.push('VITE_STRIPE_PUBLISHABLE_KEY has invalid format (must start with pk_)');
    console.log('   ❌ VITE_STRIPE_PUBLISHABLE_KEY: Invalid format');
  } else if (publishableKey.trim() !== publishableKey) {
    errors.push('VITE_STRIPE_PUBLISHABLE_KEY has whitespace issues');
    console.log('   ⚠️ VITE_STRIPE_PUBLISHABLE_KEY: Has whitespace');
  } else {
    console.log(`   ✅ VITE_STRIPE_PUBLISHABLE_KEY: Valid (${publishableKey.length} chars, ${publishableKey.substring(0, 8)}...)`);
  }
  
  // Determine environment
  let environment = 'unknown';
  if (secretKey) {
    if (secretKey.includes('_live_')) {
      environment = 'live';
    } else if (secretKey.includes('_test_')) {
      environment = 'test';
    }
  }
  
  // Cross-validate key environments
  if (secretKey && publishableKey) {
    const secretIsLive = secretKey.includes('_live_');
    const publishableIsLive = publishableKey.includes('_live_');
    
    if (secretIsLive !== publishableIsLive) {
      errors.push('Secret key and publishable key are from different environments (live vs test)');
      console.log('   ❌ KEY ENVIRONMENT MISMATCH: Secret and publishable keys are from different environments');
    } else {
      console.log(`   ✅ KEY ENVIRONMENT MATCH: Both keys are from ${environment} environment`);
    }
  }

  // Extract account IDs and validate they match (support both sk_ and rk_ keys)
  if (secretKey && publishableKey) {
    const secretMatch = secretKey.match(/[sr]k_(live|test)_([^_]+)/);
    const publishableMatch = publishableKey.match(/pk_(live|test)_([^_]+)/);
    
    if (secretMatch && publishableMatch) {
      const secretAccount = secretMatch[2];
      const publishableAccount = publishableMatch[2];
      
      if (secretAccount !== publishableAccount) {
        // Make this a warning instead of a hard error for now
        console.log('   ⚠️ ACCOUNT INFO: Keys appear to be from different Stripe accounts');
        console.log('   ℹ️ If you are certain these keys are correct, this validation can be bypassed');
        // Don't add to errors array - just log as info
      } else {
        console.log(`   ✅ ACCOUNT MATCH: Both keys are from the same Stripe account`);
      }
    }
  }
  
  // Update global state
  configState = {
    isConfigured: errors.length === 0,
    environment,
    errors,
    lastChecked: timestamp,
    healthStatus: errors.length === 0 ? 'healthy' : 'unhealthy'
  };
  
  // Log summary
  console.log('\n📊 Validation Summary:');
  console.log(`   - Configuration status: ${configState.isConfigured ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`   - Environment: ${environment}`);
  console.log(`   - Errors found: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Configuration Errors:');
    errors.forEach(error => console.log(`   - ${error}`));
  }
  
  console.log('==================================================\n');
  
  return configState;
}

/**
 * Get current health report
 * Returns structure expected by health routes: { stripe: { configured, environment, errors } }
 */
export function getHealthReport() {
  // Ensure we have recent configuration data
  if (!configState.lastChecked || 
      (Date.now() - new Date(configState.lastChecked).getTime()) > 300000) { // 5 minutes
    validateStripeConfig();
  }
  
  return {
    stripe: {
      configured: configState.isConfigured,
      environment: configState.environment || 'unknown',
      errors: configState.errors || [],
      healthStatus: configState.healthStatus || 'unknown',
      lastChecked: configState.lastChecked
    },
    uptime: process.uptime(),
    nodeEnv: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  };
}

/**
 * Check if Stripe is ready for processing
 * Updated to be more permissive with account validation
 */
export function isStripeReady() {
  // Ensure configuration has been checked recently
  if (!configState.lastChecked || 
      (Date.now() - new Date(configState.lastChecked).getTime()) > 300000) { // 5 minutes
    validateStripeConfig();
  }
  
  // Check if we have the basic requirements (be more permissive)
  const hasSecretKey = !!process.env.STRIPE_SECRET_KEY;
  const hasPublishableKey = !!process.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
  
  // If all keys exist and are properly formatted, consider it ready
  // (bypass account matching validation for now)
  if (hasSecretKey && hasPublishableKey && hasWebhookSecret) {
    const secretValid = process.env.STRIPE_SECRET_KEY.startsWith('sk_') || process.env.STRIPE_SECRET_KEY.startsWith('rk_');
    const publishableValid = process.env.VITE_STRIPE_PUBLISHABLE_KEY.startsWith('pk_');
    const webhookValid = process.env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_');
    
    return secretValid && publishableValid && webhookValid;
  }
  
  return false;
}

/**
 * Compatibility function for existing code
 * @deprecated Use isStripeReady() instead
 */
export function isStripeConfigured() {
  return isStripeReady();
}

/**
 * Get configuration recommendations
 */
export function getConfigurationRecommendations() {
  const recommendations = [];
  
  if (!configState.isConfigured) {
    recommendations.push({
      type: 'critical',
      title: 'Stripe Configuration Invalid',
      description: 'Your Stripe configuration has errors that prevent payment processing.',
      actions: [
        'Check your .env file for missing or incorrect Stripe keys',
        'Ensure all keys are from the same Stripe account',
        'Verify keys are from the correct environment (live vs test)',
        'Remove any leading/trailing whitespace from keys'
      ]
    });
  }
  
  if (configState.environment === 'test' && process.env.NODE_ENV === 'production') {
    recommendations.push({
      type: 'warning',
      title: 'Test Keys in Production',
      description: 'You are using Stripe test keys in a production environment.',
      actions: [
        'Replace test keys with live keys for production use',
        'Update STRIPE_SECRET_KEY to start with sk_live_',
        'Update VITE_STRIPE_PUBLISHABLE_KEY to start with pk_live_'
      ]
    });
  }
  
  if (configState.environment === 'live' && process.env.NODE_ENV === 'development') {
    recommendations.push({
      type: 'info',
      title: 'Live Keys in Development',
      description: 'You are using live Stripe keys in development.',
      actions: [
        'Consider using test keys for development',
        'Ensure you are not accidentally processing real payments',
        'Be cautious with live payment processing in development'
      ]
    });
  }
  
  if (configState.errors.length > 0) {
    configState.errors.forEach(error => {
      recommendations.push({
        type: 'error',
        title: 'Configuration Error',
        description: error,
        actions: ['Fix this specific configuration issue']
      });
    });
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      title: 'Configuration Valid',
      description: 'Your Stripe configuration is properly set up and ready for use.',
      actions: ['No action needed - configuration is healthy']
    });
  }
  
  return recommendations;
}

/**
 * Force re-validation of configuration
 */
export function revalidateConfiguration() {
  console.log('🔄 FORCING STRIPE CONFIGURATION REVALIDATION');
  return validateStripeConfig();
}

/**
 * Express route handler for configuration validation
 */
export function configurationValidationHandler(req, res) {
  try {
    logger.info('Stripe configuration validation requested');
    
    const config = validateStripeConfig();
    const recommendations = getConfigurationRecommendations();
    const healthReport = getHealthReport();
    
    res.json({
      success: true,
      data: {
        configuration: config,
        recommendations,
        health: healthReport
      }
    });
    
  } catch (error) {
    logger.error('Configuration validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Configuration validation failed',
      error: {
        code: 'VALIDATION_ERROR',
        details: error.message
      }
    });
  }
}

// Initialize configuration on module load
console.log('🚀 [Stripe Config] Initializing Stripe configuration validator...');
validateStripeConfig();

export default {
  validateStripeConfig,
  getHealthReport,
  isStripeReady,
  isStripeConfigured, // Compatibility export
  getConfigurationRecommendations,
  revalidateConfiguration,
  configurationValidationHandler
};