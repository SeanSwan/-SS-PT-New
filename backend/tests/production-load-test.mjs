/**
 * PRODUCTION LOAD TEST SUITE
 * Tests reliability and performance of unified AI backend
 * 
 * Tests:
 * 1. API endpoint performance under load
 * 2. AI service response times
 * 3. Database connection pooling
 * 4. Rate limiting effectiveness
 * 5. Error handling under stress
 * 6. Memory usage patterns
 * 7. Concurrent user simulation
 */

import axios from 'axios';
import { performance } from 'perf_hooks';
import os from 'os';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const TEST_DURATION = 60000; // 60 seconds
const CONCURRENT_USERS = 50;
const REQUESTS_PER_USER = 20;

// Test results storage
const results = {
  endpoints: {},
  aiServices: {},
  database: {},
  security: {},
  overall: {}
};

// Helper: Sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Measure response time
async function measureResponseTime(endpoint, method = 'GET', data = null, headers = {}) {
  const start = performance.now();
  try {
    const response = await axios({
      method,
      url: `${API_BASE}${endpoint}`,
      data,
      headers,
      validateStatus: () => true // Accept all status codes
    });
    const end = performance.now();
    return {
      status: response.status,
      time: end - start,
      data: response.data,
      success: response.status >= 200 && response.status < 300
    };
  } catch (error) {
    const end = performance.now();
    return {
      status: error.response?.status || 500,
      time: end - start,
      error: error.message,
      success: false
    };
  }
}

// Test 1: API Endpoint Performance
async function testAPIEndpoints() {
  console.log('🧪 Testing API Endpoints Performance...');
  
  const endpoints = [
    { path: '/api/auth/login', method: 'POST', data: { email: 'test@example.com', password: 'test123' } },
    { path: '/api/client/profile', method: 'GET' },
    { path: '/api/client/dashboard', method: 'GET' },
    { path: '/api/gamification/points', method: 'GET' },
    { path: '/api/gamification/leaderboard', method: 'GET' }
  ];

  const results = [];
  
  for (const endpoint of endpoints) {
    const times = [];
    for (let i = 0; i < 10; i++) {
      const result = await measureResponseTime(endpoint.path, endpoint.method, endpoint.data);
      times.push(result.time);
      await sleep(100);
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    results.push({
      endpoint: endpoint.path,
      avg: avg.toFixed(2) + 'ms',
      min: min.toFixed(2) + 'ms',
      max: max.toFixed(2) + 'ms',
      p95: times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)].toFixed(2) + 'ms'
    });
  }
  
  console.table(results);
  return results;
}

// Test 2: AI Service Response Times
async function testAIServices() {
  console.log('🤖 Testing AI Service Response Times...');
  
  const aiTests = [
    {
      name: 'Workout Generator',
      path: '/api/ai/workout/generate',
      method: 'POST',
      data: { userId: 'test-user', focus: 'full-body', duration: 50 }
    },
    {
      name: 'Nutrition Planner',
      path: '/api/ai/nutrition/plan',
      method: 'POST',
      data: { userId: 'test-user', goal: 'weight-loss', calories: 2000 }
    },
    {
      name: 'Exercise Alternatives',
      path: '/api/ai/alternatives',
      method: 'POST',
      data: { exercise: 'squat', injury: 'knee' }
    },
    {
      name: 'Form Analysis',
      path: '/api/ai/form/analyze',
      method: 'POST',
      data: { videoUrl: 'test-video.mp4', exercise: 'squat' }
    },
    {
      name: 'Chatbot',
      path: '/api/ai/chat',
      method: 'POST',
      data: { message: 'What is a good leg workout?', context: {} }
    }
  ];

  const results = [];
  
  for (const test of aiTests) {
    const times = [];
    let successes = 0;
    
    for (let i = 0; i < 5; i++) {
      const result = await measureResponseTime(test.path, test.method, test.data);
      times.push(result.time);
      if (result.success) successes++;
      await sleep(500); // Longer delay for AI services
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    
    results.push({
      service: test.name,
      avgTime: avg.toFixed(2) + 'ms',
      successRate: `${(successes / 5 * 100).toFixed(0)}%`,
      status: avg < 3000 ? '✅ Fast' : avg < 5000 ? '⚠️ Acceptable' : '❌ Slow'
    });
  }
  
  console.table(results);
  return results;
}

// Test 3: Database Connection Pooling & Performance
async function testDatabasePerformance() {
  console.log('🗄️ Testing Database Performance...');
  
  const tests = [
    { name: 'Simple Query', path: '/api/test/db/simple' },
    { name: 'Complex Join', path: '/api/test/db/join' },
    { name: 'Write Operation', path: '/api/test/db/write', method: 'POST', data: { test: 'data' } },
    { name: 'Transaction', path: '/api/test/db/transaction', method: 'POST' }
  ];

  const results = [];
  
  for (const test of tests) {
    const times = [];
    for (let i = 0; i < 10; i++) {
      const result = await measureResponseTime(test.path, test.method || 'GET', test.data);
      times.push(result.time);
      await sleep(50);
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const throughput = (1000 / avg).toFixed(2); // Requests per second
    
    results.push({
      operation: test.name,
      avgTime: avg.toFixed(2) + 'ms',
      throughput: throughput + ' req/s',
      status: avg < 100 ? '✅ Excellent' : avg < 200 ? '✅ Good' : '⚠️ Slow'
    });
  }
  
  console.table(results);
  return results;
}

// Test 4: Rate Limiting & Security
async function testSecurity() {
  console.log('🔒 Testing Rate Limiting & Security...');
  
  const results = [];
  
  // Test 1: Rate limit (should block after 10 requests)
  console.log('  Testing rate limit (10 req/min)...');
  let blocked = 0;
  for (let i = 0; i < 15; i++) {
    const result = await measureResponseTime('/api/client/dashboard', 'GET', null, {
      'x-api-key': 'test-key-123'
    });
    if (result.status === 429) blocked++;
    await sleep(100);
  }
  
  results.push({
    test: 'Rate Limiting',
    blockedRequests: blocked + '/15',
    status: blocked >= 5 ? '✅ Working' : '❌ Failed'
  });

  // Test 2: Invalid API key
  const invalidKey = await measureResponseTime('/api/client/dashboard', 'GET', null, {
    'x-api-key': 'invalid-key'
  });
  
  results.push({
    test: 'Invalid API Key',
    status: invalidKey.status === 401 ? '✅ Blocked' : '❌ Allowed'
  });

  // Test 3: SQL injection attempt
  const sqlInjection = await measureResponseTime('/api/auth/login', 'POST', {
    email: "test' OR '1'='1",
    password: 'test'
  });
  
  results.push({
    test: 'SQL Injection',
    status: sqlInjection.status === 400 ? '✅ Blocked' : '❌ Vulnerable'
  });

  // Test 4: XSS attempt
  const xssAttempt = await measureResponseTime('/api/client/profile', 'PUT', {
    bio: '<script>alert("xss")</script>'
  });
  
  results.push({
    test: 'XSS Prevention',
    status: xssAttempt.status === 400 ? '✅ Sanitized' : '❌ Vulnerable'
  });

  console.table(results);
  return results;
}

// Test 5: Concurrent User Simulation
async function testConcurrentUsers() {
  console.log('👥 Testing Concurrent Users...');
  
  const startTime = performance.now();
  const promises = [];
  
  for (let user = 0; user < CONCURRENT_USERS; user++) {
    const delay = (user * 100); // Stagger requests
    const promise = sleep(delay).then(async () => {
      const userResults = [];
      
      for (let req = 0; req < REQUESTS_PER_USER; req++) {
        const endpoint = ['/api/client/dashboard', '/api/gamification/points', '/api/client/profile'][req % 3];
        const result = await measureResponseTime(endpoint);
        userResults.push(result);
        await sleep(50);
      }
      
      return userResults;
    });
    
    promises.push(promise);
  }
  
  const allResults = await Promise.all(promises);
  const endTime = performance.now();
  
  // Flatten results
  const flatResults = allResults.flat();
  const successful = flatResults.filter(r => r.success).length;
  const failed = flatResults.filter(r => !r.success).length;
  const avgTime = flatResults.reduce((sum, r) => sum + r.time, 0) / flatResults.length;
  const totalTime = endTime - startTime;
  
  const summary = {
    concurrentUsers: CONCURRENT_USERS,
    totalRequests: flatResults.length,
    successful: successful,
    failed: failed,
    successRate: `${((successful / flatResults.length) * 100).toFixed(2)}%`,
    avgResponseTime: avgTime.toFixed(2) + 'ms',
    totalTime: totalTime.toFixed(2) + 'ms',
    throughput: (flatResults.length / (totalTime / 1000)).toFixed(2) + ' req/s'
  };
  
  console.log('\n📊 Concurrent User Test Results:');
  console.table([summary]);
  
  return summary;
}

// Test 6: Memory & CPU Usage
async function testResourceUsage() {
  console.log('💾 Testing Resource Usage...');
  
  const initialMemory = process.memoryUsage();
  const initialCPU = process.cpuUsage();
  
  // Run intensive operations
  await testConcurrentUsers();
  
  const finalMemory = process.memoryUsage();
  const finalCPU = process.cpuUsage();
  
  const memoryIncrease = ((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(2);
  const cpuUser = ((finalCPU.user - initialCPU.user) / 1000000).toFixed(2);
  const cpuSystem = ((finalCPU.system - initialCPU.system) / 1000000).toFixed(2);
  
  const results = {
    memoryIncrease: memoryIncrease + ' MB',
    cpuUser: cpuUser + 's',
    cpuSystem: cpuSystem + 's',
    totalCPU: (parseFloat(cpuUser) + parseFloat(cpuSystem)).toFixed(2) + 's',
    status: memoryIncrease < 100 ? '✅ Healthy' : '⚠️ High Usage'
  };
  
  console.table([results]);
  return results;
}

// Test 7: Error Handling & Recovery
async function testErrorHandling() {
  console.log('⚠️ Testing Error Handling...');
  
  const tests = [
    { name: 'Database Timeout', path: '/api/test/error/timeout' },
    { name: 'Service Unavailable', path: '/api/test/error/unavailable' },
    { name: 'Invalid JSON', path: '/api/test/error/invalid-json', method: 'POST' },
    { name: 'Rate Limit Exceeded', path: '/api/test/error/rate-limit' }
  ];

  const results = [];
  
  for (const test of tests) {
    const result = await measureResponseTime(test.path, test.method || 'GET');
    
    results.push({
      scenario: test.name,
      status: result.status,
      responseTime: result.time.toFixed(2) + 'ms',
      hasRetry: result.status === 503 ? '✅ Yes' : 'N/A',
      graceful: result.status < 500 ? '✅ Yes' : '⚠️ Server Error'
    });
  }
  
  console.table(results);
  return results;
}

// Main Test Runner
async function runAllTests() {
  console.log('🚀 STARTING PRODUCTION LOAD TEST SUITE\n');
  console.log('='.repeat(60));
  
  try {
    // Run all tests
    results.endpoints = await testAPIEndpoints();
    results.aiServices = await testAIServices();
    results.database = await testDatabasePerformance();
    results.security = await testSecurity();
    results.overall.concurrent = await testConcurrentUsers();
    results.overall.resources = await testResourceUsage();
    results.overall.errors = await testErrorHandling();
    
    // Generate summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(60));
    
    const allTests = [
      ...results.endpoints,
      ...results.aiServices,
      ...results.database,
      ...results.security,
      ...results.overall.errors
    ];
    
    const passed = allTests.filter(t => 
      t.status === '✅ Working' || 
      t.status === '✅ Blocked' || 
      t.status === '✅ Sanitized' ||
      t.status === '✅ Healthy' ||
      t.status === '✅ Fast' ||
      t.status === '✅ Acceptable' ||
      t.status === '✅ Excellent' ||
      t.status === '✅ Good'
    ).length;
    
    const total = allTests.length;
    const passRate = ((passed / total) * 100).toFixed(1);
    
    console.log(`\n✅ Passed: ${passed}/${total} (${passRate}%)`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    
    if (parseFloat(passRate) >= 80) {
      console.log('\n🎉 SUITE PASSED - Ready for production deployment!');
    } else {
      console.log('\n⚠️  Some tests failed - review before deployment');
    }
    
    // Save detailed results
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(
      `backend/tests/results/load-test-${timestamp}.json`,
      JSON.stringify(results, null, 2)
    );
    
    console.log(`\n📄 Detailed results saved to: backend/tests/results/load-test-${timestamp}.json`);
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export {
  testAPIEndpoints,
  testAIServices,
  testDatabasePerformance,
  testSecurity,
  testConcurrentUsers,
  testResourceUsage,
  testErrorHandling,
  runAllTests
};