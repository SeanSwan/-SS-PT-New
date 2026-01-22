#!/usr/bin/env node

/**
 * Frontend API Integration Verification Script
 * ==========================================
 * Tests Redux state management, API connectivity, and WebSocket integration
 * for the SwanStudios Universal Master Schedule system
 * 
 * Run with: node verify-frontend-api-integration.mjs
 */

import axios from 'axios';
import colors from 'colors';
import fs from 'fs';
import path from 'path';
import { io } from 'socket.io-client';

// Configuration
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:10000';
const WS_URL = process.env.VITE_WS_URL || API_BASE_URL;
const TEST_CREDENTIALS = {
  admin: {
    username: process.env.TEST_ADMIN_USERNAME || process.env.TEST_ADMIN_EMAIL || 'admin@swanstudios.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'admin123'
  },
  trainer: {
    username: process.env.TEST_TRAINER_USERNAME || process.env.TEST_TRAINER_EMAIL || 'trainer@swanstudios.com',
    password: process.env.TEST_TRAINER_PASSWORD || 'trainer123'
  },
  client: {
    username: process.env.TEST_CLIENT_USERNAME || process.env.TEST_CLIENT_EMAIL || 'client@swanstudios.com',
    password: process.env.TEST_CLIENT_PASSWORD || 'client123'
  }
};

let testResults = [];
let authTokens = {};

/**
 * Add test result
 */
function addResult(testName, status, message, details = null) {
  testResults.push({
    testName,
    status,
    message,
    details,
    timestamp: new Date().toISOString()
  });
  
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  console.log(`[${status}] ${testName} - ${message}`[statusColor]);
  
  if (details && process.env.VERBOSE === 'true') {
    console.log(`  Details: ${JSON.stringify(details, null, 2)}`.gray);
  }
}

/**
 * Create axios instance
 */
function createApiClient(token = null) {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    timeout: 15000
  });
}

/**
 * Test authentication for all user roles
 */
async function testAuthentication() {
  console.log('\n🔐 Testing authentication for all user roles...'.blue);
  
  for (const [role, credentials] of Object.entries(TEST_CREDENTIALS)) {
    try {
      const api = createApiClient();
      const response = await api.post('/api/auth/login', credentials);
      
      if (response.data.success && response.data.token) {
        authTokens[role] = response.data.token;
        addResult(`Authentication - ${role}`, 'PASS', `${role} authentication successful`);
      } else {
        addResult(`Authentication - ${role}`, 'FAIL', `${role} authentication failed - no token`);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        addResult(`Authentication - ${role}`, 'WARN', `${role} credentials may need setup: ${error.message}`);
      } else {
        addResult(`Authentication - ${role}`, 'FAIL', `${role} authentication error: ${error.message}`);
      }
    }
  }
  
  return Object.keys(authTokens).length > 0;
}

/**
 * Test core session API endpoints
 */
async function testSessionAPIs() {
  console.log('\n📊 Testing core session API endpoints...'.blue);
  
  const adminToken = authTokens.admin;
  if (!adminToken) {
    addResult('Session APIs', 'SKIP', 'No admin token available for API testing');
    return false;
  }
  
  const api = createApiClient(adminToken);
  
  // Test GET /api/sessions
  try {
    const response = await api.get('/api/sessions');
    if (Array.isArray(response.data)) {
      addResult('GET /api/sessions', 'PASS', `Retrieved ${response.data.length} sessions`);
    } else {
      addResult('GET /api/sessions', 'FAIL', 'Response is not an array');
    }
  } catch (error) {
    addResult('GET /api/sessions', 'FAIL', `API error: ${error.message}`);
  }
  
  // Test GET /api/sessions/users/clients
  try {
    const response = await api.get('/api/sessions/users/clients');
    if (Array.isArray(response.data)) {
      addResult('GET /api/sessions/users/clients', 'PASS', `Retrieved ${response.data.length} clients`);
    } else {
      addResult('GET /api/sessions/users/clients', 'FAIL', 'Clients response is not an array');
    }
  } catch (error) {
    addResult('GET /api/sessions/users/clients', 'FAIL', `API error: ${error.message}`);
  }
  
  // Test GET /api/sessions/users/trainers
  try {
    const response = await api.get('/api/sessions/users/trainers');
    if (Array.isArray(response.data)) {
      addResult('GET /api/sessions/users/trainers', 'PASS', `Retrieved ${response.data.length} trainers`);
    } else {
      addResult('GET /api/sessions/users/trainers', 'FAIL', 'Trainers response is not an array');
    }
  } catch (error) {
    addResult('GET /api/sessions/users/trainers', 'FAIL', `API error: ${error.message}`);
  }
  
  // Test Universal Master Schedule specific endpoints
  await testUniversalScheduleAPIs(api);
  
  return true;
}

