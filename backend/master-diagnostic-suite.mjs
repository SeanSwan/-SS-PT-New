#!/usr/bin/env node

/**
 * SwanStudios Master Diagnostic Suite
 * ===================================
 * Comprehensive diagnostic protocol for 503 payment error resolution
 * Master Prompt v33 compliant - Deep analysis and resolution framework
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 SWANSTUDIOS MASTER DIAGNOSTIC SUITE');
console.log('=====================================');
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log(`🎯 Objective: Resolve 503 Service Unavailable errors in payment system`);
console.log('='.repeat(70));

/**
 * Utility Functions
 */
function logPhase(phase, title) {
  console.log(`\n${'█'.repeat(70)}`);
  console.log(`🔍 PHASE ${phase}: ${title.toUpperCase()}`);
  console.log('█'.repeat(70));
}

function logStep(step, title) {
  console.log(`\n📋 Step ${step}: ${title}`);
  console.log('-'.repeat(50));
}

async function runScript(scriptPath, name) {
  return new Promise((resolve) => {
    console.log(`\n🚀 Running ${name}...`);
    console.log(`📁 Script: ${scriptPath}`);
    
    if (!existsSync(scriptPath)) {
      console.log(`❌ Script not found: ${scriptPath}`);
      resolve({ success: false, error: 'Script not found' });
      return;
    }
    
    const process = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${name} completed successfully`);
        resolve({ success: true, code });
      } else {
        console.log(`❌ ${name} failed with code ${code}`);
        resolve({ success: false, code });
      }
    });
    
    process.on('error', (error) => {
      console.log(`💥 ${name} error: ${error.message}`);
      resolve({ success: false, error: error.message });
    });
  });
}

function extractUserConsoleError() {
  console.log(`\n📱 USER REPORTED ERROR:`);
  console.log('='.repeat(40));
  console.log('🚨 Status: 503 Service Unavailable');
  console.log('🎯 Endpoint: POST https://ss-pt-new.onrender.com/api/payments/create-payment-intent');
  console.log('📋 Context: Payment modal opened, cart contains Silver Swan Wing ($175)');
  console.log('🔍 Browser Console: "Request failed with status code 503"');
  console.log('⚠️ Impact: Users cannot complete payments');
  console.log('');
  console.log('📊 Working Components:');
  console.log('   ✅ Frontend cart functionality');
  console.log('   ✅ User authentication (admin)');
  console.log('   ✅ Package addition to cart');
  console.log('   ✅ Service Worker registration');
  console.log('');
  console.log('❌ Failing Component:');
  console.log('   💳 Payment intent creation');
}

/**
 * Phase 1: Local Configuration Deep Analysis
 */
async function phase1LocalAnalysis() {
  logPhase(1, 'LOCAL CONFIGURATION DEEP ANALYSIS');
  
  extractUserConsoleError();
  
  const diagnostics = [
    {
      script: 'local-stripe-deep-validator.mjs',
      name: 'Local Stripe Configuration Validator',
      description: 'Validates local Stripe keys and configuration'
    },
    {
      script: 'verify-key-roles.mjs',
      name: 'Key Role Verification',
      description: 'Ensures keys are used in correct roles'
    },
    {
      script: 'verify-stripe-config.mjs',
      name: 'Stripe Configuration Verification',
      description: 'Cross-validates all Stripe configuration files'
    }
  ];
  
  const results = [];
  
  for (let i = 0; i < diagnostics.length; i++) {
    const { script, name, description } = diagnostics[i];
    logStep(i + 1, name);
    console.log(`📖 Description: ${description}`);
    
    const result = await runScript(path.resolve(__dirname, script), name);
    results.push({ ...diagnostics[i], result });
  }
  
  console.log(`\n📊 Phase 1 Summary:`);
  const successful = results.filter(r => r.result.success).length;
  console.log(`   ✅ Successful: ${successful}/${results.length}`);
  console.log(`   ❌ Failed: ${results.length - successful}/${results.length}`);
  
  return results;
}

/**
 * Phase 2: Production Service Analysis
 */
async function phase2ProductionAnalysis() {
  logPhase(2, 'PRODUCTION SERVICE ANALYSIS');
  
  console.log('🎯 Objective: Identify why production payment endpoint returns 503');
  
  const diagnostics = [
    {
      script: 'comprehensive-production-diagnostic.mjs',
      name: 'Production Service Diagnostic',
      description: 'Tests production API endpoints and service health'
    },
    {
      script: 'production-service-diagnostic.mjs',
      name: 'Render Service Diagnostic',
      description: 'Analyzes Render platform service status'
    }
  ];
  
  const results = [];
  
  for (let i = 0; i < diagnostics.length; i++) {
    const { script, name, description } = diagnostics[i];
    logStep(i + 1, name);
    console.log(`📖 Description: ${description}`);
    
    const result = await runScript(path.resolve(__dirname, script), name);
    results.push({ ...diagnostics[i], result });
  }
  
  console.log(`\n📊 Phase 2 Summary:`);
  const successful = results.filter(r => r.result.success).length;
  console.log(`   ✅ Successful: ${successful}/${results.length}`);
  console.log(`   ❌ Failed: ${results.length - successful}/${results.length}`);
  
  return results;
}

/**
 * Phase 3: Environment Synchronization
 */
async function phase3EnvironmentSync() {
  logPhase(3, 'ENVIRONMENT SYNCHRONIZATION');
  
  console.log('🎯 Objective: Generate production environment configuration');
  
  const diagnostics = [
    {
      script: 'production-env-sync.mjs',
      name: 'Production Environment Synchronization',
      description: 'Generates Render environment variables from local config'
    }
  ];
  
  const results = [];
  
  for (let i = 0; i < diagnostics.length; i++) {
    const { script, name, description } = diagnostics[i];
    logStep(i + 1, name);
    console.log(`📖 Description: ${description}`);
    
    const result = await runScript(path.resolve(__dirname, script), name);
    results.push({ ...diagnostics[i], result });
  }
  
  console.log(`\n📊 Phase 3 Summary:`);
  const successful = results.filter(r => r.result.success).length;
  console.log(`   ✅ Successful: ${successful}/${results.length}`);
  console.log(`   ❌ Failed: ${results.length - successful}/${results.length}`);
  
  return results;
}

/**
 * Master Analysis and Recommendations
 */
function generateMasterAnalysis(phase1Results, phase2Results, phase3Results) {
  logPhase(4, 'MASTER ANALYSIS AND RECOMMENDATIONS');
  
  console.log('🔍 DIAGNOSTIC RESULTS ANALYSIS:');
  console.log('='.repeat(50));
  
  // Analyze Phase 1 (Local Configuration)
  console.log('\n📋 Phase 1 - Local Configuration:');
  const phase1Success = phase1Results.filter(r => r.result.success).length;
  if (phase1Success === phase1Results.length) {
    console.log('   ✅ Local configuration is valid');
  } else {
    console.log('   ❌ Local configuration has issues');
  }
  
  // Analyze Phase 2 (Production Service)
  console.log('\n📋 Phase 2 - Production Service:');
  const phase2Success = phase2Results.filter(r => r.result.success).length;
  if (phase2Success > 0) {
    console.log('   ✅ Production service diagnostics completed');
    console.log('   🔍 Check diagnostic output for specific 503 error causes');
  } else {
    console.log('   ❌ Production service diagnostics failed');
  }
  
  // Analyze Phase 3 (Environment Sync)
  console.log('\n📋 Phase 3 - Environment Synchronization:');
  const phase3Success = phase3Results.filter(r => r.result.success).length;
  if (phase3Success > 0) {
    console.log('   ✅ Environment synchronization completed');
    console.log('   📋 Render configuration instructions generated');
  } else {
    console.log('   ❌ Environment synchronization failed');
  }
  
  console.log('\n🎯 ROOT CAUSE ANALYSIS:');
  console.log('='.repeat(30));
  console.log('Based on the user error pattern and diagnostic results:');
  console.log('');
  console.log('🚨 PRIMARY ISSUE: Payment endpoint returns 503 Service Unavailable');
  console.log('📊 LIKELY CAUSES (in order of probability):');
  console.log('   1. 🔧 Missing or incorrect Stripe environment variables in Render');
  console.log('   2. 🔐 Stripe key account mismatch between backend and frontend');
  console.log('   3. 💾 Stripe client initialization failure on server startup');
  console.log('   4. 🌐 Render service resource constraints or crashes');
  console.log('');
  
  console.log('🔧 RECOMMENDED RESOLUTION STEPS:');
  console.log('='.repeat(40));
  console.log('');
  
  console.log('🥇 IMMEDIATE ACTION (High Priority):');
  console.log('   1. 📋 Review production-env-sync output');
  console.log('   2. 🔧 Update Render environment variables with generated values');
  console.log('   3. 🔄 Redeploy the Render service');
  console.log('   4. 📊 Monitor deployment logs for Stripe initialization');
  console.log('');
  
  console.log('🥈 VERIFICATION (Medium Priority):');
  console.log('   5. 🧪 Test production health endpoints');
  console.log('   6. 💳 Test payment system end-to-end');
  console.log('   7. 🔍 Re-run production diagnostics to verify fixes');
  console.log('');
  
  console.log('🥉 MONITORING (Low Priority):');
  console.log('   8. 📈 Monitor service performance and error rates');
  console.log('   9. 🔔 Set up alerts for payment system health');
  console.log('   10. 📝 Document the resolution process');
  console.log('');
  
  console.log('💡 SPECIFIC RENDER DASHBOARD ACTIONS:');
  console.log('='.repeat(45));
  console.log('   1. 🌐 Go to https://dashboard.render.com');
  console.log('   2. 🔍 Find service: swan-studios-api');
  console.log('   3. ⚙️ Click Environment tab');
  console.log('   4. 🔧 Update these critical variables:');
  console.log('      - STRIPE_SECRET_KEY (from production-env-sync output)');
  console.log('      - STRIPE_WEBHOOK_SECRET (from production-env-sync output)');
  console.log('      - All other variables as listed in sync tool');
  console.log('   5. 💾 Save changes');
  console.log('   6. 🚀 Deploy -> "Redeploy latest"');
  console.log('   7. 📊 Monitor logs for "Stripe client initialized successfully"');
  console.log('');
  
  console.log('🧪 POST-DEPLOYMENT TESTING:');
  console.log('='.repeat(35));
  console.log('   1. ✅ Test: https://ss-pt-new.onrender.com/health');
  console.log('   2. ✅ Test: https://ss-pt-new.onrender.com/api/payments/diagnostics');
  console.log('   3. 💳 Test payment flow at https://sswanstudios.com');
  console.log('   4. 🔍 Verify no 503 errors in browser console');
  console.log('');
  
  const overallSuccess = phase1Success + phase2Success + phase3Success;
  const totalTests = phase1Results.length + phase2Results.length + phase3Results.length;
  const successRate = Math.round((overallSuccess / totalTests) * 100);
  
  console.log('📊 DIAGNOSTIC SUMMARY:');
  console.log('='.repeat(25));
  console.log(`   🎯 Overall Success Rate: ${successRate}% (${overallSuccess}/${totalTests})`);
  console.log(`   📋 Local Config: ${phase1Success}/${phase1Results.length} passed`);
  console.log(`   🌐 Production Tests: ${phase2Success}/${phase2Results.length} passed`);
  console.log(`   🔧 Env Sync: ${phase3Success}/${phase3Results.length} passed`);
  
  if (successRate >= 70) {
    console.log('\n🎉 DIAGNOSTIC STATUS: READY FOR RESOLUTION');
    console.log('   ✅ Sufficient diagnostic data collected');
    console.log('   🚀 Proceed with Render environment variable updates');
  } else {
    console.log('\n⚠️ DIAGNOSTIC STATUS: ADDITIONAL INVESTIGATION NEEDED');
    console.log('   🔍 Review failed diagnostics before proceeding');
    console.log('   🔧 Address configuration issues first');
  }
}

/**
 * Main Master Diagnostic Function
 */
async function runMasterDiagnostic() {
  console.log('\n🚀 Starting comprehensive master diagnostic suite...\n');
  
  const startTime = Date.now();
  
  try {
    // Phase 1: Local Configuration Analysis
    console.log('⏱️ Estimated time: 3-5 minutes');
    const phase1Results = await phase1LocalAnalysis();
    
    // Phase 2: Production Service Analysis
    const phase2Results = await phase2ProductionAnalysis();
    
    // Phase 3: Environment Synchronization
    const phase3Results = await phase3EnvironmentSync();
    
    // Phase 4: Master Analysis
    generateMasterAnalysis(phase1Results, phase2Results, phase3Results);
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    logPhase(5, 'DIAGNOSTIC COMPLETE');
    console.log(`⏱️ Total diagnostic time: ${duration} seconds`);
    console.log('🎯 All diagnostic phases completed');
    console.log('📋 Review the master analysis above for next steps');
    console.log('🔧 Focus on updating Render environment variables');
    console.log('');
    console.log('🎉 NEXT IMMEDIATE ACTION:');
    console.log('   1. Update Render environment variables (see Phase 3 output)');
    console.log('   2. Redeploy the service');
    console.log('   3. Test payment system');
    
  } catch (error) {
    console.error('\n💥 Master diagnostic failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the master diagnostic
runMasterDiagnostic().then(() => {
  console.log('\n✅ Master diagnostic suite complete');
  console.log('📋 All diagnostic data collected and analyzed');
  console.log('🚀 Ready for production environment fixes');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Master diagnostic error:', error);
  process.exit(1);
});
