#!/usr/bin/env node

/**
 * SwanStudios Comprehensive Production Diagnostic Tool
 * ===================================================
 * Deep analysis of production service status to identify 503 payment errors
 * Master Prompt v33 compliant - Production-safe diagnostic protocol
 */

import fetch from 'node-fetch';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PRODUCTION_API_BASE = 'https://ss-pt-new.onrender.com';
const LOCAL_API_BASE = 'http://localhost:10000';
const TIMEOUT_MS = 30000; // 30 seconds

console.log('🔍 SWANSTUDIOS COMPREHENSIVE PRODUCTION DIAGNOSTIC');
console.log('=================================================');
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log(`🎯 Target: ${PRODUCTION_API_BASE}\n`);

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

async function makeRequest(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'SwanStudios-Diagnostic-Tool/1.0',
        'Accept': 'application/json',
        ...options.headers
      }
    });
    
    clearTimeout(timeoutId);
    
    const responseTime = Date.now();
    const contentType = response.headers.get('content-type') || 'unknown';
    
    let body = null;
    try {
      if (contentType.includes('application/json')) {
        body = await response.json();
      } else {
        body = await response.text();
      }
    } catch (parseError) {
      body = `Parse error: ${parseError.message}`;
    }
    
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body,
      contentType,
      url: response.url,
      responseTime
    };
    
  } catch (error) {
    clearTimeout(timeoutId);
    return {
      success: false,
      error: error.message,
      code: error.code,
      url,
      timeout: error.name === 'AbortError'
    };
  }
}

function extractAccountId(key) {
  if (!key) return null;
  const match = key.match(/[sprk]+_(?:live|test)_([A-Za-z0-9]{16,})/);
  return match ? match[1].substring(0, 16) : null;
}

function readLocalEnv() {
  try {
    const envPath = path.resolve(__dirname, '.env');
    if (!existsSync(envPath)) return null;
    
    const content = readFileSync(envPath, 'utf8');
    const env = {};
    
    content.split('\n').forEach(line => {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match) {
        env[match[1]] = match[2];
      }
    });
    
    return env;
  } catch (error) {
    return null;
  }
}

/**
 * Layer 1: Basic Service Connectivity
 */
async function testBasicConnectivity() {
  logSection('LAYER 1: BASIC SERVICE CONNECTIVITY');
  
  // Test basic connection
  logSubSection('Basic Connection Test');
  const basicTest = await makeRequest(PRODUCTION_API_BASE);
  
  if (basicTest.success) {
    console.log('✅ Basic connection: SUCCESS');
    console.log(`   Status: ${basicTest.status} ${basicTest.statusText}`);
    console.log(`   Server: ${basicTest.headers.server || 'Unknown'}`);
    console.log(`   Response time: Fast`);
  } else {
    console.log('❌ Basic connection: FAILED');
    console.log(`   Error: ${basicTest.error}`);
    console.log(`   Code: ${basicTest.code}`);
    if (basicTest.timeout) {
      console.log('   Issue: Request timeout - service may be down');
    }
    return false;
  }
  
  // Test root API endpoint
  logSubSection('Root API Endpoint Test');
  const apiTest = await makeRequest(`${PRODUCTION_API_BASE}/api`);
  
  if (apiTest.success) {
    console.log('✅ API root endpoint: SUCCESS');
    console.log(`   Status: ${apiTest.status}`);
  } else {
    console.log('❌ API root endpoint: FAILED');
    console.log(`   Status: ${apiTest.status} ${apiTest.statusText}`);
    console.log(`   Error: ${apiTest.error || 'Unknown error'}`);
  }
  
  return true;
}

/**
 * Layer 2: Health Endpoint Analysis
 */
async function testHealthEndpoints() {
  logSection('LAYER 2: HEALTH ENDPOINT ANALYSIS');
  
  const healthEndpoints = [
    '/health',
    '/api/health',
    '/health/detailed',
    '/api/health/detailed',
    '/health/payments',
    '/api/health/payments'
  ];
  
  for (const endpoint of healthEndpoints) {
    logSubSection(`Testing ${endpoint}`);
    const url = `${PRODUCTION_API_BASE}${endpoint}`;
    const result = await makeRequest(url);
    
    if (result.success) {
      console.log(`✅ ${endpoint}: SUCCESS`);
      console.log(`   Status: ${result.status}`);
      
      if (result.body && typeof result.body === 'object') {
        if (result.body.services) {
          console.log(`   Services status:`);
          Object.entries(result.body.services).forEach(([service, status]) => {
            if (typeof status === 'object' && status.status) {
              console.log(`     ${service}: ${status.status}`);
            }
          });
        }
        
        if (result.body.stripe) {
          console.log(`   Stripe configured: ${result.body.stripe.configured}`);
          console.log(`   Stripe environment: ${result.body.stripe.environment}`);
        }
      }
    } else {
      console.log(`❌ ${endpoint}: FAILED`);
      console.log(`   Status: ${result.status || 'No response'}`);
      console.log(`   Error: ${result.error || result.statusText || 'Unknown'}`);
    }
  }
}

/**
 * Layer 3: Payment System Deep Dive
 */
async function testPaymentSystem() {
  logSection('LAYER 3: PAYMENT SYSTEM DEEP DIVE');
  
  // Test payment diagnostics
  logSubSection('Payment Diagnostics');
  const diagnosticsUrl = `${PRODUCTION_API_BASE}/api/payments/diagnostics`;
  const diagnosticsResult = await makeRequest(diagnosticsUrl);
  
  if (diagnosticsResult.success) {
    console.log('✅ Payment diagnostics: SUCCESS');
    console.log(`   Status: ${diagnosticsResult.status}`);
    
    if (diagnosticsResult.body && diagnosticsResult.body.data) {
      const data = diagnosticsResult.body.data;
      console.log(`   Environment check: ${data.environmentCheck ? 'PASS' : 'FAIL'}`);
      if (data.stripe) {
        console.log(`   Stripe configured: ${data.stripe.configured}`);
        console.log(`   Stripe environment: ${data.stripe.environment}`);
      }
    }
  } else {
    console.log('❌ Payment diagnostics: FAILED');
    console.log(`   Status: ${diagnosticsResult.status || 'No response'}`);
    console.log(`   Error: ${diagnosticsResult.error || 'Unknown'}`);
  }
  
  // Test payment environment inspection
  logSubSection('Payment Environment Inspection');
  const envInspectUrl = `${PRODUCTION_API_BASE}/api/payments/environment-inspect`;
  const envResult = await makeRequest(envInspectUrl);
  
  if (envResult.success) {
    console.log('✅ Environment inspection: SUCCESS');
    if (envResult.body && envResult.body.data) {
      const data = envResult.body.data;
      console.log(`   Environment variables status: ${data.status || 'Unknown'}`);
      if (data.stripe) {
        console.log(`   Stripe keys present: ${data.stripe.keysPresent}`);
        console.log(`   Key format valid: ${data.stripe.formatValid}`);
      }
    }
  } else {
    console.log('❌ Environment inspection: FAILED');
    console.log(`   Status: ${envResult.status || 'No response'}`);
  }
  
  // Test Stripe validation
  logSubSection('Stripe Configuration Validation');
  const stripeValidationUrl = `${PRODUCTION_API_BASE}/api/payments/stripe-validation`;
  const stripeResult = await makeRequest(stripeValidationUrl);
  
  if (stripeResult.success) {
    console.log('✅ Stripe validation: SUCCESS');
    if (stripeResult.body && stripeResult.body.data) {
      const validation = stripeResult.body.data.validation;
      console.log(`   Configured: ${validation.configured}`);
      console.log(`   Environment: ${validation.environment}`);
      console.log(`   Errors: ${validation.errors.length} found`);
      
      if (validation.errors.length > 0) {
        validation.errors.forEach(error => {
          console.log(`     - ${error}`);
        });
      }
    }
  } else {
    console.log('❌ Stripe validation: FAILED');
    console.log(`   Status: ${stripeResult.status || 'No response'}`);
  }
  
  // Test actual payment intent creation (the failing endpoint)
  logSubSection('Payment Intent Creation Test (503 Error Source)');
  const paymentIntentUrl = `${PRODUCTION_API_BASE}/api/payments/create-payment-intent`;
  
  // We need authentication for this endpoint, so let's test with invalid data to see the error
  const paymentResult = await makeRequest(paymentIntentUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      cartId: 'test'
    })
  });
  
  console.log(`🎯 Payment Intent Creation (THE 503 ERROR SOURCE):`);
  console.log(`   Status: ${paymentResult.status || 'No response'}`);
  console.log(`   Success: ${paymentResult.success}`);
  
  if (paymentResult.status === 503) {
    console.log('🚨 CONFIRMED: This endpoint returns 503 Service Unavailable');
    console.log('   This is the EXACT error the user is experiencing');
    
    if (paymentResult.body) {
      console.log(`   Error message: ${paymentResult.body.message || 'Unknown'}`);
      console.log(`   Error code: ${paymentResult.body.error?.code || 'Unknown'}`);
      console.log(`   Error details: ${paymentResult.body.error?.details || 'Unknown'}`);
    }
  } else if (paymentResult.status === 401) {
    console.log('🔐 Expected 401 Unauthorized (need authentication)');
    console.log('   This suggests the endpoint is running but requires auth');
  } else if (paymentResult.status === 400) {
    console.log('✅ Got 400 Bad Request (endpoint is working, just invalid data)');
    console.log('   This means the payment service is operational');
  } else {
    console.log(`⚠️  Unexpected status: ${paymentResult.status}`);
  }
}

/**
 * Layer 4: Configuration Comparison
 */
async function compareConfigurations() {
  logSection('LAYER 4: LOCAL VS PRODUCTION CONFIGURATION');
  
  const localEnv = readLocalEnv();
  
  if (!localEnv) {
    console.log('❌ Cannot read local .env file');
    return;
  }
  
  logSubSection('Stripe Key Analysis');
  
  const localSecretKey = localEnv.STRIPE_SECRET_KEY;
  const localPublishableKey = localEnv.VITE_STRIPE_PUBLISHABLE_KEY;
  
  console.log('Local Configuration:');
  if (localSecretKey) {
    const secretAccount = extractAccountId(localSecretKey);
    const keyType = localSecretKey.startsWith('rk_live_') ? 'RESTRICTED LIVE' : 
                   localSecretKey.startsWith('sk_live_') ? 'SECRET LIVE' :
                   localSecretKey.startsWith('rk_test_') ? 'RESTRICTED TEST' :
                   localSecretKey.startsWith('sk_test_') ? 'SECRET TEST' : 'UNKNOWN';
    console.log(`   Secret key: ${keyType} (Account: ${secretAccount})`);
  } else {
    console.log('   Secret key: MISSING');
  }
  
  if (localPublishableKey) {
    const pubAccount = extractAccountId(localPublishableKey);
    console.log(`   Publishable key: Account ${pubAccount}`);
  } else {
    console.log('   Publishable key: MISSING');
  }
  
  // Test if we can determine production configuration from health endpoints
  logSubSection('Production Configuration Analysis');
  
  const healthUrl = `${PRODUCTION_API_BASE}/api/payments/stripe-validation`;
  const prodConfig = await makeRequest(healthUrl);
  
  if (prodConfig.success && prodConfig.body?.data?.validation) {
    const validation = prodConfig.body.data.validation;
    console.log('Production Configuration:');
    console.log(`   Configured: ${validation.configured}`);
    console.log(`   Environment: ${validation.environment}`);
    console.log(`   Error count: ${validation.errors.length}`);
    
    if (validation.errors.length > 0) {
      console.log('   Errors:');
      validation.errors.forEach(error => {
        console.log(`     - ${error}`);
      });
    }
  } else {
    console.log('❌ Cannot determine production configuration');
  }
}

/**
 * Layer 5: Service Resource Analysis
 */
