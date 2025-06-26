/**
 * Stripe Configuration Helper - SwanStudios Payment System
 * ========================================================
 * Centralized Stripe configuration with comprehensive validation
 * Prevents 503 Service Unavailable errors by ensuring proper setup
 * 
 * Features:
 * - Environment-aware configuration
 * - Graceful degradation when Stripe is not configured
 * - Development vs Production key validation
 * - Comprehensive error reporting for debugging
 */

import logger from './logger.mjs';

// Configuration state
let stripeConfig = {
  isConfigured: false,
  publishableKey: null,
  secretKey: null,
  webhookSecret: null,
  environment: 'unknown',
  lastChecked: null,
  errors: []
};

/**
 * Validate Stripe configuration
 */
export const validateStripeConfig = () => {
  const errors = [];
  const warnings = [];
  
  // Reset state
  stripeConfig.errors = [];
  stripeConfig.lastChecked = new Date().toISOString();
  
  // Check environment
  const nodeEnv = process.env.NODE_ENV || 'development';
  stripeConfig.environment = nodeEnv;
  
  // Get keys from environment with detailed debugging
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  logger.info(`[Stripe Config] Validating configuration for ${nodeEnv} environment`);
  
  // ENHANCED DEBUGGING - Safe variable inspection
  console.log('🔍 [Stripe Config] DETAILED ENVIRONMENT INSPECTION:');
  console.log(`   - STRIPE_SECRET_KEY: ${secretKey ? 'EXISTS' : 'MISSING'} ${secretKey ? `(length: ${secretKey.length}, starts with: "${secretKey.substring(0, 8)}...")` : ''}`);
  console.log(`   - VITE_STRIPE_PUBLISHABLE_KEY: ${publishableKey ? 'EXISTS' : 'MISSING'} ${publishableKey ? `(length: ${publishableKey.length}, starts with: "${publishableKey.substring(0, 8)}...")` : ''}`);
  console.log(`   - STRIPE_WEBHOOK_SECRET: ${webhookSecret ? 'EXISTS' : 'MISSING'} ${webhookSecret ? `(length: ${webhookSecret.length}, starts with: "${webhookSecret.substring(0, 8)}...")` : ''}`);
  console.log(`   - Total env variables available: ${Object.keys(process.env).length}`);
  console.log(`   - NODE_ENV: ${nodeEnv}`);
  
  // Check for common environment variable issues
  const allEnvKeys = Object.keys(process.env);
  const stripeRelatedKeys = allEnvKeys.filter(key => key.includes('STRIPE'));
  console.log(`   - All STRIPE-related env vars found: [${stripeRelatedKeys.join(', ')}]`);
  
  // Check for whitespace issues
  if (secretKey) {
    const trimmedSecretKey = secretKey.trim();
    if (trimmedSecretKey !== secretKey) {
      console.log(`   - ⚠️ WARNING: STRIPE_SECRET_KEY has whitespace! Original length: ${secretKey.length}, trimmed: ${trimmedSecretKey.length}`);
    }
  }
  
  // Validate Secret Key
  if (!secretKey) {
    errors.push('STRIPE_SECRET_KEY is not set in environment variables');
  } else if (!secretKey.startsWith('sk_')) {
    errors.push('STRIPE_SECRET_KEY does not appear to be valid (should start with sk_)');
  } else {
    stripeConfig.secretKey = secretKey;
    
    // Check if using test vs live keys appropriately
    const isTestKey = secretKey.startsWith('sk_test_');
    const isLiveKey = secretKey.startsWith('sk_live_');
    
    if (nodeEnv === 'production' && isTestKey) {
      warnings.push('Using test Stripe key in production environment');
    } else if (nodeEnv !== 'production' && isLiveKey) {
      warnings.push('Using live Stripe key in non-production environment');
    }
    
    logger.info(`[Stripe Config] Secret key validated (${isTestKey ? 'test' : 'live'} mode)`);
  }
  
  // Validate Publishable Key
  if (!publishableKey) {
    errors.push('VITE_STRIPE_PUBLISHABLE_KEY is not set in environment variables');
  } else if (!publishableKey.startsWith('pk_')) {
    errors.push('VITE_STRIPE_PUBLISHABLE_KEY does not appear to be valid (should start with pk_)');
  } else {
    stripeConfig.publishableKey = publishableKey;
    
    // Check key pair consistency
    const pubKeyIsTest = publishableKey.startsWith('pk_test_');
    const secKeyIsTest = secretKey?.startsWith('sk_test_');
    
    if (pubKeyIsTest !== secKeyIsTest) {
      errors.push('Stripe key pair mismatch: publishable and secret keys are from different environments');
    }
    
    logger.info(`[Stripe Config] Publishable key validated`);
  }
  
  // Validate Webhook Secret (optional but recommended)
  if (!webhookSecret) {
    warnings.push('STRIPE_WEBHOOK_SECRET is not set - webhook verification will be disabled');
  } else if (!webhookSecret.startsWith('whsec_')) {
    warnings.push('STRIPE_WEBHOOK_SECRET does not appear to be valid (should start with whsec_)');
  } else {
    stripeConfig.webhookSecret = webhookSecret;
    logger.info(`[Stripe Config] Webhook secret validated`);
  }
  
  // Update configuration status
  stripeConfig.isConfigured = errors.length === 0;
  stripeConfig.errors = errors;
  
  // Log results
  if (errors.length > 0) {
    logger.error(`[Stripe Config] Configuration validation failed:`);
    errors.forEach(error => logger.error(`  ❌ ${error}`));
    logger.error(`[Stripe Config] Payment features will be disabled`);
  } else {
    logger.info(`[Stripe Config] ✅ Configuration validation successful`);
  }
  
  if (warnings.length > 0) {
    logger.warn(`[Stripe Config] Configuration warnings:`);
    warnings.forEach(warning => logger.warn(`  ⚠️ ${warning}`));
  }
  
  return stripeConfig;
};

