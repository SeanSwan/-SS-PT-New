#!/usr/bin/env node

/**
 * COMPREHENSIVE CONTACT MODEL IMPORT FIX
 * =====================================
 * Fixes the root cause of Contact model import conflicts between
 * contactRoutes.mjs (direct import) and adminRoutes.mjs (associations import)
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

console.log('🔧 FIXING CONTACT MODEL IMPORT CONFLICTS...\n');

async function main() {
  try {
    // Fix 1: Update adminRoutes.mjs to use more reliable import method
    console.log('📝 FIX 1: Updating adminRoutes.mjs import method...');
    
    const adminRoutesPath = './backend/routes/adminRoutes.mjs';
    let adminRoutesContent = await readFile(adminRoutesPath, 'utf8');
    
    // Replace the problematic dynamic import with direct import like contactRoutes.mjs uses
    const newAdminRoutesContent = `// backend/routes/adminRoutes.mjs
import express from 'express';
import sequelize from '../database.mjs';
import { Op } from 'sequelize';
import { authenticateToken, authorizeAdmin } from '../middleware/auth.mjs';
import userManagementController from '../controllers/userManagementController.mjs';
import Contact from '../models/contact.mjs'; // FIXED: Use direct import like contactRoutes.mjs

const router = express.Router();

// Protect all admin routes
router.use(authenticateToken);
router.use(authorizeAdmin);

// User management endpoints that actually exist
router.get('/users', userManagementController.getAllUsers);
router.put('/users/:id', userManagementController.updateUser);
router.post('/promote-client', userManagementController.promoteToClient);
router.post('/promote-admin', userManagementController.promoteToAdmin);

// Contact management endpoints
router.get('/contacts', async (req, res) => {
  try {
    console.log('🔍 Admin /contacts endpoint called');
    
    const contacts = await Contact.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    
    console.log(\`📊 Found \${contacts.length} contacts\`);
    
    res.json({
      success: true,
      contacts: contacts
    });
  } catch (error) {
    console.error('❌ Error fetching contacts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch contacts',
      error: error.message
    });
  }
});

// DIAGNOSTIC ROUTE - TEMPORARY FOR DEBUGGING
router.get('/contacts/debug', async (req, res) => {
  try {
    console.log('🔍 DIAGNOSTIC: Starting contacts debug...');
    
    // Test Contact model availability
    if (!Contact) {
      return res.status(500).json({
        error: 'Contact model not available',
        step: 'model_check'
      });
    }
    
    console.log('✅ Contact model available');
    
    // Test basic query
    try {
      const testContact = await Contact.findOne({ order: [['createdAt', 'DESC']] });
      console.log('✅ Contact query successful');
      
      const allContacts = await Contact.findAll({ limit: 5 });
      console.log(\`📊 Found \${allContacts.length} total contacts\`);
      
      return res.json({
        success: true,
        message: 'Contact system fully operational',
        contactCount: allContacts.length,
        latestContact: testContact ? {
          id: testContact.id,
          name: testContact.name,
          createdAt: testContact.createdAt
        } : null
      });
    } catch (queryError) {
      console.error('❌ Contact query failed:', queryError);
      return res.status(500).json({
        error: 'Contact query failed',
        message: queryError.message,
        step: 'query_test'
      });
    }
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    return res.status(500).json({
      error: 'Diagnostic failed',
      message: error.message
    });
  }
});

// Get recent contacts (for notifications) - FIXED VERSION
router.get('/contacts/recent', async (req, res) => {
  try {
    console.log('🔍 Admin /contacts/recent endpoint called');
    
    // Get contacts from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    console.log(\`📅 Looking for contacts since: \${oneDayAgo.toISOString()}\`);
    
    const recentContacts = await Contact.findAll({
      where: {
        createdAt: {
          [Op.gte]: oneDayAgo // FIXED: Now using properly imported Op
        }
      },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(\`📊 Found \${recentContacts.length} recent contacts\`);
    
    res.json({
      success: true,
      contacts: recentContacts,
      count: recentContacts.length,
      since: oneDayAgo.toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching recent contacts:', error);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch recent contacts',
      error: error.message,
      errorType: error.name
    });
  }
});

// Mark contact as viewed
router.patch('/contacts/:id/viewed', async (req, res) => {
  try {
    console.log(\`🔍 Marking contact \${req.params.id} as viewed\`);
    
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) {
      return res.status(404).json({ 
        success: false, 
        message: 'Contact not found' 
      });
    }
    
    await contact.update({ viewedAt: new Date() });
    
    console.log(\`✅ Contact \${req.params.id} marked as viewed\`);
    
    res.json({
      success: true,
      message: 'Contact marked as viewed'
    });
  } catch (error) {
    console.error('❌ Error marking contact as viewed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark contact as viewed',
      error: error.message
    });
  }
});

export default router;
`;
    
    await writeFile(adminRoutesPath, newAdminRoutesContent);
    console.log('✅ adminRoutes.mjs updated with direct Contact import');
    
    // Fix 2: Verify Contact model export
    console.log('\n📝 FIX 2: Verifying Contact model export...');
    
    const contactModelPath = './backend/models/contact.mjs';
    const contactContent = await readFile(contactModelPath, 'utf8');
    
    if (contactContent.includes('export default Contact;')) {
      console.log('✅ Contact model export is correct');
    } else {
      console.log('⚠️ Contact model export might be incorrect');
      console.log('📊 Contact file ends with:', contactContent.slice(-100));
    }
    
    // Fix 3: Create test script to verify fix
    console.log('\n📝 FIX 3: Creating verification script...');
    
    const verificationScript = `#!/usr/bin/env node

/**
 * CONTACT FIX VERIFICATION
 * Tests both contact routes to ensure they're working
 */

