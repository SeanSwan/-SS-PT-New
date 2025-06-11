#!/usr/bin/env node

/**
 * RENDER HTTP API ENDPOINT TEST SUITE
 * ===================================
 * Test the actual HTTP endpoints that admin dashboard calls
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.RENDER_EXTERNAL_URL || 'https://ss-pt-new.onrender.com';
const ADMIN_TOKEN = process.env.ADMIN_TEST_TOKEN; // You'll need to set this

console.log('🌐 RENDER HTTP API ENDPOINT TEST SUITE');
console.log('======================================');
console.log(`🎯 Testing: ${BASE_URL}`);
console.log('');

async function runHttpTests() {
  const results = { passed: 0, failed: 0 };
  
  const logTest = (name, passed, details = '') => {
    const result = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${result}: ${name}`);
    if (details) console.log(`   ${details}`);
    if (passed) results.passed++;
    else results.failed++;
  };

  // Test 1: Health Check
  console.log('🔬 TEST 1: Basic Health Check');
  console.log('=============================');
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    
    if (response.ok && data.status === 'healthy') {
      logTest('Health Endpoint', true, `Status: ${data.status}`);
    } else {
      logTest('Health Endpoint', false, `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Health Endpoint', false, error.message);
  }

  // Test 2: Contact Debug Endpoint (No Auth Required)
  console.log('');
  console.log('🔬 TEST 2: Contact Debug Endpoint');
  console.log('=================================');
  try {
    const response = await fetch(`${BASE_URL}/api/admin/contacts/debug`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      logTest('Contact Debug Endpoint', true, `Message: ${data.message}`);
      console.log(`   📊 Available Models: ${data.availableModels?.join(', ') || 'N/A'}`);
      console.log(`   📈 Contact Count: ${data.contactCount || 0}`);
    } else {
      logTest('Contact Debug Endpoint', false, `Error: ${data.error || 'Unknown error'}`);
      if (data.step) console.log(`   🔍 Failed at step: ${data.step}`);
    }
  } catch (error) {
    logTest('Contact Debug Endpoint', false, error.message);
  }

  // Test 3: Create Contact via Form
  console.log('');
  console.log('🔬 TEST 3: Contact Form Submission');
  console.log('==================================');
  try {
    const contactData = {
      name: 'Render Test Contact',
      email: 'render.test@example.com',
      message: 'This is a test contact submission from the Render test suite to verify the contact form works properly.',
      consultationType: 'general',
      priority: 'normal'
    };

    const response = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactData)
    });

    const data = await response.json();
    
    if (response.ok && data.contact) {
      logTest('Contact Form Submission', true, `Created contact ID: ${data.contact.id}`);
      window.testContactId = data.contact.id; // Save for later tests
    } else {
      logTest('Contact Form Submission', false, `Error: ${data.message || 'Unknown error'}`);
    }
  } catch (error) {
    logTest('Contact Form Submission', false, error.message);
  }

  // Test 4: Admin Recent Contacts (With Auth - will fail if no token)
  console.log('');
  console.log('🔬 TEST 4: Admin Recent Contacts Endpoint');
  console.log('=========================================');
  
  if (!ADMIN_TOKEN) {
    logTest('Admin Recent Contacts', false, 'No ADMIN_TEST_TOKEN provided - skipping auth test');
    console.log('   💡 To test with auth, set ADMIN_TEST_TOKEN environment variable');
  } else {
    try {
      const response = await fetch(`${BASE_URL}/api/admin/contacts/recent`, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        logTest('Admin Recent Contacts', true, `Found ${data.count} recent contacts`);
      } else if (response.status === 401) {
        logTest('Admin Recent Contacts', false, 'Authentication failed - check ADMIN_TEST_TOKEN');
      } else {
        logTest('Admin Recent Contacts', false, `Error: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      logTest('Admin Recent Contacts', false, error.message);
    }
  }

  // Test 5: Admin All Contacts (With Auth - will fail if no token)
  console.log('');
  console.log('🔬 TEST 5: Admin All Contacts Endpoint');
  console.log('======================================');
  
  if (!ADMIN_TOKEN) {
    logTest('Admin All Contacts', false, 'No ADMIN_TEST_TOKEN provided - skipping auth test');
  } else {
    try {
      const response = await fetch(`${BASE_URL}/api/admin/contacts`, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        logTest('Admin All Contacts', true, `Found ${data.contacts?.length || 0} total contacts`);
      } else if (response.status === 401) {
        logTest('Admin All Contacts', false, 'Authentication failed - check ADMIN_TEST_TOKEN');
      } else {
        logTest('Admin All Contacts', false, `Error: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      logTest('Admin All Contacts', false, error.message);
    }
  }

  // Results Summary
  console.log('');
  console.log('🎯 HTTP TEST RESULTS');
  console.log('====================');
  console.log(`✅ Tests Passed: ${results.passed}`);
  console.log(`❌ Tests Failed: ${results.failed}`);
  console.log(`📊 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  console.log('');
  if (results.failed === 0) {
    console.log('🎉 ALL HTTP TESTS PASSED!');
    console.log('✅ Contact form endpoint: Working');
    console.log('✅ Contact debug endpoint: Working');
    console.log('✅ Admin endpoints: Ready (auth required)');
  } else {
    console.log('⚠️ SOME TESTS FAILED');
    console.log('Check the failures above for specific issues');
  }

  console.log('');
  console.log('📋 MANUAL TEST CHECKLIST');
  console.log('========================');
  console.log('1. 🌐 Visit admin dashboard in browser');
  console.log('2. 🔍 Check contact notifications section');
  console.log('3. 📝 Submit contact form on website');
  console.log('4. 👁️ Verify contact appears in admin dashboard');
  console.log('5. ✅ Test "Mark as Viewed" functionality');

  console.log('');
  console.log('🔗 USEFUL URLS FOR TESTING:');
  console.log(`• Debug Endpoint: ${BASE_URL}/api/admin/contacts/debug`);
  console.log(`• Health Check: ${BASE_URL}/health`);
  console.log(`• Admin Dashboard: ${BASE_URL}/admin`);
  console.log(`• Contact Page: ${BASE_URL}/contact`);

  return results;
}

// Run HTTP tests
runHttpTests()
  .then(results => {
    process.exit(results.failed === 0 ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 HTTP test suite crashed:', error);
    process.exit(1);
  });
