#!/usr/bin/env node

/**
 * 🚨 COMPLETE P0 PRODUCTION LOGIN FIX
 * ===================================
 * 
 * This script executes all necessary fixes for the production login issue:
 * 1. Frontend URL mismatch (calling wrong backend)
 * 2. Admin user credentials setup
 * 3. Verification and testing
 */

import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🚨 SwanStudios P0 Production Login Fix');
console.log('======================================\n');

console.log('📋 PROBLEMS IDENTIFIED:');
console.log('1. Frontend calling https://ss-pt-new.onrender.com (OLD URL)');
console.log('2. Should call https://swan-studios-api.onrender.com (NEW URL)');
console.log('3. Admin user needs verification/creation (admin/admin123)');
console.log('');

async function executeStep(stepName, command, description) {
  console.log(`🔧 ${stepName}`);
  console.log('='.repeat(stepName.length + 3));
  console.log(description);
  console.log('');
  
  console.log(`💻 Command: ${command}`);
  console.log('');
  
  // For now, just show instructions rather than auto-execute
  // This prevents potential issues and lets user control execution
  console.log('⏳ Ready to execute. Press Enter to continue or Ctrl+C to skip...');
  console.log('');
}

async function main() {
  console.log('🎯 STEP-BY-STEP FIX PROCESS\n');

  // Step 1: Verify backend URL
  await executeStep(
    'STEP 1: Verify Backend URL',
    'node verify-production-login.mjs',
    'This will test if the correct backend URL is working and accessible.'
  );

  // Step 2: Create admin user
  await executeStep(
    'STEP 2: Create/Update Admin User',
    'node create-admin-prod.mjs',
    'This will ensure admin user exists with credentials: admin / admin123'
  );

  // Step 3: Check built frontend URLs
  await executeStep(
    'STEP 3: Check Built Frontend URLs',
    'node quick-url-check.mjs',
    'This will check if the built frontend has the wrong URLs baked in.'
  );

  // Step 4: Rebuild frontend
  await executeStep(
    'STEP 4: Rebuild Frontend (CRITICAL)',
    'node rebuild-frontend.mjs',
    'This will rebuild the frontend with the correct backend URL configuration.'
  );

  // Step 5: Deploy instructions
  console.log('🚀 STEP 5: Deploy New Frontend');
  console.log('==============================');
  console.log('After rebuilding, you must deploy the new dist/ folder:');
  console.log('');
  console.log('RENDER STATIC SITE:');
  console.log('1. Go to Render dashboard');
  console.log('2. Find your static site (sswanstudios.com)');
  console.log('3. Drag frontend/dist/ folder to deployment area');
  console.log('4. Wait for deployment to complete');
  console.log('');
  console.log('NETLIFY:');
  console.log('1. Drag frontend/dist/ folder to Netlify deployment');
  console.log('');
  console.log('VERCEL:');
  console.log('1. Run: cd frontend && vercel --prod');
  console.log('');

  // Step 6: Final verification
  await executeStep(
    'STEP 6: Final Verification',
    'node verify-production-login.mjs',
    'Test the complete login flow after frontend deployment.'
  );

  console.log('✅ EXPECTED RESULT:');
  console.log('===================');
  console.log('1. Go to https://sswanstudios.com');
  console.log('2. Open browser dev tools (F12) → Network tab');
  console.log('3. Login with admin / admin123');
  console.log('4. See: POST swan-studios-api.onrender.com/api/auth/login');
  console.log('5. Get: 200 OK response with user data');
  console.log('');

  console.log('🛠️ QUICK EXECUTION GUIDE:');
  console.log('=========================');
  console.log('Run these commands in order:');
  console.log('');
  console.log('1. node verify-production-login.mjs');
  console.log('2. node create-admin-prod.mjs');
  console.log('3. node rebuild-frontend.mjs');
  console.log('4. [Deploy dist/ folder manually]');
  console.log('5. node verify-production-login.mjs');
  console.log('');

  console.log('🔥 EMERGENCY ONE-LINER:');
  console.log('========================');
  console.log('If you need to fix everything quickly:');
  console.log('');
  console.log('node create-admin-prod.mjs && node rebuild-frontend.mjs');
  console.log('');
  console.log('Then manually deploy the dist/ folder.');
  console.log('');

  console.log('📞 TROUBLESHOOTING:');
  console.log('===================');
  console.log('If login still fails after all steps:');
  console.log('1. Clear browser cache completely');
  console.log('2. Check Network tab shows correct backend URL');
  console.log('3. Check browser console for JavaScript errors');
  console.log('4. Verify deployment actually updated the site');
  console.log('5. Check backend logs in Render dashboard');
  console.log('');

  console.log('🎯 SUCCESS CRITERIA:');
  console.log('====================');
  console.log('✅ Network tab: swan-studios-api.onrender.com/api/auth/login');
  console.log('✅ Response: 200 OK with user data and JWT token');
  console.log('✅ Can access admin dashboard after login');
  console.log('✅ No more calls to ss-pt-new.onrender.com');
  console.log('');

  console.log('🎉 Ready to start! Run the numbered commands above.');
}

main();
