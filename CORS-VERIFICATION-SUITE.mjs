#!/usr/bin/env node

/**
 * CORS Verification Script - Ultimate Test Suite
 * ==============================================
 * Tests both platform-level and application-level CORS handling
 */

import chalk from 'chalk';

const API_BASE = 'https://swan-studios-api.onrender.com';
const FRONTEND_ORIGIN = 'https://sswanstudios.com';

console.log(chalk.cyan('🎯 SwanStudios CORS Verification Suite'));
console.log(chalk.cyan('====================================='));
console.log(`🌐 Testing API: ${API_BASE}`);
console.log(`🏠 Frontend Origin: ${FRONTEND_ORIGIN}\n`);

/**
 * Test 1: OPTIONS Preflight Request to /health
 */
async function testOptionsHealth() {
  console.log(chalk.yellow('📋 Test 1: OPTIONS Preflight to /health'));
  console.log('------------------------------------------');
  
  try {
    const command = `curl -X OPTIONS "${API_BASE}/health" \\
  -H "Origin: ${FRONTEND_ORIGIN}" \\
  -H "Access-Control-Request-Method: GET" \\
  -H "Access-Control-Request-Headers: Content-Type" \\
  -v -s 2>&1`;
    
    console.log(chalk.dim('Command:'));
    console.log(chalk.dim(command));
    console.log('\\nExpected Headers:');
    console.log('✅ Access-Control-Allow-Origin: https://sswanstudios.com');
    console.log('✅ Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
    console.log('✅ Access-Control-Allow-Credentials: true');
    console.log('✅ Status: 204 No Content');
    
  } catch (error) {
    console.error(chalk.red(`❌ Error: ${error.message}`));
  }
  
  console.log('\\n');
}

/**
 * Test 2: OPTIONS Preflight Request to /api/auth/login
 */
async function testOptionsLogin() {
  console.log(chalk.yellow('📋 Test 2: OPTIONS Preflight to /api/auth/login'));
  console.log('------------------------------------------------');
  
  try {
    const command = `curl -X OPTIONS "${API_BASE}/api/auth/login" \\
  -H "Origin: ${FRONTEND_ORIGIN}" \\
  -H "Access-Control-Request-Method: POST" \\
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \\
  -v -s 2>&1`;
    
    console.log(chalk.dim('Command:'));
    console.log(chalk.dim(command));
    console.log('\\nExpected Headers:');
    console.log('✅ Access-Control-Allow-Origin: https://sswanstudios.com');
    console.log('✅ Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
    console.log('✅ Access-Control-Allow-Headers: Content-Type, Authorization, ...');
    console.log('✅ Access-Control-Allow-Credentials: true');
    console.log('✅ Status: 204 No Content');
    
  } catch (error) {
    console.error(chalk.red(`❌ Error: ${error.message}`));
  }
  
  console.log('\\n');
}

/**
 * Test 3: Actual GET Request to /health
 */
async function testActualHealth() {
  console.log(chalk.yellow('📋 Test 3: Actual GET Request to /health'));
  console.log('------------------------------------------');
  
  try {
    const command = `curl -X GET "${API_BASE}/health" \\
  -H "Origin: ${FRONTEND_ORIGIN}" \\
  -v -s 2>&1`;
    
    console.log(chalk.dim('Command:'));
    console.log(chalk.dim(command));
    console.log('\\nExpected:');
    console.log('✅ Status: 200 OK');
    console.log('✅ JSON response with health status');
    console.log('✅ Access-Control-Allow-Origin: https://sswanstudios.com');
    
  } catch (error) {
    console.error(chalk.red(`❌ Error: ${error.message}`));
  }
  
  console.log('\\n');
}

/**
 * Test 4: Browser Simulation Test
 */
async function testBrowserSimulation() {
  console.log(chalk.yellow('📋 Test 4: Browser CORS Simulation'));
  console.log('------------------------------------');
  
  console.log('🌐 To test in browser console (https://sswanstudios.com):');
  console.log(chalk.cyan(`
// Test 1: Simple GET request (should work after OPTIONS preflight)
fetch('${API_BASE}/health', {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('✅ Health check status:', response.status);
  return response.json();
})
.then(data => console.log('✅ Health data:', data))
.catch(error => console.error('❌ Health error:', error));

// Test 2: Login simulation (should work after OPTIONS preflight)
fetch('${API_BASE}/api/auth/login', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'testpassword'
  })
})
.then(response => {
  console.log('✅ Login attempt status:', response.status);
  return response.json();
})
.then(data => console.log('Login response:', data))
.catch(error => console.error('❌ Login error:', error));
  `));
  
  console.log('\\n');
}

/**
 * Main execution
 */
async function runVerification() {
  console.log(chalk.green('🚀 Starting CORS Verification Tests\\n'));
  
  await testOptionsHealth();
  await testOptionsLogin();
  await testActualHealth();
  await testBrowserSimulation();
  
  console.log(chalk.green('🎉 CORS Verification Complete!'));
  console.log(chalk.cyan('📖 Instructions:'));
  console.log('1. Run the curl commands above in your terminal');
  console.log('2. Check for the expected headers in the responses');
  console.log('3. Test the browser simulation code in https://sswanstudios.com console');
  console.log('4. If tests pass, login should now work properly!');
}

// Run the verification
runVerification().catch(console.error);
