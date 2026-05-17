#!/usr/bin/env node

/**
 * Payment System Test & Diagnostic Script
 * ======================================
 * Master Prompt v33 Compliance - Comprehensive payment system testing
 * 
 * This script tests:
 * 1. Backend diagnostic utilities
 * 2. Environment variable configuration
 * 3. Stripe configuration validation
 * 4. API endpoint functionality
 * 5. Payment processing readiness
 * 
 * Usage: node test-payment-system.mjs
 */

import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables the same way as server.mjs
const projectRootDir = path.resolve(__dirname, '..');
const envPath = path.resolve(projectRootDir, '.env');

if (existsSync(envPath)) {
  console.log(`[Test] Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`[Test] Warning: .env file not found at ${envPath}. Using system environment variables.`);
  dotenv.config();
}

console.log('\n🧪 SWANSTUDIOS PAYMENT SYSTEM COMPREHENSIVE TEST');
console.log('================================================');
console.log(`Environment file: ${envPath}`);
console.log(`Environment exists: ${existsSync(envPath)}`);

// Quick environment check
const stripeSecretExists = !!process.env.STRIPE_SECRET_KEY;
const stripeWebhookExists = !!process.env.STRIPE_WEBHOOK_SECRET;
const stripePublishableExists = !!process.env.VITE_STRIPE_PUBLISHABLE_KEY;

console.log('\n🔍 Quick Environment Check:');
console.log(`   STRIPE_SECRET_KEY: ${stripeSecretExists ? 'Found' : 'Missing'}`);
console.log(`   STRIPE_WEBHOOK_SECRET: ${stripeWebhookExists ? 'Found' : 'Missing'}`);
console.log(`   VITE_STRIPE_PUBLISHABLE_KEY: ${stripePublishableExists ? 'Found' : 'Missing'}`);

if (!stripeSecretExists || !stripeWebhookExists || !stripePublishableExists) {
  console.log('\n❌ CRITICAL: Environment variables not loaded properly!');
  console.log('Please check:');
  console.log('1. .env file exists in project root');
  console.log('2. .env file contains the required Stripe variables');
  console.log('3. No syntax errors in .env file');
  process.exit(1);
}

async function runPaymentSystemTests() {
  let allTestsPassed = true;
  const results = {
    environmentInspection: null,
    stripeConfiguration: null,
    apiKeyChecker: null,
    diagnosticsEndpoint: null,
    paymentSystemReadiness: null
  };

  try {
    console.log('\n🔍 TEST 1: Environment Variable Inspection');
    console.log('==========================================');
    
    const { inspectStripeEnvironment } = await import('./utils/environmentInspector.mjs');
    results.environmentInspection = inspectStripeEnvironment();
    
    if (results.environmentInspection.summary.missing > 0 || 
        results.environmentInspection.summary.formatIssues > 0) {
      console.log('❌ Environment inspection found issues');
      allTestsPassed = false;
    } else {
      console.log('✅ Environment inspection passed');
    }

  } catch (error) {
    console.log('❌ Environment inspection failed:', error.message);
    allTestsPassed = false;
  }

  try {
    console.log('\n🔧 TEST 2: Stripe Configuration Validation');
    console.log('==========================================');
    
    const { validateStripeConfig } = await import('./utils/stripeConfig.mjs');
    results.stripeConfiguration = validateStripeConfig();
    
    if (!results.stripeConfiguration.isConfigured) {
      console.log('❌ Stripe configuration validation failed');
      allTestsPassed = false;
    } else {
      console.log('✅ Stripe configuration validation passed');
    }

  } catch (error) {
    console.log('❌ Stripe configuration validation failed:', error.message);
    allTestsPassed = false;
  }

  try {
    console.log('\n🔑 TEST 3: API Key Checker');
    console.log('==========================');
    
    const { checkApiKeys, isStripeEnabled } = await import('./utils/apiKeyChecker.mjs');
    checkApiKeys();
    const stripeEnabled = isStripeEnabled();
    results.apiKeyChecker = { stripeEnabled };
    
    if (!stripeEnabled) {
      console.log('❌ API key checker reports Stripe not enabled');
      allTestsPassed = false;
    } else {
      console.log('✅ API key checker passed');
    }

  } catch (error) {
    console.log('❌ API key checker failed:', error.message);
    allTestsPassed = false;
  }

  try {
    console.log('\n🌐 TEST 4: Diagnostics Endpoint Simulation');
    console.log('==========================================');
    
    const { diagnosticsHandler } = await import('./utils/environmentDiagnostics.mjs');
    
    // Simulate an Express request/response
    const mockReq = { ip: '127.0.0.1', get: () => 'test-script' };
    let mockResData = null;
    let mockResStatus = 200;
    
    const mockRes = {
      json: (data) => { mockResData = data; },
      status: (code) => { mockResStatus = code; return mockRes; }
    };
    
    await diagnosticsHandler(mockReq, mockRes);
    results.diagnosticsEndpoint = { status: mockResStatus, data: mockResData };
    
    if (mockResStatus !== 200 || !mockResData.success) {
      console.log('❌ Diagnostics endpoint test failed');
      allTestsPassed = false;
    } else {
      console.log('✅ Diagnostics endpoint test passed');
    }

  } catch (error) {
    console.log('❌ Diagnostics endpoint test failed:', error.message);
    allTestsPassed = false;
  }

  try {
    console.log('\n🚀 TEST 5: Payment System Readiness Check');
    console.log('=========================================');
    
    const { isStripeReady } = await import('./utils/stripeConfig.mjs');
    const ready = isStripeReady();
    results.paymentSystemReadiness = { ready };
    
    if (!ready) {
      console.log('❌ Payment system not ready');
      allTestsPassed = false;
    } else {
      console.log('✅ Payment system ready');
    }

  } catch (error) {
    console.log('❌ Payment system readiness check failed:', error.message);
    allTestsPassed = false;
  }

  // Summary Report
  console.log('\n📊 COMPREHENSIVE TEST RESULTS');
  console.log('=============================');
  
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! Payment system is operational');
    console.log('\n✅ Next Steps:');
    console.log('   1. Start your frontend development server');
    console.log('   2. Test the payment component in the browser');
    console.log('   3. Run frontend diagnostics: SwanStripeDiagnostics.runDiagnostics()');
    console.log('   4. Process a test payment if using test keys');
  } else {
    console.log('🚨 SOME TESTS FAILED! Review the issues above');
    console.log('\n❌ Required Actions:');
    
    if (results.environmentInspection?.summary.missing > 0) {
      console.log('   - Fix missing environment variables in .env file');
    }
    
    if (results.environmentInspection?.summary.formatIssues > 0) {
      console.log('   - Fix environment variable format issues');
    }
    
    if (!results.stripeConfiguration?.isConfigured) {
      console.log('   - Fix Stripe configuration errors');
    }
    
    if (!results.apiKeyChecker?.stripeEnabled) {
      console.log('   - Enable Stripe in API key configuration');
    }
    
    if (!results.paymentSystemReadiness?.ready) {
      console.log('   - Address payment system readiness issues');
    }
    
    console.log('\n🔧 Debug Commands:');
    console.log('   - Backend: node stripe-diagnostic.mjs');
    console.log('   - Frontend: SwanStripeDiagnostics.runDiagnostics()');
    console.log('   - API Test: GET /api/payments/diagnostics');
  }

  // Export detailed results
  console.log('\n💾 Test Results Summary:');
  console.log(`   - Environment Issues: ${results.environmentInspection?.summary.missing || 0} missing, ${results.environmentInspection?.summary.formatIssues || 0} format errors`);
  console.log(`   - Stripe Configured: ${results.stripeConfiguration?.isConfigured ? 'Yes' : 'No'}`);
  console.log(`   - Stripe Environment: ${results.stripeConfiguration?.environment || 'Unknown'}`);
  console.log(`   - API Keys Enabled: ${results.apiKeyChecker?.stripeEnabled ? 'Yes' : 'No'}`);
  console.log(`   - System Ready: ${results.paymentSystemReadiness?.ready ? 'Yes' : 'No'}`);
  console.log(`   - Overall Status: ${allTestsPassed ? 'OPERATIONAL' : 'NEEDS ATTENTION'}`);

  return {
    success: allTestsPassed,
    results,
    summary: {
      environmentIssues: (results.environmentInspection?.summary.missing || 0) + (results.environmentInspection?.summary.formatIssues || 0),
      stripeConfigured: results.stripeConfiguration?.isConfigured || false,
      stripeEnvironment: results.stripeConfiguration?.environment || 'Unknown',
      apiKeysEnabled: results.apiKeyChecker?.stripeEnabled || false,
      systemReady: results.paymentSystemReadiness?.ready || false,
      overallStatus: allTestsPassed ? 'OPERATIONAL' : 'NEEDS_ATTENTION'
    }
  };
}

// Run the comprehensive test
runPaymentSystemTests()
  .then((testResults) => {
    console.log('\n✅ Payment system test completed!');
    console.log(`Final Status: ${testResults.summary.overallStatus}`);
    process.exit(testResults.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n💥 Test script failed:', error);
    process.exit(1);
  });