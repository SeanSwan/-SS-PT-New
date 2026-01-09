/**
 * SECURITY TEST SUITE
 * Tests security vulnerabilities, authentication, authorization, and data protection
 * 
 * Tests:
 * 1. Authentication bypass attempts
 * 2. Authorization checks (role-based access)
 * 3. SQL injection prevention
 * 4. Rate limiting
 * 5. Data encryption
 * 6. API key security
 * 7. GDPR compliance (right to be forgotten)
 */

import axios from 'axios';
import crypto from 'crypto';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// Test credentials
const testCredentials = {
  admin: { email: 'admin@swanstudios.com', password: 'admin123' },
  trainer: { email: 'trainer@swanstudios.com', password: 'trainer123' },
  client: { email: 'client@swanstudios.com', password: 'client123' },
  user: { email: 'user@swanstudios.com', password: 'user123' }
};

// Helper: Make request without auth
async function makeUnauthenticatedRequest(endpoint, method = 'GET', data = {}) {
  try {
    const response = await axios({
      method,
      url: `${API_BASE}${endpoint}`,
      data,
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true
    });
    return response;
  } catch (error) {
    return { status: 500, data: { error: error.message } };
  }
}

// Helper: Make request with invalid token
async function makeInvalidTokenRequest(endpoint, method = 'GET', data = {}) {
  try {
    const response = await axios({
      method,
      url: `${API_BASE}${endpoint}`,
      data,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid.token.here'
      },
      validateStatus: () => true
    });
    return response;
  } catch (error) {
    return { status: 500, data: { error: error.message } };
  }
}

// Helper: Make request with valid token but wrong role
async function makeWrongRoleRequest(endpoint, method = 'GET', data = {}, token) {
  try {
    const response = await axios({
      method,
      url: `${API_BASE}${endpoint}`,
      data,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      validateStatus: () => true
    });
    return response;
  } catch (error) {
    return { status: 500, data: { error: error.message } };
  }
}

// Test 1: Authentication Bypass Attempts
async function testAuthenticationBypass() {
  console.log('\n🔒 Test 1: Authentication Bypass Attempts');
  
  const results = [];
  
  // Try to access protected endpoints without token
  const protectedEndpoints = [
    '/api/gamification/points',
    '/api/ai/workout/generate',
    '/api/trainer/clients',
    '/api/admin/users'
  ];
  
  for (const endpoint of protectedEndpoints) {
    const res = await makeUnauthenticatedRequest(endpoint);
    results.push({
      endpoint,
      status: res.status === 401 ? '✅ Blocked' : '❌ Vulnerable',
      response: res.status
    });
  }
  
  // Try with invalid token
  for (const endpoint of protectedEndpoints) {
    const res = await makeInvalidTokenRequest(endpoint);
    results.push({
      endpoint: `${endpoint} (invalid token)`,
      status: res.status === 401 ? '✅ Blocked' : '❌ Vulnerable',
      response: res.status
    });
  }
  
  console.table(results);
  return results;
}

// Test 2: Authorization (Role-Based Access Control)
async function testAuthorization() {
  console.log('\n🔒 Test 2: Authorization (Role-Based Access Control)');
  
  const results = [];
  
  // Login as different roles
  const tokens = {};
  
  for (const [role, creds] of Object.entries(testCredentials)) {
    const loginRes = await makeUnauthenticatedRequest('/api/auth/login', 'POST', {
      email: creds.email,
      password: creds.password
    });
    
    if (loginRes.status === 200) {
      tokens[role] = loginRes.data.token;
    }
  }
  
  // Test role-specific endpoints
  const roleTests = [
    {
      endpoint: '/api/admin/users',
      allowedRoles: ['admin'],
      disallowedRoles: ['trainer', 'client', 'user']
    },
    {
      endpoint: '/api/trainer/clients',
      allowedRoles: ['trainer', 'admin'],
      disallowedRoles: ['client', 'user']
    },
    {
      endpoint: '/api/ai/workout/generate',
      allowedRoles: ['client', 'trainer', 'admin'],
      disallowedRoles: ['user'] // Users can't access AI features
    },
    {
      endpoint: '/api/gamification/leaderboard',
      allowedRoles: ['client', 'trainer', 'admin', 'user'],
      disallowedRoles: [] // All roles can view leaderboard
    }
  ];
  
  for (const test of roleTests) {
    // Test allowed roles
    for (const role of test.allowedRoles) {
      if (tokens[role]) {
        const res = await makeWrongRoleRequest(test.endpoint, 'GET', {}, tokens[role]);
        results.push({
          endpoint: `${test.endpoint} (${role})`,
          expected: 'Allowed',
          actual: res.status === 200 || res.status === 201 ? '✅ Allowed' : '❌ Blocked',
          status: res.status
        });
      }
    }
    
    // Test disallowed roles
    for (const role of test.disallowedRoles) {
      if (tokens[role]) {
        const res = await makeWrongRoleRequest(test.endpoint, 'GET', {}, tokens[role]);
        results.push({
          endpoint: `${test.endpoint} (${role})`,
          expected: 'Blocked',
          actual: res.status === 403 ? '✅ Blocked' : '❌ Allowed',
          status: res.status
        });
      }
    }
  }
  
  console.table(results);
  return results;
}

// Test 3: SQL Injection Prevention
async function testSQLInjection() {
  console.log('\n🔒 Test 3: SQL Injection Prevention');
  
  const results = [];
  
  const injectionPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM users --",
    "admin' --",
    "1; SELECT * FROM users",
    "<script>alert('xss')</script>",
    "../../etc/passwd"
  ];
  
  // Test in login
  for (const payload of injectionPayloads) {
    const res = await makeUnauthenticatedRequest('/api/auth/login', 'POST', {
      email: payload,
      password: 'test'
    });
    
    results.push({
      test: `Login with: ${payload.substring(0, 20)}...`,
      status: res.status === 401 || res.status === 400 ? '✅ Sanitized' : '❌ Vulnerable',
      response: res.status
    });
  }
  
  // Test in query parameters
  for (const payload of injectionPayloads) {
    const res = await makeUnauthenticatedRequest(`/api/users?search=${encodeURIComponent(payload)}`);
    
    results.push({
      test: `Query param: ${payload.substring(0, 20)}...`,
      status: res.status === 200 || res.status === 400 ? '✅ Sanitized' : '❌ Vulnerable',
      response: res.status
    });
  }
  
  // Test in JSON body
  for (const payload of injectionPayloads) {
    const res = await makeUnauthenticatedRequest('/api/auth/register', 'POST', {
      email: 'test@example.com',
      password: 'test123',
      firstName: payload,
      lastName: 'Test',
      role: 'client'
    });
    
    results.push({
      test: `JSON body: ${payload.substring(0, 20)}...`,
      status: res.status === 201 || res.status === 400 ? '✅ Sanitized' : '❌ Vulnerable',
      response: res.status
    });
  }
  
  console.table(results);
  return results;
}

// Test 4: Rate Limiting
async function testRateLimiting() {
  console.log('\n🔒 Test 4: Rate Limiting');
  
  const results = [];
  
  // Login first to get token
  const loginRes = await makeUnauthenticatedRequest('/api/auth/login', 'POST', {
    email: testCredentials.client.email,
    password: testCredentials.client.password
  });
  
  if (loginRes.status !== 200) {
    console.log('❌ Cannot test rate limiting - login failed');
    return [];
  }
  
  const token = loginRes.data.token;
  
  // Test 1: Rapid requests to same endpoint
  const rapidRequests = 20; // Should trigger rate limit
  let blockedCount = 0;
  
  for (let i = 0; i < rapidRequests; i++) {
    const res = await makeWrongRoleRequest('/api/gamification/points', 'GET', {}, token);
    if (res.status === 429) blockedCount++;
  }
  
  results.push({
    test: `Rapid requests (${rapidRequests}) to same endpoint`,
    blocked: blockedCount,
    status: blockedCount > 0 ? '✅ Rate limited' : '❌ No limit',
    effectiveness: `${blockedCount}/${rapidRequests} blocked`
  });
  
  // Test 2: Distributed-like pattern (different endpoints)
  const endpoints = [
    '/api/gamification/points',
    '/api/gamification/achievements',
    '/api/gamification/leaderboard'
  ];
  
  let endpointBlocks = 0;
  for (let i = 0; i < 15; i++) {
    const endpoint = endpoints[i % endpoints.length];
    const res = await makeWrongRoleRequest(endpoint, 'GET', {}, token);
    if (res.status === 429) endpointBlocks++;
  }
  
  results.push({
    test: 'Distributed request pattern',
    blocked: endpointBlocks,
    status: endpointBlocks > 0 ? '✅ Rate limited' : '❌ No limit',
    effectiveness: `${endpointBlocks}/15 blocked`
  });
  
  // Test 3: Login attempts (should be heavily rate limited)
  let loginBlocks = 0;
  for (let i = 0; i < 10; i++) {
    const res = await makeUnauthenticatedRequest('/api/auth/login', 'POST', {
      email: 'wrong@example.com',
      password: 'wrong'
    });
    if (res.status === 429) loginBlocks++;
  }
  
  results.push({
    test: 'Failed login attempts',
    blocked: loginBlocks,
    status: loginBlocks > 0 ? '✅ Rate limited' : '❌ No limit',
    effectiveness: `${loginBlocks}/10 blocked`
  });
  
  console.table(results);
  return results;
}

