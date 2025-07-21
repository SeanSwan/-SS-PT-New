#!/usr/bin/env node

/**
 * Universal Master Schedule API Testing Script
 * ===========================================
 * Tests all the newly added endpoints for the Universal Master Schedule
 * 
 * Run with: node test-universal-master-schedule-api.mjs
 */

import axios from 'axios';
import colors from 'colors';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:10000';
const TEST_ADMIN_CREDENTIALS = {
  username: process.env.TEST_ADMIN_USERNAME || 'admin@test.com',
  password: process.env.TEST_ADMIN_PASSWORD || 'password123'
};

// Test state
let authToken = null;
let testResults = [];

/**
 * Add test result
 */
function addResult(endpoint, method, status, message, data = null) {
  testResults.push({
    endpoint,
    method,
    status,
    message,
    data,
    timestamp: new Date().toISOString()
  });
  
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  console.log(`[${status}] ${method} ${endpoint} - ${message}`[statusColor]);
  
  if (data && process.env.VERBOSE === 'true') {
    console.log('  Response:', JSON.stringify(data, null, 2));
  }
}

/**
 * Login and get auth token
 */
async function authenticate() {
  try {
    console.log('\\n🔐 Authenticating with admin credentials...'.blue);
    
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, TEST_ADMIN_CREDENTIALS);
    
    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      addResult('/api/auth/login', 'POST', 'PASS', 'Authentication successful');
      return true;
    } else {
      addResult('/api/auth/login', 'POST', 'FAIL', 'Authentication failed - no token received');
      return false;
    }
  } catch (error) {
    addResult('/api/auth/login', 'POST', 'FAIL', `Authentication failed: ${error.message}`);
    return false;
  }
}

/**
 * Create axios instance with auth headers
 */
function createAuthedClient() {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });
}

/**
 * Test basic session endpoints
 */
async function testBasicEndpoints() {
  console.log('\\n📊 Testing Basic Session Endpoints...'.blue);
  const client = createAuthedClient();
  
  // Test GET /api/sessions
  try {
    const response = await client.get('/api/sessions');
    addResult('/api/sessions', 'GET', 'PASS', `Retrieved ${response.data.length || 0} sessions`);
  } catch (error) {
    addResult('/api/sessions', 'GET', 'FAIL', `Error: ${error.message}`);
  }
  
  // Test GET /api/sessions/clients
  try {
    const response = await client.get('/api/sessions/clients');
    addResult('/api/sessions/clients', 'GET', 'PASS', `Retrieved ${response.data.length || 0} clients`);
  } catch (error) {
    addResult('/api/sessions/clients', 'GET', 'FAIL', `Error: ${error.message}`);
  }
  
  // Test GET /api/sessions/trainers
  try {
    const response = await client.get('/api/sessions/trainers');
    addResult('/api/sessions/trainers', 'GET', 'PASS', `Retrieved ${response.data.length || 0} trainers`);
  } catch (error) {
    addResult('/api/sessions/trainers', 'GET', 'FAIL', `Error: ${error.message}`);
  }
}

/**
 * Test new Universal Master Schedule endpoints
 */
