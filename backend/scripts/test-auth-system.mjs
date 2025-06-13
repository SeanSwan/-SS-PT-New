// Authentication system tester
// Fixes missing script referenced in backend package.json

import axios from 'axios';
import chalk from 'chalk';

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://swanstudios-backend.onrender.com'
  : 'http://localhost:10000';

export async function testAuthSystem() {
  console.log(chalk.blue('🔐 Testing Authentication System'));
  console.log(chalk.gray(`Base URL: ${BASE_URL}`));
  console.log(chalk.gray('=' .repeat(50)));
  
  const tests = [];
  
  // Test 1: Health endpoint
  try {
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 10000 });
    tests.push({
      name: 'Health Endpoint',
      status: 'PASS',
      details: `Status: ${response.status}`,
      data: response.data
    });
  } catch (error) {
    tests.push({
      name: 'Health Endpoint',
      status: 'FAIL',
      details: `Error: ${error.message}`,
      error: error.code
    });
  }
  
  // Test 2: Auth endpoints exist
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'nonexistent',
      password: 'test'
    }, { 
      timeout: 10000,
      validateStatus: () => true // Accept any status
    });
    
    tests.push({
      name: 'Login Endpoint',
      status: response.status === 401 || response.status === 400 ? 'PASS' : 'WARN',
      details: `Status: ${response.status} (Expected 400/401 for invalid creds)`,
      statusCode: response.status
    });
  } catch (error) {
    tests.push({
      name: 'Login Endpoint',
      status: 'FAIL',
      details: `Connection error: ${error.message}`,
      error: error.code
    });
  }
  
  // Test 3: Registration endpoint
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/register`, {
      username: 'test_user_' + Date.now(),
      email: 'test@example.com',
      password: 'testpassword123'
    }, { 
      timeout: 10000,
      validateStatus: () => true
    });
    
    tests.push({
      name: 'Registration Endpoint',
      status: response.status < 500 ? 'PASS' : 'FAIL',
      details: `Status: ${response.status}`,
      statusCode: response.status
    });
  } catch (error) {
    tests.push({
      name: 'Registration Endpoint',
      status: 'FAIL',
      details: `Connection error: ${error.message}`,
      error: error.code
    });
  }
  
  // Display results
  tests.forEach(test => {
    const icon = test.status === 'PASS' ? '✅' : 
                 test.status === 'WARN' ? '⚠️' : '❌';
    const color = test.status === 'PASS' ? chalk.green :
                  test.status === 'WARN' ? chalk.yellow : chalk.red;
    
    console.log(`${icon} ${test.name.padEnd(25)} ${color(test.status)} - ${test.details}`);
  });
  
  const passCount = tests.filter(t => t.status === 'PASS').length;
  console.log(chalk.gray('\n' + '='.repeat(50)));
  console.log(chalk.blue(`Auth System: ${passCount}/${tests.length} tests passed`));
  
  return tests;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  testAuthSystem().catch(console.error);
}