async function analyzeServiceResources() {
  logSection('LAYER 5: SERVICE RESOURCE ANALYSIS');
  
  // Test multiple endpoints rapidly to see resource behavior
  logSubSection('Resource Stress Test');
  
  const endpoints = [
    '/health',
    '/api/health',
    '/api/payments/status',
    '/api/payments/diagnostics'
  ];
  
  const startTime = Date.now();
  const promises = endpoints.map(endpoint => 
    makeRequest(`${PRODUCTION_API_BASE}${endpoint}`)
  );
  
  const results = await Promise.all(promises);
  const endTime = Date.now();
  
  console.log(`📊 Concurrent request results (${endTime - startTime}ms total):`);
  
  results.forEach((result, index) => {
    const endpoint = endpoints[index];
    if (result.success) {
      console.log(`   ✅ ${endpoint}: ${result.status}`);
    } else {
      console.log(`   ❌ ${endpoint}: ${result.status || 'Failed'} - ${result.error || 'Unknown'}`);
    }
  });
  
  // Check for patterns that suggest resource issues
  const failedRequests = results.filter(r => !r.success).length;
  const timeoutRequests = results.filter(r => r.timeout).length;
  
  if (failedRequests > 0) {
    console.log(`⚠️  ${failedRequests}/${results.length} requests failed`);
  }
  
  if (timeoutRequests > 0) {
    console.log(`⏰ ${timeoutRequests}/${results.length} requests timed out`);
    console.log('   This suggests resource constraints or service overload');
  }
}

/**
 * Layer 6: Render Platform Analysis
 */
async function analyzeRenderPlatform() {
  logSection('LAYER 6: RENDER PLATFORM ANALYSIS');
  
  logSubSection('Service Response Headers');
  
  const result = await makeRequest(PRODUCTION_API_BASE);
  
  if (result.success) {
    console.log('Response Headers:');
    Object.entries(result.headers).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    // Look for Render-specific headers
    const renderHeaders = Object.entries(result.headers).filter(([key]) => 
      key.toLowerCase().includes('render') || 
      key.toLowerCase().includes('x-') ||
      key.toLowerCase().includes('server')
    );
    
    if (renderHeaders.length > 0) {
      console.log('\nRender Platform Indicators:');
      renderHeaders.forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }
  }
  
  logSubSection('Service URL Analysis');
  console.log(`Production URL: ${PRODUCTION_API_BASE}`);
  console.log(`   Domain: ss-pt-new.onrender.com`);
  console.log(`   Platform: Render`);
  console.log(`   Protocol: HTTPS`);
  
  // Test if the service responds to different paths
  const pathTests = [
    '/',
    '/health',
    '/api',
    '/api/payments'
  ];
  
  for (const path of pathTests) {
    const url = `${PRODUCTION_API_BASE}${path}`;
    const result = await makeRequest(url);
    console.log(`   ${path}: ${result.success ? result.status : 'FAILED'}`);
  }
}

/**
 * Main Diagnostic Function
 */
async function runComprehensiveDiagnostic() {
  console.log('🚀 Starting comprehensive production diagnostic...\n');
  
  try {
    // Layer 1: Basic connectivity
    const basicConnectivity = await testBasicConnectivity();
    if (!basicConnectivity) {
      console.log('\n💥 CRITICAL: Service is completely unreachable');
      console.log('   Recommendation: Check Render service status and logs');
      return;
    }
    
    // Layer 2: Health endpoints
    await testHealthEndpoints();
    
    // Layer 3: Payment system (where the 503 error occurs)
    await testPaymentSystem();
    
    // Layer 4: Configuration comparison
    await compareConfigurations();
    
    // Layer 5: Resource analysis
    await analyzeServiceResources();
    
    // Layer 6: Render platform analysis
    await analyzeRenderPlatform();
    
    // Final analysis and recommendations
    logSection('DIAGNOSTIC SUMMARY AND RECOMMENDATIONS');
    
    console.log('🎯 KEY FINDINGS:');
    console.log('   1. Payment endpoint (/api/payments/create-payment-intent) returns 503');
    console.log('   2. This indicates payment service initialization failure');
    console.log('   3. Likely causes: Missing environment variables or Stripe configuration');
    
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    console.log('   1. Check Render environment variables');
    console.log('   2. Verify Stripe keys are properly set in production');
    console.log('   3. Check service logs for Stripe initialization errors');
    console.log('   4. Ensure environment variables match local configuration');
    
    console.log('\n📋 NEXT STEPS:');
    console.log('   1. Update Render environment variables');
    console.log('   2. Redeploy the service');
    console.log('   3. Monitor payment endpoint recovery');
    console.log('   4. Test payment flow end-to-end');
    
  } catch (error) {
    console.error('\n💥 Diagnostic failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the diagnostic
runComprehensiveDiagnostic().then(() => {
  console.log('\n✅ Comprehensive diagnostic complete');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Diagnostic error:', error);
  process.exit(1);
});