// Test 5: Data Encryption & Security
async function testDataEncryption() {
  console.log('\n🔒 Test 5: Data Encryption & Security');
  
  const results = [];
  
  // Test 1: Password hashing (check response time - should be slow)
  const startTime = Date.now();
  const loginRes = await makeUnauthenticatedRequest('/api/auth/login', 'POST', {
    email: testCredentials.client.email,
    password: 'wrong-password'
  });
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  results.push({
    test: 'Password hashing (timing)',
    duration: `${duration}ms`,
    status: duration > 100 ? '✅ Slow hash (secure)' : '⚠️ Too fast (weak)',
    note: 'Should be >100ms to prevent brute force'
  });
  
  // Test 2: Token security
  const tokenLogin = await makeUnauthenticatedRequest('/api/auth/login', 'POST', {
    email: testCredentials.client.email,
    password: testCredentials.client.password
  });
  
  if (tokenLogin.status === 200) {
    const token = tokenLogin.data.token;
    
    // Check token format (should be JWT-like)
    const tokenParts = token.split('.');
    results.push({
      test: 'Token format (JWT structure)',
      parts: tokenParts.length,
      status: tokenParts.length === 3 ? '✅ Valid JWT' : '❌ Invalid format'
    });
    
    // Check token doesn't contain sensitive data
    try {
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      const hasSensitiveData = payload.password || payload.ssn || payload.creditCard;
      
      results.push({
        test: 'Token payload security',
        sensitiveData: hasSensitiveData ? '❌ Yes' : '✅ No',
        status: hasSensitiveData ? '❌ Vulnerable' : '✅ Secure'
      });
    } catch (e) {
      results.push({
        test: 'Token payload parsing',
        status: '❌ Failed',
        error: e.message
      });
    }
  }
  
  // Test 3: API key security (if applicable)
  const adminLogin = await makeUnauthenticatedRequest('/api/auth/login', 'POST', {
    email: testCredentials.admin.email,
    password: testCredentials.admin.password
  });
  
  if (adminLogin.status === 200) {
    // Try to get API keys (should be hashed/hidden)
    const keysRes = await makeWrongRoleRequest('/api/admin/api-keys', 'GET', {}, adminLogin.data.token);
    
    if (keysRes.status === 200) {
      const keys = keysRes.data.keys || [];
      const exposedKeys = keys.filter(k => !k.startsWith('sk_live_') && !k.startsWith('sk_test_'));
      
      results.push({
        test: 'API key exposure',
        keysFound: keys.length,
        exposed: exposedKeys.length,
        status: exposedKeys.length === 0 ? '✅ Keys hashed' : '❌ Keys exposed'
      });
    }
  }
  
  console.table(results);
  return results;
}

// Test 6: GDPR Compliance (Right to be Forgotten)
async function testGDPRCompliance() {
  console.log('\n🔒 Test 6: GDPR Compliance (Right to be Forgotten)');
  
  const results = [];
  
  // Create test user
  const testEmail = `gdpr-test-${Date.now()}@test.com`;
  const registerRes = await makeUnauthenticatedRequest('/api/auth/register', 'POST', {
    email: testEmail,
    password: 'test123',
    firstName: 'GDPR',
    lastName: 'Test',
    role: 'client'
  });
  
  if (registerRes.status !== 201) {
    console.log('❌ Cannot test GDPR - registration failed');
    return [];
  }
  
  const userId = registerRes.data.user.id;
  
  // Login
  const loginRes = await makeUnauthenticatedRequest('/api/auth/login', 'POST', {
    email: testEmail,
    password: 'test123'
  });
  
  if (loginRes.status !== 200) {
    console.log('❌ Cannot test GDPR - login failed');
    return [];
  }
  
  const token = loginRes.data.token;
  
  // Add some data
  await makeWrongRoleRequest('/api/gamification/points', 'POST', {
    points: 100,
    reason: 'Test'
  }, token);
  
  await makeWrongRoleRequest('/api/social/share', 'POST', {
    type: 'workout',
    content: 'GDPR test post'
  }, token);
  
  // Test 1: Data export
  const exportRes = await makeWrongRoleRequest('/api/gdpr/export', 'GET', {}, token);
  results.push({
    test: 'Data export request',
    status: exportRes.status === 200 ? '✅ Available' : '❌ Not available',
    hasData: exportRes.data?.userData ? '✅ Yes' : '❌ No'
  });
  
  // Test 2: Data deletion
  const deleteRes = await makeWrongRoleRequest('/api/gdpr/delete', 'POST', {
    userId: userId,
    confirmation: 'I want to delete my data'
  }, token);
  
  results.push({
    test: 'Data deletion request',
    status: deleteRes.status === 200 ? '✅ Initiated' : '❌ Failed',
    message: deleteRes.data?.message || 'No message'
  });
  
  // Test 3: Verify deletion (should not be able to login)
  if (deleteRes.status === 200) {
    const verifyLogin = await makeUnauthenticatedRequest('/api/auth/login', 'POST', {
      email: testEmail,
      password: 'test123'
    });
    
    results.push({
      test: 'Verify data deletion',
      status: verifyLogin.status === 401 ? '✅ Complete' : '❌ Incomplete',
      loginStatus: verifyLogin.status
    });
  }
  
  // Test 4: Audit log access
  const auditRes = await makeWrongRoleRequest('/api/gdpr/audit-log', 'GET', {}, token);
  results.push({
    test: 'Audit log access',
    status: auditRes.status === 200 ? '✅ Available' : '❌ Not available',
    hasLog: auditRes.data?.log ? '✅ Yes' : '❌ No'
  });
  
  console.table(results);
  return results;
}

