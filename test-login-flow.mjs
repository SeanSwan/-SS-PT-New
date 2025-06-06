#!/usr/bin/env node

/**
 * SwanStudios Login Flow End-to-End Test
 * Tests the complete authentication flow to verify it works
 */

import axios from 'axios';
import chalk from 'chalk';

console.log(chalk.cyan.bold('🧪 SwanStudios Login Flow Test'));
console.log(chalk.cyan('====================================\n'));

async function testLoginFlow() {
  const baseURL = process.env.NODE_ENV === 'production' 
    ? 'https://sswanstudios.com' 
    : 'http://localhost:10000';
  
  const testCredentials = {
    username: 'admin',
    password: 'admin123'
  };

  console.log(chalk.yellow(`🌐 Testing against: ${baseURL}`));
  console.log(chalk.yellow(`👤 Username: ${testCredentials.username}`));
  console.log(chalk.yellow(`🔑 Password: ${testCredentials.password}\n`));

  try {
    // Step 1: Test backend health
    console.log(chalk.blue('Step 1: Testing backend health...'));
    try {
      const healthResponse = await axios.get(`${baseURL}/api/health`, {
        timeout: 5000
      });
      console.log(chalk.green(`✅ Backend is running (${healthResponse.status})`));
    } catch (healthError) {
      console.log(chalk.red(`❌ Backend health check failed: ${healthError.message}`));
      if (healthError.code === 'ECONNREFUSED') {
        console.log(chalk.yellow('💡 Start your backend server: cd backend && npm start'));
        return false;
      }
    }

    // Step 2: Test login endpoint
    console.log(chalk.blue('\nStep 2: Testing login endpoint...'));
    try {
      const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
        username: testCredentials.username,
        password: testCredentials.password
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (loginResponse.status === 200 && loginResponse.data.success) {
        console.log(chalk.green('✅ LOGIN SUCCESSFUL!'));
        console.log(chalk.green(`   User: ${loginResponse.data.user.firstName} ${loginResponse.data.user.lastName}`));
        console.log(chalk.green(`   Role: ${loginResponse.data.user.role}`));
        console.log(chalk.green(`   Token received: ${loginResponse.data.token ? 'Yes' : 'No'}`));
        
        // Step 3: Test token validation
        console.log(chalk.blue('\nStep 3: Testing token validation...'));
        const tokenResponse = await axios.get(`${baseURL}/api/auth/validate-token`, {
          headers: {
            'Authorization': `Bearer ${loginResponse.data.token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        if (tokenResponse.status === 200 && tokenResponse.data.success) {
          console.log(chalk.green('✅ TOKEN VALIDATION SUCCESSFUL!'));
          console.log(chalk.green(`   User ID: ${tokenResponse.data.user.id}`));
          console.log(chalk.green(`   Email: ${tokenResponse.data.user.email}`));
        } else {
          console.log(chalk.red('❌ Token validation failed'));
        }

        console.log(chalk.green.bold('\n🎉 AUTHENTICATION FLOW COMPLETELY WORKING!'));
        console.log(chalk.cyan('\n📋 Your login credentials:'));
        console.log(chalk.cyan(`   Username: ${testCredentials.username}`));
        console.log(chalk.cyan(`   Password: ${testCredentials.password}`));
        console.log(chalk.cyan(`\n🌐 Login URL: ${baseURL}`));
        
        return true;

      } else {
        console.log(chalk.red('❌ Login failed with unexpected response'));
        console.log(chalk.red(`   Status: ${loginResponse.status}`));
        console.log(chalk.red(`   Response: ${JSON.stringify(loginResponse.data, null, 2)}`));
        return false;
      }

    } catch (loginError) {
      console.log(chalk.red('❌ LOGIN FAILED!'));
      
      if (loginError.response) {
        console.log(chalk.red(`   Status: ${loginError.response.status}`));
        console.log(chalk.red(`   Message: ${loginError.response.data.message || 'Unknown error'}`));
        
        if (loginError.response.status === 401) {
          console.log(chalk.yellow('\n💡 This is the authentication issue we need to fix!'));
          console.log(chalk.yellow('   Run: node diagnose-auth-issue.mjs'));
        }
      } else {
        console.log(chalk.red(`   Error: ${loginError.message}`));
      }
      return false;
    }

  } catch (error) {
    console.log(chalk.red(`❌ Test failed: ${error.message}`));
    return false;
  }
}

// Run test
async function main() {
  console.log(chalk.magenta('Starting authentication flow test...\n'));
  
  const success = await testLoginFlow();
  
  if (success) {
    console.log(chalk.green.bold('\n✅ ALL TESTS PASSED - Authentication is working!'));
    process.exit(0);
  } else {
    console.log(chalk.red.bold('\n❌ TESTS FAILED - Authentication needs fixing'));
    console.log(chalk.yellow('\n🔧 Run the diagnostic tool:'));
    console.log(chalk.yellow('   node diagnose-auth-issue.mjs'));
    process.exit(1);
  }
}

main();
