#!/usr/bin/env node

/**
 * CONTACT SYSTEM CLEANUP SCRIPT
 * =============================
 * Moves old contact-related files to cleanup folder
 */

import { promises as fs } from 'fs';

console.log('🧹 CLEANING UP OLD CONTACT FILES...');
console.log('===================================');

const filesToMove = [
  'CONTACT-DEBUG-DEPLOYMENT.mjs',
  'CRITICAL-CONTACT-FIX.mjs', 
  'fix-contact-import-conflicts.mjs',
  'quick-contact-test.mjs',
  'render-contact-test.mjs',
  'test-contact-endpoint.mjs',
  'test-contact-system-fix.mjs',
  'CONTACT-TEST-GUIDE.md',
  'DEPLOY-CONTACT-FIX.mjs',
  'diagnose-contact-imports.mjs',
  'diagnose-production-contacts.mjs',
  'fix-contact-system.mjs',
  'render-contact-debug.mjs',
  'verify-contact-fix.mjs',
  'check-contacts-table.mjs'
];

async function moveOldFiles() {
  let moved = 0;
  let notFound = 0;
  
  for (const file of filesToMove) {
    try {
      // Check if file exists
      await fs.access(file);
      
      // Move to old_contact_files folder
      await fs.rename(file, `old_contact_files/${file}`);
      console.log(`✅ Moved: ${file}`);
      moved++;
    } catch (error) {
      console.log(`⚠️ Not found: ${file}`);
      notFound++;
    }
  }
  
  console.log('');
  console.log(`📊 Cleanup Summary:`);
  console.log(`• Files moved: ${moved}`);
  console.log(`• Files not found: ${notFound}`);
  console.log(`• Old contact files now in: old_contact_files/`);
  
  // List remaining contact-related files
  console.log('');
  console.log('📁 CURRENT CONTACT FILES (KEPT):');
  console.log('• backend/routes/contactRoutes.mjs (NEW BULLETPROOF)');
  console.log('• backend/routes/adminRoutes.mjs (FIXED)');
  console.log('• backend/models/contact.mjs (UNCHANGED)');
  console.log('• frontend/src/pages/contactpage/ContactForm.tsx (ENHANCED)');
  console.log('• TEST-BULLETPROOF-CONTACT-SYSTEM.mjs (NEW COMPREHENSIVE TEST)');
  console.log('• old_contact_files/ (ALL OLD FILES)');
}

moveOldFiles();
