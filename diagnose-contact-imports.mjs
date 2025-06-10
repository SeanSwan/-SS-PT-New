#!/usr/bin/env node

/**
 * CONTACT IMPORT DIAGNOSTIC TOOL
 * Checks exactly why admin routes are failing to import Contact model
 */

console.log('🔍 DIAGNOSING CONTACT MODEL IMPORT ISSUES...\n');

async function main() {
  try {
    // Test 1: Direct Contact import (like contactRoutes.mjs does)
    console.log('📝 TEST 1: Direct Contact import (contactRoutes.mjs method)');
    try {
      const ContactDirect = await import('./backend/models/contact.mjs');
      console.log('✅ Direct import successful');
      console.log('📊 Direct Contact model type:', typeof ContactDirect.default);
      console.log('📊 Direct Contact model name:', ContactDirect.default?.name);
      console.log('📊 Direct Contact tableName:', ContactDirect.default?.tableName);
    } catch (error) {
      console.error('❌ Direct import failed:', error.message);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test 2: Associations import (like adminRoutes.mjs does)
    console.log('📝 TEST 2: Associations import (adminRoutes.mjs method)');
    try {
      const getModels = await import('./backend/models/associations.mjs').then(m => m.default);
      console.log('✅ Associations function imported');
      
      const models = await getModels();
      console.log('✅ Models function executed');
      console.log('📊 Available models:', Object.keys(models));
      
      const { Contact } = models;
      if (Contact) {
        console.log('✅ Contact found in associations');
        console.log('📊 Associations Contact type:', typeof Contact);
        console.log('📊 Associations Contact name:', Contact?.name);
        console.log('📊 Associations Contact tableName:', Contact?.tableName);
      } else {
        console.error('❌ Contact NOT found in associations');
        console.log('📊 Available models:', Object.keys(models));
      }
    } catch (error) {
      console.error('❌ Associations import failed:', error.message);
      console.error('📊 Error stack:', error.stack);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test 3: Check if both imports give same model
    console.log('📝 TEST 3: Compare both import methods');
    try {
      const ContactDirect = await import('./backend/models/contact.mjs');
      const getModels = await import('./backend/models/associations.mjs').then(m => m.default);
      const models = await getModels();
      const { Contact: ContactFromAssoc } = models;
      
      if (ContactDirect.default && ContactFromAssoc) {
        console.log('✅ Both imports successful');
        console.log('📊 Are they the same model?', ContactDirect.default === ContactFromAssoc);
        console.log('📊 Direct model constructor:', ContactDirect.default.constructor.name);
        console.log('📊 Assoc model constructor:', ContactFromAssoc.constructor.name);
      } else {
        console.log('❌ One or both imports failed');
        console.log('📊 Direct available:', !!ContactDirect.default);
        console.log('📊 Assoc available:', !!ContactFromAssoc);
      }
    } catch (error) {
      console.error('❌ Comparison test failed:', error.message);
    }

    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test 4: Test actual admin route query simulation
    console.log('📝 TEST 4: Simulate admin route query');
    try {
      const { Op } = await import('sequelize');
      const getModels = await import('./backend/models/associations.mjs').then(m => m.default);
      const models = await getModels();
      const { Contact } = models;
      
      if (Contact) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        // This is the exact query that fails in adminRoutes.mjs
        const recentContacts = await Contact.findAll({
          where: {
            createdAt: {
              [Op.gte]: oneDayAgo
            }
          },
          order: [['createdAt', 'DESC']]
        });
        
        console.log('✅ Admin route query successful!');
        console.log('📊 Recent contacts found:', recentContacts.length);
      } else {
        console.error('❌ Contact model not available for query');
      }
    } catch (error) {
      console.error('❌ Admin route query simulation failed:', error.message);
      console.error('📊 Error type:', error.constructor.name);
      console.error('📊 Error details:', error);
    }
    
  } catch (error) {
    console.error('💥 Diagnostic script failed:', error.message);
    console.error('📊 Stack:', error.stack);
  }
}

main();
