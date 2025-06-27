#!/usr/bin/env node
/**
 * Backend URL Verification Script
 * ================================
 * Verifies all configuration files have the correct backend URL
 * Run this before deploying to ensure consistency
 */

import fs from 'fs';
import path from 'path';

// Expected URLs
const EXPECTED_PROD_URL = 'https://swan-studios-api.onrender.com';
const EXPECTED_DEV_URL = 'http://localhost:10000';

// Files to check
const filesToCheck = [
  {
    path: '.env.production',
    patterns: [
      'VITE_API_URL=',
      'VITE_API_BASE_URL=',
      'VITE_BACKEND_URL='
    ]
  },
  {
    path: 'vite.config.js',
    patterns: ['https://']
  },
  {
    path: 'src/services/api.service.ts',
    patterns: ['https://']
  },
  {
    path: 'src/utils/axiosConfig.ts',
    patterns: ['https://']
  },
  {
    path: 'src/hooks/useBackendConnection.jsx',
    patterns: ['https://']
  },
  {
    path: 'public/_redirects',
    patterns: ['/api/*']
  }
];

console.log('🔍 Backend URL Verification Script');
console.log('==================================');
console.log(`✅ Expected Production URL: ${EXPECTED_PROD_URL}`);
console.log(`✅ Expected Development URL: ${EXPECTED_DEV_URL}`);
console.log('');

let hasErrors = false;
let totalChecks = 0;
let passedChecks = 0;

for (const file of filesToCheck) {
  console.log(`📁 Checking: ${file.path}`);
  
  try {
    const content = fs.readFileSync(file.path, 'utf8');
    
    // Check for wrong production URLs
    if (content.includes('ss-pt-new.onrender.com')) {
      console.log(`  ❌ FOUND OLD URL: ss-pt-new.onrender.com`);
      hasErrors = true;
    } else {
      console.log(`  ✅ No old URLs found`);
      passedChecks++;
    }
    
    // Check for correct production URLs
    if (content.includes(EXPECTED_PROD_URL)) {
      console.log(`  ✅ Found correct production URL: ${EXPECTED_PROD_URL}`);
      passedChecks++;
    } else if (file.path.includes('production') || file.path.includes('_redirects')) {
      console.log(`  ⚠️  Warning: Expected to find ${EXPECTED_PROD_URL} in ${file.path}`);
    }
    
    totalChecks += 2;
    
  } catch (error) {
    console.log(`  ❌ Error reading file: ${error.message}`);
    hasErrors = true;
    totalChecks += 2;
  }
  
  console.log('');
}

// Summary
console.log('📊 Verification Summary');
console.log('======================');
console.log(`Total checks: ${totalChecks}`);
console.log(`Passed: ${passedChecks}`);
console.log(`Failed: ${totalChecks - passedChecks}`);

if (hasErrors) {
  console.log('❌ VERIFICATION FAILED - Old backend URLs found!');
  console.log('Please fix the URLs before deploying.');
  process.exit(1);
} else {
  console.log('✅ VERIFICATION PASSED - All backend URLs are correct!');
  console.log('Ready for deployment.');
  process.exit(0);
}