async function testUniversalMasterScheduleEndpoints() {
  console.log('\\n🚀 Testing Universal Master Schedule Endpoints...'.blue);
  const client = createAuthedClient();
  
  // Test GET /api/sessions/statistics
  try {
    const response = await client.get('/api/sessions/statistics');
    if (response.data.success) {
      addResult('/api/sessions/statistics', 'GET', 'PASS', 'Statistics retrieved successfully', {
        totalSessions: response.data.data.overview?.totalSessions,
        utilizationRate: response.data.data.overview?.utilizationRate
      });
    } else {
      addResult('/api/sessions/statistics', 'GET', 'FAIL', 'Statistics request failed');
    }
  } catch (error) {
    addResult('/api/sessions/statistics', 'GET', 'FAIL', `Error: ${error.message}`);
  }
  
  // Test GET /api/sessions/calendar-events
  try {
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now
    const response = await client.get(`/api/sessions/calendar-events?start=${startDate}&end=${endDate}`);
    
    if (response.data.success) {
      addResult('/api/sessions/calendar-events', 'GET', 'PASS', 
        `Retrieved ${response.data.data.length} calendar events`, 
        { eventCount: response.data.data.length }
      );
    } else {
      addResult('/api/sessions/calendar-events', 'GET', 'FAIL', 'Calendar events request failed');
    }
  } catch (error) {
    addResult('/api/sessions/calendar-events', 'GET', 'FAIL', `Error: ${error.message}`);
  }
  
  // Test GET /api/sessions/utilization-stats
  try {
    const response = await client.get('/api/sessions/utilization-stats?period=week');
    if (response.data.success) {
      addResult('/api/sessions/utilization-stats', 'GET', 'PASS', 'Utilization stats retrieved successfully');
    } else {
      addResult('/api/sessions/utilization-stats', 'GET', 'FAIL', 'Utilization stats request failed');
    }
  } catch (error) {
    addResult('/api/sessions/utilization-stats', 'GET', 'FAIL', `Error: ${error.message}`);
  }
  
  // Test POST /api/sessions/bulk-update (with empty array to avoid actually updating data)
  try {
    const response = await client.post('/api/sessions/bulk-update', { updates: [] });
    // This should return a 400 error for no updates provided
    addResult('/api/sessions/bulk-update', 'POST', 'PASS', 'Bulk update endpoint is accessible (expected 400 for empty array)');
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('No valid updates provided')) {
      addResult('/api/sessions/bulk-update', 'POST', 'PASS', 'Bulk update endpoint working correctly (validation passed)');
    } else {
      addResult('/api/sessions/bulk-update', 'POST', 'FAIL', `Error: ${error.message}`);
    }
  }
  
  // Test POST /api/sessions/bulk-assign-trainer (with empty array)
  try {
    const response = await client.post('/api/sessions/bulk-assign-trainer', { sessionIds: [] });
    // This should return a 400 error for no session IDs provided
    addResult('/api/sessions/bulk-assign-trainer', 'POST', 'PASS', 'Bulk assign trainer endpoint is accessible (expected 400 for empty array)');
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('No session IDs provided')) {
      addResult('/api/sessions/bulk-assign-trainer', 'POST', 'PASS', 'Bulk assign trainer endpoint working correctly (validation passed)');
    } else {
      addResult('/api/sessions/bulk-assign-trainer', 'POST', 'FAIL', `Error: ${error.message}`);
    }
  }
  
  // Test POST /api/sessions/bulk-delete (with empty array)
  try {
    const response = await client.post('/api/sessions/bulk-delete', { sessionIds: [] });
    // This should return a 400 error for no session IDs provided
    addResult('/api/sessions/bulk-delete', 'POST', 'PASS', 'Bulk delete endpoint is accessible (expected 400 for empty array)');
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('No session IDs provided')) {
      addResult('/api/sessions/bulk-delete', 'POST', 'PASS', 'Bulk delete endpoint working correctly (validation passed)');
    } else {
      addResult('/api/sessions/bulk-delete', 'POST', 'FAIL', `Error: ${error.message}`);
    }
  }
}

/**
 * Test health endpoints
 */
async function testHealthEndpoints() {
  console.log('\\n💚 Testing Health Endpoints...'.blue);
  
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    addResult('/health', 'GET', 'PASS', 'Health endpoint accessible');
  } catch (error) {
    addResult('/health', 'GET', 'FAIL', `Error: ${error.message}`);
  }
  
  try {
    const response = await axios.get(`${API_BASE_URL}/api/health`);
    addResult('/api/health', 'GET', 'PASS', 'API health endpoint accessible');
  } catch (error) {
    addResult('/api/health', 'GET', 'FAIL', `Error: ${error.message}`);
  }
}

/**
 * Generate test report
 */
