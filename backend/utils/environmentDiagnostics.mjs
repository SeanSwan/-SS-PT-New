/**
 * Environment Diagnostics Handler - SwanStudios Payment System
 * ===========================================================
 * Master Prompt v33 Compliance - Comprehensive environment diagnostics
 * 
 * Features:
 * - Public diagnostics endpoint (no authentication required)
 * - Safe environment inspection
 * - Real-time configuration status
 * - Actionable error reporting
 * 
 * Security: NEVER exposes actual secret values, only configuration status
 */

import logger from './logger.mjs';
import { inspectStripeEnvironment, analyzeKeyMatching } from './environmentInspector.mjs';
import { validateStripeConfig, getHealthReport, getConfigurationRecommendations } from './stripeConfig.mjs';
import { isStripeEnabled, checkApiKeys } from './apiKeyChecker.mjs';

/**
 * Comprehensive diagnostics handler for Express routes
 */
export function diagnosticsHandler(req, res) {
  try {
    console.log('\n🚨 DIAGNOSTICS ENDPOINT ACCESSED');
    console.log('================================');
    console.log(`Request from: ${req.ip || 'unknown'}`);
    console.log(`User Agent: ${req.get('User-Agent') || 'unknown'}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    // Run all diagnostic checks
    console.log('\n🔄 Running comprehensive diagnostics...');
    
    // 1. Environment inspection
    const envInspection = inspectStripeEnvironment();
    
    // 2. Key matching analysis
    const keyMatching = analyzeKeyMatching();
    
    // 3. Stripe configuration validation
    const stripeConfig = validateStripeConfig();
    
    // 4. Health report
    const healthReport = getHealthReport();
    
    // 5. Configuration recommendations
    const recommendations = getConfigurationRecommendations();
    
    // 6. API key checker status
    const stripeEnabled = isStripeEnabled();
    
    // Generate overall status
    const criticalIssues = [];
    const warnings = [];
    const successes = [];
    
    // Analyze results
    if (envInspection.summary.missing > 0) {
      criticalIssues.push(`${envInspection.summary.missing} required environment variables missing`);
    }
    
    if (envInspection.summary.formatIssues > 0) {
      criticalIssues.push(`${envInspection.summary.formatIssues} environment variables have format issues`);
    }
    
    if (!keyMatching.matched) {
      criticalIssues.push(`Stripe keys don't match: ${keyMatching.reason}`);
    }
    
    if (!stripeConfig.isConfigured) {
      criticalIssues.push('Stripe configuration is invalid');
    }
    
    if (!stripeEnabled) {
      criticalIssues.push('Stripe is not enabled by API key checker');
    }
    
    if (envInspection.summary.whitespaceIssues > 0) {
      warnings.push(`${envInspection.summary.whitespaceIssues} environment variables have whitespace issues`);
    }
    
    if (stripeConfig.environment === 'test' && process.env.NODE_ENV === 'production') {
      warnings.push('Using test Stripe keys in production environment');
    }
    
    if (criticalIssues.length === 0 && warnings.length === 0) {
      successes.push('All diagnostics passed - payment system should be operational');
    }
    
    // Overall status determination
    const overallStatus = criticalIssues.length > 0 ? 'CRITICAL_ISSUES' : 
                         warnings.length > 0 ? 'WARNINGS' : 'HEALTHY';
    
    // Log summary
    console.log('\n📊 DIAGNOSTIC RESULTS:');
    console.log(`   Overall Status: ${overallStatus}`);
    console.log(`   Critical Issues: ${criticalIssues.length}`);
    console.log(`   Warnings: ${warnings.length}`);
    console.log(`   Successes: ${successes.length}`);
    console.log('================================\n');
    
    // Prepare response
    const diagnosticsResponse = {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        overallStatus,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        uptime: process.uptime(),
        
        // Core diagnostic data
        environmentInspection: envInspection,
        keyMatching,
        stripeConfiguration: stripeConfig,
        healthReport,
        recommendations,
        apiKeyChecker: {
          stripeEnabled,
          lastChecked: new Date().toISOString()
        },
        
        // Summary
        summary: {
          criticalIssues: criticalIssues.length,
          warnings: warnings.length,
          successes: successes.length,
          issues: criticalIssues,
          warningMessages: warnings,
          successMessages: successes
        },
        
        // Next steps
        nextSteps: generateNextSteps(overallStatus, criticalIssues, warnings)
      }
    };
    
    // Set appropriate HTTP status
    const httpStatus = overallStatus === 'CRITICAL_ISSUES' ? 200 : // Still 200 because diagnostics succeeded
                      overallStatus === 'WARNINGS' ? 200 : 200;
    
    res.status(httpStatus).json(diagnosticsResponse);
    
    logger.info(`Diagnostics completed with status: ${overallStatus}`);
    
  } catch (error) {
    console.error('\n💥 DIAGNOSTICS ERROR:', error);
    logger.error('Diagnostics handler error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Diagnostics failed to run',
      error: {
        code: 'DIAGNOSTICS_ERROR',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      fallback: {
        description: 'Manual verification needed',
        steps: [
          'Check that your .env file exists and contains Stripe keys',
          'Verify STRIPE_SECRET_KEY starts with sk_',
          'Verify VITE_STRIPE_PUBLISHABLE_KEY starts with pk_',
          'Ensure both keys are from the same Stripe account',
          'Restart your server after making changes'
        ]
      }
    });
  }
}

