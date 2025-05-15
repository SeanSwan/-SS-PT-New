#!/usr/bin/env node
/**
 * Authentication System Test Script
 * Tests the improved authentication flow between frontend and backend
 */

import axios from 'axios';
import chalk from 'chalk';

const API_BASE = 'http://localhost:5000/api';
const FRONTEND_BASE = 'http://localhost:5173';

// Test users for authentication
const testUsers = [
  {
    username: 'admin@test.com',
    password: 'admin123',
    expectedRole: 'admin',
    name: 'Admin User'
  },
  {
    username: 'trainer@test.com', 
    password: 'trainer123',
    expectedRole: 'trainer',
    name: 'Trainer User'
  },
  {
    username: 'client@test.com',
    password: 'client123',
    expectedRole: 'client',
    name: 'Client User'
  }
];

const log = {
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  header: (msg) => console.log(chalk.bgBlue.white.bold(`\n ${msg} `))
};

async function testBackendConnection() {
  log.header('Testing Backend Connection');
  
  try {
    const response = await axios.get(`${API_BASE}/health`, { timeout: 5000 });
    log.success(`Backend is running: ${response.status}`);
    return true;
  } catch (error) {
    log.error(`Backend connection failed: ${error.message}`);
    return false;
  }
}

async function testFrontendConnection() {
  log.header('Testing Frontend Connection');
  
  try {
    const response = await axios.get(FRONTEND_BASE, { timeout: 5000 });
    log.success(`Frontend is running: ${response.status}`);
    return true;
  } catch (error) {
    log.error(`Frontend connection failed: ${error.message}`);
    return false;
  }
}

async function testUserAuthentication(user) {
  log.header(`Testing Authentication: ${user.name}`);
  
  try {
    // Test login
    log.info(`Attempting login for ${user.username}...`);
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: user.username,
      password: user.password
    });
    
    if (loginResponse.data.success && loginResponse.data.token) {
      log.success(`Login successful for ${user.username}`);
      
      const token = loginResponse.data.token;
      const userData = loginResponse.data.user;
      
      // Verify user role
      if (userData.role === user.expectedRole) {
        log.success(`Role verification passed: ${userData.role}`);
      } else {
        log.error(`Role mismatch: expected ${user.expectedRole}, got ${userData.role}`);
      }
      
      // Test protected route access
      log.info('Testing protected route access...');
      const meResponse = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (meResponse.data.user) {
        log.success('Protected route access successful');
      } else {
        log.error('Protected route access failed');
      }
      
      // Test role-specific access
      if (user.expectedRole === 'admin') {
        log.info('Testing admin route access...');
        try {
          const adminResponse = await axios.get(`${API_BASE}/auth/stats`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          log.success('Admin route access successful');
        } catch (adminError) {
          log.error(`Admin route access failed: ${adminError.response?.data?.message || adminError.message}`);
        }
      }
      
      return true;
    } else {
      log.error(`Login failed for ${user.username}: ${loginResponse.data.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    log.error(`Authentication test failed for ${user.username}: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testTokenRefresh(user) {
  log.header(`Testing Token Refresh: ${user.name}`);
  
  try {
    // Login to get a token
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: user.username,
      password: user.password
    });
    
    const token = loginResponse.data.token;
    
    // Wait a moment then test refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    log.info('Testing token refresh...');
    const refreshResponse = await axios.post(`${API_BASE}/auth/refresh`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (refreshResponse.data.token) {
      log.success('Token refresh successful');
      return true;
    } else {
      log.error('Token refresh failed');
      return false;
    }
  } catch (error) {
    log.error(`Token refresh test failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testLogout(user) {
  log.header(`Testing Logout: ${user.name}`);
  
  try {
    // Login first
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: user.username,
      password: user.password
    });
    
    const token = loginResponse.data.token;
    
    // Test logout
    log.info('Testing logout...');
    const logoutResponse = await axios.post(`${API_BASE}/auth/logout`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (logoutResponse.data.success) {
      log.success('Logout successful');
      
      // Try to access protected route with the same token
      try {
        await axios.get(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        log.error('Token still valid after logout (should be invalid)');
        return false;
      } catch (authError) {
        log.success('Token properly invalidated after logout');
        return true;
      }
    } else {
      log.error('Logout failed');
      return false;
    }
  } catch (error) {
    log.error(`Logout test failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function runTests() {
  log.header('SwanStudios Authentication System Tests');
  
  const results = {
    backendConnection: false,
    frontendConnection: false,
    userAuthentication: {},
    tokenRefresh: {},
    logout: {}
  };
  
  // Test connections
  results.backendConnection = await testBackendConnection();
  results.frontendConnection = await testFrontendConnection();
  
  if (!results.backendConnection) {
    log.error('Backend is not running. Please start the backend server first.');
    process.exit(1);
  }
  
  // Test each user
  for (const user of testUsers) {
    results.userAuthentication[user.username] = await testUserAuthentication(user);
    results.tokenRefresh[user.username] = await testTokenRefresh(user);
    results.logout[user.username] = await testLogout(user);
  }
  
  // Print summary
  log.header('Test Results Summary');
  
  console.log(chalk.bold('\nConnection Tests:'));
  console.log(`Backend: ${results.backendConnection ? chalk.green('✓ PASS') : chalk.red('✗ FAIL')}`);
  console.log(`Frontend: ${results.frontendConnection ? chalk.green('✓ PASS') : chalk.red('✗ FAIL')}`);
  
  console.log(chalk.bold('\nAuthentication Tests:'));
  for (const user of testUsers) {
    const authResult = results.userAuthentication[user.username];
    const refreshResult = results.tokenRefresh[user.username];
    const logoutResult = results.logout[user.username];
    
    console.log(`\n${user.name} (${user.expectedRole}):`);
    console.log(`  Login:  ${authResult ? chalk.green('✓ PASS') : chalk.red('✗ FAIL')}`);
    console.log(`  Refresh: ${refreshResult ? chalk.green('✓ PASS') : chalk.red('✗ FAIL')}`);
    console.log(`  Logout:  ${logoutResult ? chalk.green('✓ PASS') : chalk.red('✗ FAIL')}`);
  }
  
  // Overall result
  const allTestsPassed = results.backendConnection && 
    Object.values(results.userAuthentication).every(Boolean) &&
    Object.values(results.tokenRefresh).every(Boolean) &&
    Object.values(results.logout).every(Boolean);
  
  console.log(chalk.bold(`\nOverall Result: ${allTestsPassed ? chalk.green('✓ ALL TESTS PASSED') : chalk.red('✗ SOME TESTS FAILED')}`));
  
  if (!allTestsPassed) {
    log.warn('Some tests failed. Check the logs above for details.');
    process.exit(1);
  } else {
    log.success('All authentication tests passed! The system is working correctly.');
  }
}

// Run the tests
runTests().catch(error => {
  log.error(`Test runner error: ${error.message}`);
  process.exit(1);
});