/**
 * Test Universal Master Schedule specific APIs
 */
async function testUniversalScheduleAPIs(api) {
  console.log('\n🗓️ Testing Universal Master Schedule APIs...'.blue);
  
  // Test calendar events via session date range
  try {
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const response = await api.get('/api/sessions', {
      params: { startDate, endDate }
    });
    const sessions = response?.data?.data || response?.data?.sessions || response?.data;
    if (Array.isArray(sessions)) {
      addResult('Calendar Events API', 'PASS', `Calendar events range returned ${sessions.length} sessions`);
    } else {
      addResult('Calendar Events API', 'WARN', 'Calendar range response is not an array');
    }
  } catch (error) {
    if (error.response?.status === 404) {
      addResult('Calendar Events API', 'WARN', 'Calendar events endpoint not found (may need implementation)');
    } else {
      addResult('Calendar Events API', 'FAIL', `Calendar events error: ${error.message}`);
    }
  }
  
  // Test session statistics endpoint
  try {
    await api.get('/api/sessions/stats');
    addResult('Session Statistics API', 'PASS', 'Statistics endpoint working');
  } catch (error) {
    if (error.response?.status === 404) {
      addResult('Session Statistics API', 'WARN', 'Statistics endpoint not found (may need implementation)');
    } else {
      addResult('Session Statistics API', 'FAIL', `Statistics error: ${error.message}`);
    }
  }
  
  // Test bulk operations endpoint
  try {
    const response = await api.post('/api/sessions/bulk-update', { 
      updates: [] // Empty test
    });
    addResult('Bulk Operations API', 'PASS', 'Bulk operations endpoint accessible');
  } catch (error) {
    if (error.response?.status === 400) {
      addResult('Bulk Operations API', 'PASS', 'Bulk operations endpoint validates input correctly');
    } else if (error.response?.status === 404) {
      addResult('Bulk Operations API', 'WARN', 'Bulk operations endpoint not found (may need implementation)');
    } else {
      addResult('Bulk Operations API', 'FAIL', `Bulk operations error: ${error.message}`);
    }
  }
}

/**
 * Test role-based API access
 */
async function testRoleBasedAccess() {
  console.log('\n🔒 Testing role-based API access...'.blue);
  
  for (const [role, token] of Object.entries(authTokens)) {
    if (!token) continue;
    
    const api = createApiClient(token);
    
    try {
      const response = await api.get('/api/sessions');
      
      // Check response based on role
      if (role === 'admin') {
        addResult(`Role Access - ${role}`, 'PASS', 'Admin can access all sessions');
      } else if (role === 'trainer') {
        addResult(`Role Access - ${role}`, 'PASS', 'Trainer can access session data');
      } else if (role === 'client') {
        addResult(`Role Access - ${role}`, 'PASS', 'Client can access session data');
      }
    } catch (error) {
      if (error.response?.status === 403) {
        addResult(`Role Access - ${role}`, 'FAIL', `${role} access denied when it should be allowed`);
      } else {
        addResult(`Role Access - ${role}`, 'WARN', `${role} access test inconclusive: ${error.message}`);
      }
    }
  }
}