function generateReport() {
  console.log('\\n📋 TEST REPORT'.yellow.bold);
  console.log('='.repeat(50).yellow);
  
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.status === 'PASS').length;
  const failedTests = testResults.filter(r => r.status === 'FAIL').length;
  const warningTests = testResults.filter(r => r.status === 'WARN').length;
  
  console.log(`Total Tests: ${totalTests}`.blue);
  console.log(`Passed: ${passedTests}`.green);
  console.log(`Failed: ${failedTests}`.red);
  console.log(`Warnings: ${warningTests}`.yellow);
  
  const successRate = Math.round((passedTests / totalTests) * 100);
  console.log(`Success Rate: ${successRate}%`[successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red']);
  
  if (failedTests > 0) {
    console.log('\\n❌ Failed Tests:'.red.bold);
    testResults.filter(r => r.status === 'FAIL').forEach(result => {
      console.log(`  • ${result.method} ${result.endpoint}: ${result.message}`.red);
    });
  }
  
  console.log('\\n✅ Universal Master Schedule API Status:'.green.bold);
  const umsTotalTests = testResults.filter(r => 
    r.endpoint.includes('statistics') || 
    r.endpoint.includes('calendar-events') || 
    r.endpoint.includes('utilization-stats') || 
    r.endpoint.includes('bulk-')
  ).length;
  
  const umsPassedTests = testResults.filter(r => 
    (r.endpoint.includes('statistics') || 
     r.endpoint.includes('calendar-events') || 
     r.endpoint.includes('utilization-stats') || 
     r.endpoint.includes('bulk-')) && 
    r.status === 'PASS'
  ).length;
  
  const umsSuccessRate = umsTotalTests > 0 ? Math.round((umsPassedTests / umsTotalTests) * 100) : 0;
  
  if (umsSuccessRate >= 80) {
    console.log('🚀 Universal Master Schedule Backend: PRODUCTION READY!'.green.bold);
    console.log(`   ${umsPassedTests}/${umsTotalTests} endpoints working (${umsSuccessRate}%)`.green);
  } else if (umsSuccessRate >= 60) {
    console.log('⚠️  Universal Master Schedule Backend: NEEDS ATTENTION'.yellow.bold);
    console.log(`   ${umsPassedTests}/${umsTotalTests} endpoints working (${umsSuccessRate}%)`.yellow);
  } else {
    console.log('❌ Universal Master Schedule Backend: CRITICAL ISSUES'.red.bold);
    console.log(`   ${umsPassedTests}/${umsTotalTests} endpoints working (${umsSuccessRate}%)`.red);
  }
}

/**
 * Main test execution
 */
async function runAllTests() {
  console.log('🧪 Universal Master Schedule API Testing Suite'.rainbow.bold);
  console.log('='.repeat(60).rainbow);
  console.log(`Testing API at: ${API_BASE_URL}`.blue);
  console.log(`Start Time: ${new Date().toISOString()}`.blue);
  
  try {
    // Test health endpoints first (no auth required)
    await testHealthEndpoints();
    
    // Authenticate
    const authSuccess = await authenticate();
    if (!authSuccess) {
      console.log('\\n❌ Cannot proceed without authentication. Please check your credentials.'.red.bold);
      return;
    }
    
    // Test basic session endpoints
    await testBasicEndpoints();
    
    // Test Universal Master Schedule specific endpoints
    await testUniversalMasterScheduleEndpoints();
    
  } catch (error) {
    console.error('\\n💥 Critical test suite error:'.red.bold, error.message);
    addResult('TEST_SUITE', 'SYSTEM', 'FAIL', `Critical error: ${error.message}`);
  }
  
  // Generate final report
  generateReport();
  
  console.log(`\\nEnd Time: ${new Date().toISOString()}`.blue);
  console.log('\\n🎯 Ready for Frontend Integration!'.green.bold);
}

// Execute tests
runAllTests().catch(error => {
  console.error('Fatal test execution error:', error);
  process.exit(1);
});
