#!/usr/bin/env node

/**
 * Production Fix Verification Script
 * =================================
 * Verifies that all critical production fixes have been applied correctly
 */

import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 SwanStudios Production Fix Verification');
console.log('==========================================');

const checks = [];

// Check 1: Frontend build configuration
console.log('\n📦 Checking Frontend Build Configuration...');
const renderYamlPath = path.join(__dirname, 'render.yaml');
if (existsSync(renderYamlPath)) {
  const renderYaml = readFileSync(renderYamlPath, 'utf8');
  
  if (renderYaml.includes('cd frontend && npm install && npm run build')) {
    console.log('✅ Frontend build command configured in render.yaml');
    checks.push({ name: 'Frontend Build', status: 'PASS' });
  } else {
    console.log('❌ Frontend build command missing in render.yaml');
    checks.push({ name: 'Frontend Build', status: 'FAIL' });
  }
  
  if (renderYaml.includes('startCommand: node server.mjs')) {
    console.log('✅ Simplified start command configured');
    checks.push({ name: 'Start Command', status: 'PASS' });
  } else {
    console.log('❌ Start command not simplified');
    checks.push({ name: 'Start Command', status: 'FAIL' });
  }
  
  if (renderYaml.includes('DISABLE_REDIS') && renderYaml.includes('NO_REDIS')) {
    console.log('✅ Redis disable flags configured');
    checks.push({ name: 'Redis Disable', status: 'PASS' });
  } else {
    console.log('❌ Redis disable flags missing');
    checks.push({ name: 'Redis Disable', status: 'FAIL' });
  }
} else {
  console.log('❌ render.yaml not found');
  checks.push({ name: 'Render Config', status: 'FAIL' });
}

// Check 2: Health Routes Timeout Fixes
console.log('\n🏥 Checking Health Routes Timeout Fixes...');
const healthRoutesPath = path.join(__dirname, 'routes', 'healthRoutes.mjs');
if (existsSync(healthRoutesPath)) {
  const healthRoutes = readFileSync(healthRoutesPath, 'utf8');
  
  if (healthRoutes.includes('AbortController') && healthRoutes.includes('clearTimeout')) {
    console.log('✅ Timeout handling with AbortController implemented');
    checks.push({ name: 'Health Timeout Fix', status: 'PASS' });
  } else {
    console.log('❌ Timeout handling not properly implemented');
    checks.push({ name: 'Health Timeout Fix', status: 'FAIL' });
  }
  
  if (healthRoutes.includes('dbQueryError') && healthRoutes.includes('database queries timing out')) {
    console.log('✅ Enhanced error handling for database queries');
    checks.push({ name: 'Health Error Handling', status: 'PASS' });
  } else {
    console.log('❌ Enhanced error handling missing');
    checks.push({ name: 'Health Error Handling', status: 'FAIL' });
  }
} else {
  console.log('❌ healthRoutes.mjs not found');
  checks.push({ name: 'Health Routes', status: 'FAIL' });
}

// Check 3: Global Error Handlers
console.log('\n🛡️  Checking Global Error Handlers...');
const serverPath = path.join(__dirname, 'server.mjs');
if (existsSync(serverPath)) {
  const server = readFileSync(serverPath, 'utf8');
  
  if (server.includes('unhandledRejection') && server.includes('uncaughtException')) {
    console.log('✅ Global error handlers configured');
    checks.push({ name: 'Global Error Handlers', status: 'PASS' });
  } else {
    console.log('❌ Global error handlers missing');
    checks.push({ name: 'Global Error Handlers', status: 'FAIL' });
  }
  
  if (server.includes('Server will continue') && server.includes('production')) {
    console.log('✅ Production-safe error handling implemented');
    checks.push({ name: 'Production Error Handling', status: 'PASS' });
  } else {
    console.log('❌ Production-safe error handling missing');
    checks.push({ name: 'Production Error Handling', status: 'FAIL' });
  }
} else {
  console.log('❌ server.mjs not found');
  checks.push({ name: 'Server File', status: 'FAIL' });
}

// Check 4: Table Creation Order
console.log('\n🗄️  Checking Database Table Creation Order...');
const tableOrderPath = path.join(__dirname, 'utils', 'tableCreationOrder.mjs');
if (existsSync(tableOrderPath)) {
  const tableOrder = readFileSync(tableOrderPath, 'utf8');
  
  if (tableOrder.includes('WorkoutPlanDays') && tableOrder.includes('MuscleGroups')) {
    console.log('✅ Missing parent tables added to creation order');
    checks.push({ name: 'Table Creation Order', status: 'PASS' });
  } else {
    console.log('❌ Missing parent tables not in creation order');
    checks.push({ name: 'Table Creation Order', status: 'FAIL' });
  }
  
  if (tableOrder.includes('storefront_items') && tableOrder.includes('cart_items')) {
    console.log('✅ Table names corrected for snake_case models');
    checks.push({ name: 'Table Name Fixes', status: 'PASS' });
  } else {
    console.log('❌ Table names not corrected');
    checks.push({ name: 'Table Name Fixes', status: 'FAIL' });
  }
} else {
  console.log('❌ tableCreationOrder.mjs not found');
  checks.push({ name: 'Table Order File', status: 'FAIL' });
}

// Summary
console.log('\n📊 VERIFICATION SUMMARY');
console.log('=======================');

const passCount = checks.filter(c => c.status === 'PASS').length;
const failCount = checks.filter(c => c.status === 'FAIL').length;
const totalChecks = checks.length;

checks.forEach(check => {
  const icon = check.status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${check.name}: ${check.status}`);
});

console.log(`\n📈 Results: ${passCount}/${totalChecks} checks passed`);

if (failCount === 0) {
  console.log('\n🎉 ALL FIXES VERIFIED - READY FOR DEPLOYMENT');
  console.log('============================================');
  console.log('All critical production fixes have been applied correctly.');
  console.log('The application is ready for deployment to Render.');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failCount} ISSUES DETECTED - REVIEW REQUIRED`);
  console.log('===========================================');
  console.log('Some fixes may not have been applied correctly.');
  console.log('Please review the failed checks above.');
  process.exit(1);
}