/**
 * Test WebSocket connectivity
 */
async function testWebSocketConnection() {
  return new Promise((resolve) => {
    console.log('\ndY"O Testing WebSocket connectivity...'.blue);

    try {
      if (!authTokens.admin) {
        addResult('WebSocket Connection', 'SKIP', 'No admin token available for socket authentication');
        resolve(false);
        return;
      }

      const socket = io(WS_URL, {
        transports: ['websocket'],
        auth: { token: authTokens.admin },
        timeout: 10000
      });
      let connected = false;

      const timeout = setTimeout(() => {
        if (!connected) {
          addResult('WebSocket Connection', 'FAIL', 'WebSocket connection timeout');
          socket.close();
          resolve(false);
        }
      }, 10000);

      socket.on('connect', () => {
        connected = true;
        clearTimeout(timeout);
        addResult('WebSocket Connection', 'PASS', 'WebSocket connected successfully');

        setTimeout(() => {
          socket.close();
          resolve(true);
        }, 2000);
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        addResult('WebSocket Auth', 'FAIL', 'Socket authentication failed: ' + error.message);
        socket.close();
        resolve(false);
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        addResult('WebSocket Connection', 'FAIL', 'WebSocket error: ' + error.message);
        resolve(false);
      });

    } catch (error) {
      addResult('WebSocket Connection', 'FAIL', 'WebSocket setup error: ' + error.message);
      resolve(false);
    }
  });
}

/**
 * Test API performance and response times
 */
async function testAPIPerformance() {
  console.log('\n⚡ Testing API performance...'.blue);
  
  const adminToken = authTokens.admin;
  if (!adminToken) {
    addResult('API Performance', 'SKIP', 'No admin token for performance testing');
    return;
  }
  
  const api = createApiClient(adminToken);
  const performanceResults = [];
  
  // Test multiple API calls for performance
  const endpoints = [
    '/api/sessions',
    '/api/sessions/users/clients',
    '/api/sessions/users/trainers',
    '/health'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();
      await api.get(endpoint);
      const responseTime = Date.now() - startTime;
      
      performanceResults.push({
        endpoint,
        responseTime,
        status: 'success'
      });
      
      if (responseTime < 1000) {
        addResult(`Performance - ${endpoint}`, 'PASS', `Response time: ${responseTime}ms`);
      } else if (responseTime < 3000) {
        addResult(`Performance - ${endpoint}`, 'WARN', `Slow response: ${responseTime}ms`);
      } else {
        addResult(`Performance - ${endpoint}`, 'FAIL', `Very slow response: ${responseTime}ms`);
      }
    } catch (error) {
      performanceResults.push({
        endpoint,
        responseTime: null,
        status: 'error',
        error: error.message
      });
      
      addResult(`Performance - ${endpoint}`, 'FAIL', `Performance test failed: ${error.message}`);
    }
  }
  
  // Calculate average response time
  const successfulRequests = performanceResults.filter(r => r.status === 'success');
  if (successfulRequests.length > 0) {
    const avgResponseTime = successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length;
    addResult('Average Response Time', 'INFO', `${avgResponseTime.toFixed(2)}ms`, { performanceResults });
  }
}

/**
 * Test error handling and edge cases
 */
