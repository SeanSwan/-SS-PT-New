#!/usr/bin/env node
/**
 * Test Client Dashboard Endpoints
 */
import fetch from 'node-fetch';

const baseUrl = 'http://localhost:10000';
const testToken = 'mock-test-token'; // Replace with real token for testing

const endpoints = [
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
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const status = response.status;
      const statusText = response.ok ? 'SUCCESS' : 'FAILED';
      
      console.log(`${statusText}: ${endpoint} (${status})`);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.log(`  Error: ${errorData}`);
      }
    } catch (error) {
      console.log(`ERROR: ${endpoint} - ${error.message}`);
    }
  }
  
  console.log('\n🎯 Test completed. All endpoints should return 200 or auth-related errors.');
}

testDashboardEndpoints().catch(console.error);
