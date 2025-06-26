/**
 * environmentDiagnostics.mjs
 * ==========================
 * Backend environment diagnostics for payment issues
 * 
 * Master Prompt v28.6 Compliance:
 * ✅ Single Responsibility: Only diagnoses environment configuration
 * ✅ Production-Ready: Safe for production use (no secret exposure)
 * ✅ Modular Design: Independent diagnostic utility
 */

import { isStripeConfigured, getStripeConfig, getSetupInstructions } from '../utils/stripeConfig.mjs';
import logger from '../utils/logger.mjs';

/**
 * Perform comprehensive environment diagnostics
 */
export const performEnvironmentDiagnostics = () => {
  console.log('\n🔍 SWANSTUDIOS ENVIRONMENT DIAGNOSTICS');
  console.log('=====================================');
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    stripe: {},
    database: {},
    server: {},
    recommendations: []
  };
  
  // Stripe Configuration
  console.log('\n💳 STRIPE CONFIGURATION:');
  const stripeConfig = getStripeConfig();
  diagnostics.stripe = {
    configured: stripeConfig.isConfigured,
    environment: stripeConfig.environment,
    hasSecretKey: !!stripeConfig.secretKey,
    hasPublishableKey: !!stripeConfig.publishableKey,
    hasWebhookSecret: !!stripeConfig.webhookSecret,
    errors: stripeConfig.errors
  };
  
  if (stripeConfig.isConfigured) {
    console.log('  ✅ Stripe is properly configured');
    console.log(`  📍 Environment: ${stripeConfig.environment}`);
  } else {
    console.log('  ❌ Stripe configuration issues detected:');
    stripeConfig.errors.forEach(error => {
      console.log(`    • ${error}`);
    });
    diagnostics.recommendations.push('Fix Stripe configuration (see setup instructions below)');
  }
  
  // Database Configuration
  console.log('\n🗄️  DATABASE CONFIGURATION:');
  const hasPostgres = !!process.env.DATABASE_URL || (!!process.env.PG_HOST && !!process.env.PG_DB);
  const hasMongo = !!process.env.MONGODB_URI;
  
  diagnostics.database = {
    postgres: hasPostgres,
    mongodb: hasMongo,
    databaseUrl: !!process.env.DATABASE_URL,
    localPostgres: !!(process.env.PG_HOST && process.env.PG_DB)
  };
  
  if (hasPostgres) {
    console.log('  ✅ PostgreSQL configuration detected');
  } else {
    console.log('  ⚠️  PostgreSQL configuration missing');
    diagnostics.recommendations.push('Configure PostgreSQL database connection');
  }
  
  if (hasMongo) {
    console.log('  ✅ MongoDB configuration detected');
  } else {
    console.log('  ⚠️  MongoDB configuration missing');
  }
  
  // Server Configuration
  console.log('\n🖥️  SERVER CONFIGURATION:');
  const hasJwtSecret = !!process.env.JWT_SECRET;
  const hasPort = !!process.env.PORT;
  const hasNodeEnv = !!process.env.NODE_ENV;
  
  diagnostics.server = {
    jwtSecret: hasJwtSecret,
    port: process.env.PORT || '5000',
    nodeEnv: process.env.NODE_ENV || 'development',
    hasEnvFile: process.env.NODE_ENV !== 'production' // Assume .env exists if not production
  };
  
  if (hasJwtSecret) {
    console.log('  ✅ JWT Secret configured');
  } else {
    console.log('  ❌ JWT Secret missing - authentication will fail');
    diagnostics.recommendations.push('Set JWT_SECRET in environment variables');
  }
  
  console.log(`  📍 Port: ${diagnostics.server.port}`);
  console.log(`  📍 Environment: ${diagnostics.server.nodeEnv}`);
  
  // API Keys Status
  console.log('\n🔑 API KEYS STATUS:');
  const apiKeys = {
    stripe: isStripeConfigured(),
    sendgrid: !!process.env.SENDGRID_API_KEY,
    twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  };
  
  Object.entries(apiKeys).forEach(([service, configured]) => {
    if (configured) {
      console.log(`  ✅ ${service.toUpperCase()}: Configured`);
    } else {
      console.log(`  ⚠️  ${service.toUpperCase()}: Not configured`);
    }
  });
  
  // Recommendations
  if (diagnostics.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    diagnostics.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }
  
  // Setup Instructions for Stripe (if needed)
  if (!stripeConfig.isConfigured) {
    console.log('\n📋 STRIPE SETUP INSTRUCTIONS:');
    const instructions = getSetupInstructions();
    instructions.forEach(instruction => {
      console.log(`  ${instruction}`);
    });
  }
  
  // Summary
  console.log('\n📊 DIAGNOSIS SUMMARY:');
  const criticalIssues = diagnostics.recommendations.length;
  if (criticalIssues === 0) {
    console.log('  🎉 All systems appear to be configured correctly!');
  } else {
    console.log(`  ⚠️  ${criticalIssues} configuration issue(s) detected`);
    console.log('  🔧 Please address the recommendations above');
  }
  
  console.log('\n=====================================\n');
  
  return diagnostics;
};

/**
 * Express route handler for diagnostics endpoint
 */
export const diagnosticsHandler = (req, res) => {
  try {
    const diagnostics = performEnvironmentDiagnostics();
    
    // Remove sensitive information for API response
    const safeDiagnostics = {
      ...diagnostics,
      stripe: {
        configured: diagnostics.stripe.configured,
        environment: diagnostics.stripe.environment,
        hasSecretKey: diagnostics.stripe.hasSecretKey,
        hasPublishableKey: diagnostics.stripe.hasPublishableKey,
        hasWebhookSecret: diagnostics.stripe.hasWebhookSecret,
        errorCount: diagnostics.stripe.errors?.length || 0
        // Don't include actual error messages (might contain sensitive info)
      },
      database: diagnostics.database,
      server: {
        port: diagnostics.server.port,
        nodeEnv: diagnostics.server.nodeEnv,
        hasJwtSecret: diagnostics.server.hasJwtSecret
      },
      recommendations: diagnostics.recommendations
    };
    
    res.json({
      success: true,
      data: safeDiagnostics
    });
  } catch (error) {
    logger.error('Error performing diagnostics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform diagnostics',
      error: {
        code: 'DIAGNOSTICS_ERROR',
        details: 'Internal diagnostics error'
      }
    });
  }
};

export default {
  performEnvironmentDiagnostics,
  diagnosticsHandler
};