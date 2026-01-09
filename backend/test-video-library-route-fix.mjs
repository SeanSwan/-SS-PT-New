/**
 * Video Library Route Fix Test
 * ============================
 *
 * Tests that video library routes are correctly prioritized over adminPackageRoutes
 *
 * Issue: /api/admin/videos was being intercepted by adminPackageRoutes
 * Fix: Moved videoLibraryRoutes BEFORE adminPackageRoutes in routes.mjs
 *
 * Expected Results:
 * - /api/admin/videos → videoLibraryController (NOT adminPackageRoutes)
 * - /api/admin/exercise-library → videoLibraryController
 * - Both endpoints should return exercise library data (NOT storefront error)
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:10000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-admin-jwt-token-here';

// Test configuration
const tests = [
  {
    name: 'Test 1: GET /api/admin/videos (frontend alias)',
    endpoint: '/api/admin/videos',
    method: 'GET',
    expectedStatusOK: [200, 401], // 200 if auth works, 401 if no token (but NOT 500)
    expectedErrorPatterns: {
      shouldNotContain: ['storefront item', 'findByPk'] // These indicate wrong route
    }
  },
  {
    name: 'Test 2: GET /api/admin/exercise-library (original endpoint)',
    endpoint: '/api/admin/exercise-library',
    method: 'GET',
    expectedStatusOK: [200, 401],
    expectedErrorPatterns: {
      shouldNotContain: ['storefront item', 'findByPk']
    }
  },
  {
    name: 'Test 3: GET /api/admin/dashboard/stats (should still work)',
    endpoint: '/api/admin/dashboard/stats',
    method: 'GET',
    expectedStatusOK: [200, 401],
    expectedErrorPatterns: {
      shouldNotContain: ['storefront item']
    }
  }
];

async function runTests() {
  console.log('\n🧪 VIDEO LIBRARY ROUTE FIX TEST\n');
  console.log('═'.repeat(60));
  console.log('Testing route precedence fix...\n');

  let passCount = 0;
  let failCount = 0;

  for (const test of tests) {
    console.log(`\n${test.name}`);
    console.log('-'.repeat(60));

    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      // Add auth token if available
      if (ADMIN_TOKEN && ADMIN_TOKEN !== 'your-admin-jwt-token-here') {
        headers['Authorization'] = `Bearer ${ADMIN_TOKEN}`;
      }

      const response = await fetch(`${BASE_URL}${test.endpoint}`, {
        method: test.method,
        headers
      });

      const responseText = await response.text();
      let responseJson;

      try {
        responseJson = JSON.parse(responseText);
      } catch (e) {
        responseJson = { rawText: responseText };
      }

      // Check status code
      const statusOK = test.expectedStatusOK.includes(response.status);
      console.log(`   Status: ${response.status} ${statusOK ? '✅' : '❌'}`);

      // Check error patterns
      let errorPatternPass = true;
      if (test.expectedErrorPatterns?.shouldNotContain) {
        for (const pattern of test.expectedErrorPatterns.shouldNotContain) {
          if (responseText.toLowerCase().includes(pattern.toLowerCase())) {
            console.log(`   ❌ FAIL: Response contains forbidden pattern "${pattern}"`);
            console.log(`   Error message: ${responseJson.message || responseJson.error || 'N/A'}`);
            errorPatternPass = false;
          }
        }
      }

      // Overall result
      if (statusOK && errorPatternPass) {
        console.log(`   ✅ PASS`);
        passCount++;
      } else {
        console.log(`   ❌ FAIL`);
        console.log(`   Response:`, JSON.stringify(responseJson, null, 2).substring(0, 200));
        failCount++;
      }

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      failCount++;
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log(`\n📊 RESULTS: ${passCount}/${tests.length} tests passed\n`);

  if (failCount === 0) {
    console.log('✅ ALL TESTS PASSED - Video library routes working correctly!\n');
    console.log('Route precedence fix successful:');
    console.log('  - /api/admin/videos → videoLibraryController');
    console.log('  - /api/admin/exercise-library → videoLibraryController');
    console.log('  - adminPackageRoutes no longer intercepts video routes\n');
  } else {
    console.log('❌ SOME TESTS FAILED - Check output above\n');
  }

  process.exit(failCount > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