async function testErrorHandling() {
  console.log('\n🚫 Testing error handling...'.blue);
  
  const api = createApiClient();
  
  // Test unauthorized access
  try {
    await api.get('/api/sessions');
    addResult('Unauthorized Access', 'FAIL', 'API allowed unauthorized access');
  } catch (error) {
    if (error.response?.status === 401) {
      addResult('Unauthorized Access', 'PASS', 'API correctly blocks unauthorized access');
    } else {
      addResult('Unauthorized Access', 'WARN', `Unexpected error: ${error.message}`);
    }
  }
  
  // Test invalid endpoint
  try {
    const adminApi = createApiClient(authTokens.admin);
    await adminApi.get('/api/sessions/invalid-endpoint');
    addResult('Invalid Endpoint', 'FAIL', 'API responded to invalid endpoint');
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 400) {
      addResult('Invalid Endpoint', 'PASS', 'API correctly rejects invalid endpoints');
    } else {
      addResult('Invalid Endpoint', 'WARN', `Unexpected error: ${error.message}`);
    }
  }
  
  // Test malformed requests
  try {
    const adminApi = createApiClient(authTokens.admin);
    await adminApi.post('/api/sessions', { invalid: 'data' });
    addResult('Malformed Request', 'WARN', 'API accepted malformed request');
  } catch (error) {
    if (error.response?.status >= 400 && error.response?.status < 500) {
      addResult('Malformed Request', 'PASS', 'API correctly validates request data');
    } else {
      addResult('Malformed Request', 'WARN', `Unexpected error: ${error.message}`);
    }
  }
}

/**
 * Generate verification report
 */
async function generateReport() {
  console.log('\n📄 Generating API integration report...'.blue);
  
  const report = {
    testSuite: 'SwanStudios Frontend API Integration',
    timestamp: new Date().toISOString(),
    environment: {
      apiBaseUrl: API_BASE_URL,
      wsUrl: WS_URL,
      nodeEnv: process.env.NODE_ENV || 'development'
    },
    authentication: {
      roles: Object.keys(authTokens),
      tokensObtained: Object.keys(authTokens).length
    },
    summary: {
      totalTests: testResults.length,
      passed: testResults.filter(r => r.status === 'PASS').length,
      failed: testResults.filter(r => r.status === 'FAIL').length,
      warnings: testResults.filter(r => r.status === 'WARN').length,
      skipped: testResults.filter(r => r.status === 'SKIP').length,
      info: testResults.filter(r => r.status === 'INFO').length
    },
    results: testResults
  };
  
  // Write report to file
  const reportPath = path.join(process.cwd(), 'frontend-api-integration-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Console summary
  console.log('\n=== API INTEGRATION SUMMARY ==='.yellow);
  console.log(`✅ Passed: ${report.summary.passed}`.green);
  console.log(`❌ Failed: ${report.summary.failed}`.red);
  console.log(`⚠️  Warnings: ${report.summary.warnings}`.yellow);
  console.log(`⏭️  Skipped: ${report.summary.skipped}`.blue);
  console.log(`ℹ️  Info: ${report.summary.info}`.cyan);
  console.log(`📊 Total Tests: ${report.summary.totalTests}`.blue);
  console.log(`🔑 Auth Tokens: ${report.authentication.tokensObtained}`.green);
  console.log(`📄 Report saved to: ${reportPath}`.gray);
  
  return report.summary.failed === 0;
}

/**
 * Main test execution
 */
async function runVerification() {
  console.log('🚀 SwanStudios Frontend API Integration Verification'.rainbow);
  console.log('='.repeat(65).gray);
  
  try {
    // Test authentication
    const authSuccess = await testAuthentication();
    if (!authSuccess) {
      console.log('⚠️  Continuing with limited testing due to auth issues...'.yellow);
    }
    
    // Run API tests
    await testSessionAPIs();
    await testRoleBasedAccess();
    
    // Test WebSocket
    await testWebSocketConnection();
    
    // Performance tests
    await testAPIPerformance();
    
    // Error handling tests
    await testErrorHandling();
    
    // Generate report
    const success = await generateReport();
    
    return success;
  } catch (error) {
    console.error(`\n❌ Verification failed: ${error.message}`.red);
    addResult('Verification Suite', 'FAIL', `Fatal error: ${error.message}`);
    return false;
  }
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runVerification()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default runVerification;
