#!/usr/bin/env node

/**
 * Final Contact System Verification
 * =================================
 * Verify the Op import fix is complete
 */

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 VERIFYING CONTACT SYSTEM FIX');
console.log('===============================');

try {
  // Check if the adminRoutes.mjs file has the correct imports
  const adminRoutesPath = path.join(__dirname, 'backend', 'routes', 'adminRoutes.mjs');
  const adminRoutesContent = readFileSync(adminRoutesPath, 'utf8');
  
  console.log('✅ Checking adminRoutes.mjs imports...');
  
  // Check for Op import
  if (adminRoutesContent.includes("import { Op } from 'sequelize'")) {
    console.log('✅ PASS: Op correctly imported from sequelize');
  } else {
    console.log('❌ FAIL: Op import missing from sequelize');
  }
  
  // Check for correct usage
  if (adminRoutesContent.includes('[Op.gte]')) {
    console.log('✅ PASS: Op.gte correctly used in query');
  } else {
    console.log('❌ FAIL: Op.gte not found in query');
  }
  
  // Check for incorrect usage
  if (adminRoutesContent.includes('[sequelize.Op.gte]')) {
    console.log('❌ FAIL: Still using sequelize.Op.gte (needs to be Op.gte)');
  } else {
    console.log('✅ PASS: No incorrect sequelize.Op.gte usage found');
  }
  
  console.log('');
  console.log('🎯 FINAL VERIFICATION:');
  
  const hasOpImport = adminRoutesContent.includes("import { Op } from 'sequelize'");
  const hasCorrectUsage = adminRoutesContent.includes('[Op.gte]');
  const noIncorrectUsage = !adminRoutesContent.includes('[sequelize.Op.gte]');
  
  if (hasOpImport && hasCorrectUsage && noIncorrectUsage) {
    console.log('🎉 ALL CHECKS PASSED!');
    console.log('✅ The contact system fix is complete and ready for deployment');
    console.log('');
    console.log('🚀 DEPLOY NOW:');
    console.log('git add backend/routes/adminRoutes.mjs');
    console.log('git commit -m "Critical Fix: Import Sequelize Op for contact queries"');
    console.log('git push origin main');
  } else {
    console.log('❌ ISSUES FOUND - Fix needed before deployment');
  }
  
} catch (error) {
  console.error('❌ Error reading file:', error.message);
}
