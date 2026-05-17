#!/usr/bin/env node

/**
 * Stripe Configuration Diagnostic Script
 * =====================================
 * Master Prompt v28.6 Compliance - Diagnostic utility for Stripe configuration issues
 * 
 * Usage: node stripe-diagnostic.mjs
 * 
 * This script will:
 * 1. Load environment variables the same way the server does
 * 2. Run comprehensive Stripe configuration diagnostics
 * 3. Test the new environment inspector
 * 4. Provide actionable recommendations
 * 
 * ⚠️ SAFE: No secrets are exposed, only configuration status
 */

import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup paths exactly like server.mjs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRootDir = path.resolve(__dirname, '..');
const envPath = path.resolve(projectRootDir, '.env');

console.log('🔍 SWANSTUDIOS STRIPE DIAGNOSTIC TOOL');
console.log('====================================');
console.log(`📁 Project root: ${projectRootDir}`);
console.log(`🗂️  Looking for .env at: ${envPath}`);

// Load environment variables exactly like the server does
if (existsSync(envPath)) {
  console.log(`✅ .env file found, loading...`);
  dotenv.config({ path: envPath });
} else {
  console.log(`⚠️  .env file not found, using system environment variables`);
  dotenv.config();
}

console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`📊 Total environment variables: ${Object.keys(process.env).length}`);

async function runDiagnostics() {
  try {
    console.log('\\n🚀 STARTING COMPREHENSIVE DIAGNOSTICS\\n');
    
    // 1. Run Environment Inspector
    console.log('1️⃣ RUNNING ENVIRONMENT INSPECTOR:');
    console.log('================================');
    const { inspectStripeEnvironment } = await import('./utils/environmentInspector.mjs');
    const envInspection = inspectStripeEnvironment();
    
    // 2. Run Stripe Configuration Validator
    console.log('\\n2️⃣ RUNNING STRIPE CONFIGURATION VALIDATOR:');
    console.log('==========================================');
    const { validateStripeConfig, getHealthReport } = await import('./utils/stripeConfig.mjs');
    const stripeConfig = validateStripeConfig();
    const healthReport = getHealthReport();
    
    // 3. Test API Key Checker
    console.log('\\n3️⃣ TESTING API KEY CHECKER:');
    console.log('===========================');
    const { isStripeEnabled, checkApiKeys } = await import('./utils/apiKeyChecker.mjs');
    console.log('Running checkApiKeys()...');
    checkApiKeys();
    console.log(`isStripeEnabled() result: ${isStripeEnabled()}`);
    
    // 4. Summary and Recommendations
    console.log('\\n4️⃣ DIAGNOSTIC SUMMARY:');
    console.log('=====================');
    
    const criticalIssues = [];
    const warnings = [];
    const successes = [];
    
    // Environment Inspector Results
    if (envInspection.summary.missing > 0) {
      criticalIssues.push(`Environment Inspector: ${envInspection.summary.missing} missing variables`);
    }
    if (envInspection.summary.formatIssues > 0) {
      criticalIssues.push(`Environment Inspector: ${envInspection.summary.formatIssues} format issues`);
    }
    if (envInspection.summary.existing > 0) {
      successes.push(`Environment Inspector: ${envInspection.summary.existing} variables found`);
    }
    
    // Stripe Config Results
    if (!stripeConfig.isConfigured) {
      criticalIssues.push(`Stripe Config: Not configured (${stripeConfig.errors.length} errors)`);
      stripeConfig.errors.forEach(error => {
        criticalIssues.push(`  - ${error}`);
      });
    } else {
      successes.push('Stripe Config: Properly configured');
    }
    
    // API Key Checker Results  
    if (!isStripeEnabled()) {
      criticalIssues.push('API Key Checker: Stripe not enabled');
    } else {
      successes.push('API Key Checker: Stripe enabled');
    }
    
    // Display Results
    if (successes.length > 0) {
      console.log('\\n✅ SUCCESSES:');
      successes.forEach(success => console.log(`   ✓ ${success}`));
    }
    
    if (warnings.length > 0) {
      console.log('\\n⚠️  WARNINGS:');
      warnings.forEach(warning => console.log(`   ⚠️ ${warning}`));
    }
    
    if (criticalIssues.length > 0) {
      console.log('\\n❌ CRITICAL ISSUES:');
      criticalIssues.forEach(issue => console.log(`   ❌ ${issue}`));
    }
    
    // Overall Status
    console.log('\\n🎯 OVERALL STATUS:');
    if (criticalIssues.length === 0) {
      console.log('   🎉 ALL SYSTEMS OPERATIONAL - Stripe should work!');
    } else {
      console.log(`   🚨 ${criticalIssues.length} CRITICAL ISSUE(S) DETECTED`);
      console.log('   🔧 Payment processing will fail until resolved');
    }
    
    // Next Steps
    console.log('\\n📋 NEXT STEPS:');
    if (criticalIssues.length > 0) {
      console.log('   1. Fix the critical issues listed above');
      console.log('   2. Restart your development server');
      console.log('   3. Run this diagnostic again to verify fixes');
      console.log('   4. Test payment functionality');
    } else {
      console.log('   1. Test the payment endpoints:');
      console.log('      - GET /api/payments/status');
      console.log('      - GET /api/payments/diagnostics');
      console.log('      - GET /api/payments/environment-inspect');
      console.log('      - GET /api/payments/stripe-validation');
      console.log('   2. Try creating a payment intent');
    }
    
    // Export diagnostic data for further analysis
    const diagnosticResults = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      envInspection,
      stripeConfig,
      healthReport,
      isStripeEnabled: isStripeEnabled(),
      summary: {
        criticalIssues: criticalIssues.length,
        warnings: warnings.length,
        successes: successes.length,
        overallStatus: criticalIssues.length === 0 ? 'OPERATIONAL' : 'ISSUES_DETECTED'
      }
    };
    
    console.log('\\n💾 Diagnostic results exported for analysis');
    
    return diagnosticResults;
    
  } catch (error) {
    console.error('\\n💥 DIAGNOSTIC SCRIPT ERROR:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the diagnostics
runDiagnostics()
  .then(() => {
    console.log('\\n✅ Diagnostic complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\\n💥 Fatal error:', error);
    process.exit(1);
  });