// Test 7: Input Validation & Sanitization
async function testInputValidation() {
  console.log('\n🔒 Test 7: Input Validation & Sanitization');
  
  const results = [];
  
  const invalidInputs = [
    { field: 'email', value: 'not-an-email', expected: '400' },
    { field: 'email', value: 'a@b', expected: '400' },
    { field: 'password', value: '123', expected: '400' },
    { field: 'password', value: 'password', expected: '400' },
    { field: 'firstName', value: 'A'.repeat(100), expected: '400' },
    { field: 'calories', value: 'abc', expected: '400' },
    { field: 'calories', value: -500, expected: '400' },
    { field: 'points', value: 999999999, expected: '400' }
  ];
  
  for (const test of invalidInputs) {
    const res = await makeUnauthenticatedRequest('/api/auth/register', 'POST', {
      email: 'test@example.com',
      password: 'test123',
      firstName: 'Test',
      lastName: 'User',
      role: 'client',
      [test.field]: test.value
    });
    
    results.push({
      field: test.field,
      value: String(test.value).substring(0, 30),
      expected: test.expected,
      actual: res.status,
      status: res.status == test.expected ? '✅ Rejected' : '❌ Accepted'
    });
  }
  
  console.table(results);
  return results;
}

// Main Test Runner
async function runAllSecurityTests() {
  console.log('🔒 STARTING SECURITY TEST SUITE\n');
  console.log('='.repeat(60));
  
  const allResults = {};
  
  try {
    // Run all security tests
    allResults.authenticationBypass = await testAuthenticationBypass();
    allResults.authorization = await testAuthorization();
    allResults.sqlInjection = await testSQLInjection();
    allResults.rateLimiting = await testRateLimiting();
    allResults.dataEncryption = await testDataEncryption();
    allResults.gdprCompliance = await testGDPRCompliance();
    allResults.inputValidation = await testInputValidation();
    
    // Generate summary
    console.log('\n' + '='.repeat(60));
    console.log('🔒 SECURITY TEST SUMMARY');
    console.log('='.repeat(60));
    
    let totalTests = 0;
    let passedTests = 0;
    let criticalFailures = 0;
    
    Object.entries(allResults).forEach(([category, tests]) => {
      const passed = tests.filter(t => t.status && t.status.includes('✅')).length;
      const total = tests.length;
      const critical = tests.filter(t => t.status && t.status.includes('❌')).length;
      
      totalTests += total;
      passedTests += passed;
      criticalFailures += critical;
      
      console.log(`\n${category}: ${passed}/${total} passed`);
      if (critical > 0) {
        console.log(`  ⚠️  CRITICAL: ${critical} vulnerabilities found!`);
      }
    });
    
    const passRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`OVERALL: ${passedTests}/${totalTests} (${passRate}%)`);
    console.log(`CRITICAL FAILURES: ${criticalFailures}`);
    console.log('='.repeat(60));
    
    if (criticalFailures === 0 && parseFloat(passRate) >= 90) {
      console.log('\n✅ SECURITY TESTS PASSED - System is secure!');
    } else if (criticalFailures === 0) {
      console.log('\n⚠️  Security tests passed with warnings - review recommended');
    } else {
      console.log('\n❌ CRITICAL SECURITY ISSUES FOUND - Do not deploy!');
    }
    
    // Save results
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(
      `backend/tests/results/security-${timestamp}.json`,
      JSON.stringify(allResults, null, 2)
    );
    
    console.log(`\n📄 Detailed results saved to: backend/tests/results/security-${timestamp}.json`);
    
    // Return exit code
    if (criticalFailures > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Security test suite failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllSecurityTests();
}

export {
  testAuthenticationBypass,
  testAuthorization,
  testSQLInjection,
  testRateLimiting,
  testDataEncryption,
  testGDPRCompliance,
  testInputValidation,
  runAllSecurityTests
};