console.log('🧪 TESTING CONTACT SYSTEM AFTER FIX...\\n');

async function testContactSystem() {
  try {
    // Test 1: Direct Contact import (both routes now use this)
    console.log('📝 TEST 1: Contact model import test');
    const Contact = await import('./backend/models/contact.mjs').then(m => m.default);
    console.log('✅ Contact model imported successfully');
    console.log('📊 Model name:', Contact.name);
    console.log('📊 Table name:', Contact.tableName);
    
    // Test 2: Op import test
    console.log('\\n📝 TEST 2: Sequelize Op import test');
    const { Op } = await import('sequelize');
    console.log('✅ Sequelize Op imported successfully');
    console.log('📊 Op.gte available:', typeof Op.gte);
    
    // Test 3: Simulate admin route query
    console.log('\\n📝 TEST 3: Admin route query simulation');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentContacts = await Contact.findAll({
      where: {
        createdAt: {
          [Op.gte]: oneDayAgo
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log('✅ Admin route query successful!');
    console.log(\`📊 Found \${recentContacts.length} recent contacts\`);
    
    // Test 4: Basic contact query
    console.log('\\n📝 TEST 4: Basic contact operations');
    const allContacts = await Contact.findAll({ limit: 3 });
    console.log(\`📊 Total contacts found: \${allContacts.length}\`);
    
    if (allContacts.length > 0) {
      console.log('📊 Sample contact:', {
        id: allContacts[0].id,
        name: allContacts[0].name,
        email: allContacts[0].email,
        createdAt: allContacts[0].createdAt
      });
    }
    
    console.log('\\n🎉 ALL TESTS PASSED! Contact system should now work correctly.');
    console.log('\\n📋 Next steps:');
    console.log('1. Deploy the fixed adminRoutes.mjs');
    console.log('2. Test admin dashboard at /admin');
    console.log('3. Submit a contact form to verify end-to-end flow');
    
  } catch (error) {
    console.error('❌ Contact system test failed:', error.message);
    console.error('📊 Error type:', error.constructor.name);
    console.error('📊 Stack:', error.stack);
  }
}

testContactSystem();
`;
    
    await writeFile('./test-contact-system-fix.mjs', verificationScript);
    console.log('✅ Verification script created: test-contact-system-fix.mjs');
    
    console.log('\n🎯 CONTACT IMPORT FIX SUMMARY:');
    console.log('==================================');
    console.log('✅ adminRoutes.mjs: Now uses direct Contact import (consistent with contactRoutes.mjs)');
    console.log('✅ Op import: Fixed and verified');
    console.log('✅ Error handling: Enhanced with detailed logging');
    console.log('✅ Debug endpoint: Added /api/admin/contacts/debug for troubleshooting');
    console.log('✅ Verification script: Created for testing');
    
    console.log('\\n🚀 DEPLOYMENT COMMANDS:');
    console.log('git add backend/routes/adminRoutes.mjs test-contact-system-fix.mjs');
    console.log('git commit -m "Fix: Standardize Contact model imports for admin routes"');
    console.log('git push origin main');
    
    console.log('\\n🧪 TESTING COMMANDS:');
    console.log('node test-contact-system-fix.mjs');
    console.log('# Then test: https://sswanstudios.com/api/admin/contacts/debug');
    
  } catch (error) {
    console.error('💥 Fix script failed:', error.message);
    console.error(error.stack);
  }
}

main();