/**
 * Generate actionable next steps based on diagnostic results
 */
function generateNextSteps(overallStatus, criticalIssues, warnings) {
  const steps = [];
  
  switch (overallStatus) {
    case 'CRITICAL_ISSUES':
      steps.push({
        priority: 'critical',
        title: 'Fix Critical Configuration Issues',
        description: 'Payment processing will not work until these are resolved',
        actions: [
          'Check your .env file in the backend directory',
          'Ensure all required Stripe environment variables are present',
          'Verify key formats (sk_ for secret, pk_ for publishable)',
          'Confirm keys are from the same Stripe account',
          'Restart your server after making changes'
        ]
      });
      break;
      
    case 'WARNINGS':
      steps.push({
        priority: 'warning',
        title: 'Address Configuration Warnings',
        description: 'Payment may work but has potential issues',
        actions: [
          'Review the warning messages above',
          'Consider the environment recommendations',
          'Test payment functionality thoroughly',
          'Monitor for any payment processing errors'
        ]
      });
      break;
      
    case 'HEALTHY':
      steps.push({
        priority: 'success',
        title: 'Test Payment Functionality',
        description: 'Configuration looks good - verify payment processing',
        actions: [
          'Test creating a payment intent: POST /api/payments/create-payment-intent',
          'Verify the payment form loads correctly',
          'Process a test payment if using test keys',
          'Monitor payment processing logs'
        ]
      });
      break;
  }
  
  // Add monitoring step for all cases
  steps.push({
    priority: 'info',
    title: 'Ongoing Monitoring',
    description: 'Keep track of payment system health',
    actions: [
      'Bookmark this diagnostics endpoint for future use',
      'Set up monitoring for payment processing errors',
      'Regularly check Stripe dashboard for payment status',
      'Monitor application logs for payment-related issues'
    ]
  });
  
  return steps;
}

/**
 * Lightweight status check (faster than full diagnostics)
 */
export function quickStatusCheck() {
  try {
    const stripeEnabled = isStripeEnabled();
    const hasSecretKey = !!process.env.STRIPE_SECRET_KEY;
    const hasPublishableKey = !!process.env.VITE_STRIPE_PUBLISHABLE_KEY;
    
    return {
      timestamp: new Date().toISOString(),
      status: stripeEnabled && hasSecretKey && hasPublishableKey ? 'operational' : 'issues',
      checks: {
        stripeEnabled,
        hasSecretKey,
        hasPublishableKey
      }
    };
  } catch (error) {
    return {
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Express route handler for quick status
 */
export function quickStatusHandler(req, res) {
  try {
    const status = quickStatusCheck();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Status check failed',
      error: {
        code: 'STATUS_CHECK_ERROR',
        details: error.message
      }
    });
  }
}

export default {
  diagnosticsHandler,
  quickStatusCheck,
  quickStatusHandler
};