/**
 * Get current Stripe configuration status
 */
export const getStripeConfig = () => {
  return { ...stripeConfig };
};

/**
 * Check if Stripe is properly configured
 */
export const isStripeConfigured = () => {
  return stripeConfig.isConfigured;
};

/**
 * Get configuration for frontend (only safe values)
 */
export const getFrontendStripeConfig = () => {
  return {
    isConfigured: stripeConfig.isConfigured,
    publishableKey: stripeConfig.publishableKey,
    environment: stripeConfig.environment,
    errors: stripeConfig.errors.filter(error => 
      !error.includes('SECRET') // Don't leak secret key errors to frontend
    )
  };
};

/**
 * Get helpful setup instructions based on current configuration
 */
export const getSetupInstructions = () => {
  const instructions = [];
  
  if (!stripeConfig.isConfigured) {
    instructions.push(
      '🔧 Stripe Setup Required:',
      '',
      '1. Create a Stripe account at https://stripe.com',
      '2. Get your API keys from the Stripe Dashboard',
      '3. Add the following to your .env file:',
      '   STRIPE_SECRET_KEY=sk_test_... (your secret key)',
      '   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... (your publishable key)',
      '   STRIPE_WEBHOOK_SECRET=whsec_... (optional, for webhooks)',
      '',
      '4. Restart your application',
      ''
    );
    
    if (stripeConfig.errors.length > 0) {
      instructions.push('Current configuration errors:');
      stripeConfig.errors.forEach(error => {
        instructions.push(`  ❌ ${error}`);
      });
    }
  }
  
  return instructions;
};

/**
 * Generate health check report for monitoring
 */
export const getHealthReport = () => {
  return {
    stripe: {
      configured: stripeConfig.isConfigured,
      environment: stripeConfig.environment,
      hasSecretKey: !!stripeConfig.secretKey,
      hasPublishableKey: !!stripeConfig.publishableKey,
      hasWebhookSecret: !!stripeConfig.webhookSecret,
      lastChecked: stripeConfig.lastChecked,
      errorCount: stripeConfig.errors.length,
      errors: stripeConfig.errors
    }
  };
};

/**
 * Initialize Stripe configuration on module load
 */
validateStripeConfig();

export default {
  validateStripeConfig,
  getStripeConfig,
  isStripeConfigured,
  getFrontendStripeConfig,
  getSetupInstructions,
  getHealthReport
};
