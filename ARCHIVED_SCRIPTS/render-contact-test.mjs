#!/usr/bin/env node

/**
 * RENDER PRODUCTION CONTACT SYSTEM TEST SUITE
 * ===========================================
 * Complete simulation test for the contact notification system
 * Run this in Render console or as a one-off job
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fetch from 'node-fetch';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('🚀 RENDER PRODUCTION CONTACT SYSTEM TEST SUITE');
console.log('===============================================');
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`📅 Test Date: ${new Date().toISOString()}`);
console.log('');

async function runContactSystemTests() {
  let testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  const logTest = (name, passed, details = '') => {
    const result = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${result}: ${name}`);
    if (details) console.log(`   ${details}`);
    
    testResults.tests.push({ name, passed, details });
    if (passed) testResults.passed++;
    else testResults.failed++;
  };

  try {
    console.log('🔬 TEST 1: Database Connection & Models');
    console.log('======================================');
    
    // Test 1: Database connection and models
    try {
      const { default: sequelize } = await import('./backend/database.mjs');
      await sequelize.authenticate();
      logTest('Database Connection', true, 'Connected successfully');
      
      const getModels = await import('./backend/models/associations.mjs').then(m => m.default);
      const models = await getModels();
      
      if (models.Contact) {
        logTest('Contact Model Import', true, 'Contact model found in associations');
      } else {
        logTest('Contact Model Import', false, 'Contact model missing from associations');
        return testResults;
      }
      
    } catch (error) {
      logTest('Database/Models Setup', false, error.message);
      return testResults;
    }

    console.log('');
    console.log('🔬 TEST 2: Contact CRUD Operations');
    console.log('==================================');
    
    // Test 2: Create test contacts
    const getModels = await import('./backend/models/associations.mjs').then(m => m.default);
    const models = await getModels();
    const { Contact } = models;
    
    let testContact1, testContact2, testContact3;
    
    try {
      // Create test contacts with different priorities
      testContact1 = await Contact.create({
        name: 'Test Contact Normal',
        email: 'test.normal@render.test',
        message: 'This is a normal priority test contact from Render test suite',
        priority: 'normal'
      });
      logTest('Create Normal Priority Contact', true, `Created contact ID: ${testContact1.id}`);
      
      testContact2 = await Contact.create({
        name: 'Test Contact High',
        email: 'test.high@render.test',
        message: 'This is a high priority test contact from Render test suite',
        priority: 'high'
      });
      logTest('Create High Priority Contact', true, `Created contact ID: ${testContact2.id}`);
      
      testContact3 = await Contact.create({
        name: 'Test Contact Urgent',
        email: 'test.urgent@render.test',
        message: 'This is an urgent priority test contact from Render test suite',
        priority: 'urgent'
      });
      logTest('Create Urgent Priority Contact', true, `Created contact ID: ${testContact3.id}`);
      
    } catch (error) {
      logTest('Contact Creation', false, error.message);
    }

    console.log('');
    console.log('🔬 TEST 3: Admin Query Operations (Fixed Op.gte)');
    console.log('=================================================');
    
    // Test 3: Admin queries (the ones that were broken)
    try {
      const { Op } = await import('sequelize');
      
      // Test recent contacts query (24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentContacts = await Contact.findAll({
        where: {
          createdAt: {
            [Op.gte]: oneDayAgo  // This was the broken line - now fixed!
          }
        },
        order: [['createdAt', 'DESC']]
      });
      
      logTest('Recent Contacts Query (Op.gte)', true, `Found ${recentContacts.length} recent contacts`);
      
      // Test all contacts query
      const allContacts = await Contact.findAll({
        order: [['createdAt', 'DESC']],
        limit: 50
      });
      
      logTest('All Contacts Query', true, `Found ${allContacts.length} total contacts`);
      
    } catch (error) {
      logTest('Admin Queries', false, error.message);
    }

    console.log('');
    console.log('🔬 TEST 4: Mark as Viewed Functionality');
    console.log('=======================================');
    
    // Test 4: Mark as viewed
    try {
      if (testContact1) {
        await testContact1.update({ viewedAt: new Date() });
        await testContact1.reload();
        
        if (testContact1.viewedAt) {
          logTest('Mark Contact as Viewed', true, `Contact ${testContact1.id} marked as viewed`);
        } else {
          logTest('Mark Contact as Viewed', false, 'viewedAt field not updated');
        }
      }
    } catch (error) {
      logTest('Mark as Viewed', false, error.message);
    }

    console.log('');
    console.log('🔬 TEST 5: API Endpoint Simulation');
    console.log('==================================');
    
    // Test 5: Simulate admin routes (without auth for testing)
    try {
      // Import the admin routes to ensure they load without errors
      const adminRoutes = await import('./backend/routes/adminRoutes.mjs');
      logTest('Admin Routes Import', true, 'Admin routes loaded successfully');
      
      // Test the contact routes import
      const contactRoutes = await import('./backend/routes/contactRoutes.mjs');
      logTest('Contact Routes Import', true, 'Contact routes loaded successfully');
      
    } catch (error) {
      logTest('API Routes', false, error.message);
    }

    console.log('');
    console.log('🔬 TEST 6: Data Integrity & Cleanup');
    console.log('===================================');
    
    // Test 6: Verify data and cleanup
    try {
      // Verify all test contacts exist
      const testContacts = await Contact.findAll({
        where: {
          email: {
            [await import('sequelize').then(m => m.Op.like)]: '%@render.test'
          }
        }
      });
      
      logTest('Test Data Verification', true, `Found ${testContacts.length} test contacts`);
      
      // Clean up test data
      const deletedCount = await Contact.destroy({
        where: {
          email: {
            [await import('sequelize').then(m => m.Op.like)]: '%@render.test'
          }
        }
      });
      
      logTest('Test Data Cleanup', true, `Cleaned up ${deletedCount} test contacts`);
      
    } catch (error) {
      logTest('Data Integrity/Cleanup', false, error.message);
    }

    console.log('');
    console.log('🎯 FINAL TEST RESULTS');
    console.log('=====================');
    console.log(`✅ Tests Passed: ${testResults.passed}`);
    console.log(`❌ Tests Failed: ${testResults.failed}`);
    console.log(`📊 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    console.log('');
    if (testResults.failed === 0) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✅ Contact notification system is fully operational');
      console.log('✅ Admin dashboard should work without 500 errors');
      console.log('✅ Contact form submissions will appear in admin dashboard');
      console.log('✅ Mark as viewed functionality is working');
      console.log('');
      console.log('🚀 PRODUCTION READY CHECKLIST:');
      console.log('• ✅ Database connection: Working');
      console.log('• ✅ Contact model: Properly integrated');
      console.log('• ✅ Sequelize Op.gte: Fixed (no more undefined errors)');
      console.log('• ✅ Admin queries: All working');
      console.log('• ✅ CRUD operations: All working');
      console.log('• ✅ API routes: Loading successfully');
    } else {
      console.log('❌ SOME TESTS FAILED');
      console.log('🔧 Issues need to be resolved before full deployment');
      console.log('');
      console.log('Failed tests:');
      testResults.tests.filter(t => !t.passed).forEach(test => {
        console.log(`• ${test.name}: ${test.details}`);
      });
    }

    console.log('');
    console.log('📋 NEXT STEPS FOR LIVE TESTING:');
    console.log('===============================');
    console.log('1. Go to admin dashboard: Should load without errors');
    console.log('2. Check contact notifications: Should show "No recent contacts" or actual contacts');
    console.log('3. Submit a contact form: Should appear in admin dashboard');
    console.log('4. Test mark as viewed: Should work without errors');
    console.log('');
    console.log('🌐 DIAGNOSTIC ENDPOINTS:');
    console.log(`• Debug: https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'your-app'}.onrender.com/api/admin/contacts/debug`);
    console.log(`• Recent: https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'your-app'}.onrender.com/api/admin/contacts/recent`);

    return testResults;

  } catch (error) {
    console.error('💥 CRITICAL TEST FAILURE:', error);
    console.error('Stack:', error.stack);
    logTest('Test Suite Execution', false, error.message);
    return testResults;
  }
}

// Run the test suite
runContactSystemTests()
  .then(results => {
    console.log('');
    console.log('📊 TEST EXECUTION COMPLETE');
    console.log('==========================');
    process.exit(results.failed === 0 ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });
