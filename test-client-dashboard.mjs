#!/usr/bin/env node
/**
 * Test Client Dashboard Endpoints
 * Using built-in fetch (Node.js 18+) instead of node-fetch
 */

const baseUrl = 'http://localhost:10000';
const testToken = 'Bearer mock-test-token'; // Replace with real token for testing

const endpoints = [
  '/health',
  '/api/dashboard/stats',
  '/api/notifications', 
  '/api/gamification/user-stats',
  '/api/schedule?userId=6&includeUpcoming=true'
];

async function testDashboardEndpoints() {
  console.log('🧪 Testing Client Dashboard Endpoints');
  console.log('=' .repeat(40));
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
          'Authorization': testToken,
          'Content-Type': 'application/json'
        }
      });
      
      const status = response.status;
      const statusText = response.ok ? 'SUCCESS' : 'EXPECTED';
      
      console.log(`${statusText}: ${endpoint} (${status})`);
      
      // Don't show error details for auth-related failures (expected)
      if (!response.ok && status !== 401 && status !== 403) {
        const errorData = await response.text();
        console.log(`  Error: ${errorData.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`ERROR: ${endpoint} - ${error.message}`);
    }
  }
  
  console.log('\n🎯 Test completed.');
  console.log('✅ All endpoints should return 200 (success) or 401/403 (auth required)');
  console.log('❌ Only 404 (Not Found) or 500 (Server Error) indicate real problems');
}

testDashboardEndpoints().catch(console.error);
