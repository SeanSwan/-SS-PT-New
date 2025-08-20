#!/usr/bin/env node
/**
 * Critical Fixes Verification Script
 * SwanStudios Platform - Post-Fix Validation
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('🔧 SWANSTUDIOS CRITICAL FIXES VERIFICATION');
console.log('==========================================\n');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function checkPassed(message) {
  console.log(`✅ ${message}`);
  checks.passed++;
}

function checkFailed(message) {
  console.log(`❌ ${message}`);
  checks.failed++;
}

function checkWarning(message) {
  console.log(`⚠️  ${message}`);
  checks.warnings++;
}

// Check 1: Verify emergency admin route has been removed
console.log('1. Security Check: Emergency Admin Route Removal');
if (!existsSync('src/routes/admin-route-emergency.tsx')) {
  checkPassed('Emergency admin route file removed');
} else {
  checkFailed('Emergency admin route still exists - SECURITY RISK!');
}

// Check 2: Verify main-routes.tsx uses ProtectedRoute
console.log('\n2. Route Security: ProtectedRoute Implementation');
try {
  const mainRoutes = readFileSync('src/routes/main-routes.tsx', 'utf8');
  if (mainRoutes.includes('AdminRoute')) {
    checkFailed('main-routes.tsx still imports emergency AdminRoute');
  } else {
    checkPassed('main-routes.tsx no longer uses emergency AdminRoute');
  }
  
  if (mainRoutes.includes('requiredRole="admin"')) {
    checkPassed('Admin routes properly protected with requiredRole');
  } else {
    checkFailed('Admin routes missing proper role protection');
  }
} catch (error) {
  checkFailed(`Could not verify main-routes.tsx: ${error.message}`);
}

// Check 3: Verify style guide route added
console.log('\n3. Feature Check: Style Guide Route');
try {
  const mainRoutes = readFileSync('src/routes/main-routes.tsx', 'utf8');
  if (mainRoutes.includes('style-guide')) {
    checkPassed('Style guide route added');
  } else {
    checkFailed('Style guide route missing');
  }
  
  if (mainRoutes.includes('TheAestheticCodex')) {
    checkPassed('TheAestheticCodex component imported');
  } else {
    checkFailed('TheAestheticCodex component not imported');
  }
} catch (error) {
  checkFailed(`Could not verify style guide route: ${error.message}`);
}

// Check 4: Verify DashboardRoutes.tsx imports fixed
console.log('\n4. Import Check: DashboardRoutes.tsx');
try {
  const dashboardRoutes = readFileSync('src/routes/DashboardRoutes.tsx', 'utf8');
  if (dashboardRoutes.includes('./protected-route')) {
    checkPassed('DashboardRoutes.tsx uses correct ProtectedRoute import');
  } else {
    checkFailed('DashboardRoutes.tsx has incorrect import paths');
  }
} catch (error) {
  checkFailed(`Could not verify DashboardRoutes.tsx: ${error.message}`);
}

// Check 5: Verify backup files moved
console.log('\n5. Cleanup Check: Backup Files');
if (!existsSync('src/context/old')) {
  checkPassed('Context backup files cleaned up');
} else {
  const oldFiles = require('fs').readdirSync('src/context/old');
  if (oldFiles.length === 0) {
    checkPassed('Context old directory is empty');
  } else {
    checkWarning(`${oldFiles.length} backup files still in context/old`);
  }
}

// Check 6: Core files exist
console.log('\n6. Core Files Check: Essential Components');
const coreFiles = [
  'src/core/TheAestheticCodex.tsx',
  'src/core/theme.ts',
  'src/core/index.ts',
  'src/routes/protected-route.tsx'
];

coreFiles.forEach(file => {
  if (existsSync(file)) {
    checkPassed(`Core file exists: ${file}`);
  } else {
    checkFailed(`Missing core file: ${file}`);
  }
});

// Final Report
console.log('\n📊 VERIFICATION SUMMARY');
console.log('======================');
console.log(`✅ Passed: ${checks.passed}`);
console.log(`❌ Failed: ${checks.failed}`);
console.log(`⚠️  Warnings: ${checks.warnings}`);

if (checks.failed === 0) {
  console.log('\n🎉 ALL CRITICAL FIXES SUCCESSFULLY APPLIED!');
  console.log('✨ SwanStudios platform is secure and ready for deployment');
  process.exit(0);
} else {
  console.log('\n🚨 CRITICAL ISSUES REMAIN - DO NOT DEPLOY');
  console.log('⛔ Fix all failed checks before proceeding');
  process.exit(1);
}
