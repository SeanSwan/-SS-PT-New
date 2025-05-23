/**
 * Test Login API 
 * 
 * This script tests the login API endpoint directly 
 * to diagnose login issues with the actual API endpoint.
 * 
 * Run with: node test-login-api.mjs
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRootDir = path.resolve(__dirname, '../..');

// Load environment variables
const envPath = path.resolve(projectRootDir, '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}`);
  dotenv.config(); // Try default location
}

// Get port from environment
const PORT = process.env.PORT || 5000;
const API_URL = `http://localhost:${PORT}/api/auth/login`;

// Test credentials - update these if needed
const DEFAULT_USERNAME = process.env.ADMIN_USERNAME || 'ogpswan';
const DEFAULT_PASSWORD = 'Password123!'; // This should match what you set in admin-account-check.mjs

// Get credentials from command line arguments if provided
const args = process.argv.slice(2);
const username = args[0] || DEFAULT_USERNAME;
const password = args[1] || DEFAULT_PASSWORD;

/**
 * Test the login API endpoint
 */
async function testLoginAPI() {
  console.log('\n===== LOGIN API TEST =====\n');
  console.log(`Testing login API at: ${API_URL}`);
  console.log(`Username: ${username}`);
  console.log(`Password: ${password.replace(/./g, '*')}`);
  
  try {
    console.log('\nSending login request...');
    
    const response = await axios.post(API_URL, {
      username,
      password
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n✅ LOGIN SUCCESSFUL!');
    console.log('\nResponse status:', response.status);
    
    // Display token and user info
    if (response.data && response.data.token) {
      console.log('\nAuth token received (truncated):');
      console.log(response.data.token.substring(0, 20) + '...');
    }
    
    if (response.data && response.data.user) {
      console.log('\nUser details:');
      const { id, username, email, firstName, lastName, role } = response.data.user;
      console.log(`- ID: ${id}`);
      console.log(`- Username: ${username}`);
      console.log(`- Email: ${email}`);
      console.log(`- Name: ${firstName} ${lastName}`);
      console.log(`- Role: ${role}`);
    }
    
    console.log('\n===== TEST COMPLETE =====');
    
  } catch (error) {
    console.log('\n❌ LOGIN FAILED!');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log('\nResponse status:', error.response.status);
      console.log('Response data:', error.response.data);
      
      // Provide troubleshooting advice based on status code
      if (error.response.status === 401) {
        console.log('\nTroubleshooting for 401 Unauthorized:');
        console.log('1. Verify username and password are correct');
        console.log('2. Run the admin-account-check.mjs script to reset admin password');
        console.log('3. Check if the user is active in the database');
      } else if (error.response.status === 404) {
        console.log('\nTroubleshooting for 404 Not Found:');
        console.log('1. Verify the API URL is correct');
        console.log('2. Ensure the server is running');
        console.log('3. Check if the auth routes are correctly registered');
      } else if (error.response.status === 500) {
        console.log('\nTroubleshooting for 500 Internal Server Error:');
        console.log('1. Check server logs for errors');
        console.log('2. Verify database connection is working');
        console.log('3. Ensure all required environment variables are set');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.log('\nNo response received from server!');
      console.log('This typically means the server is not running or not accessible');
      console.log('\nTroubleshooting:');
      console.log(`1. Verify server is running on port ${PORT}`);
      console.log('2. Check for any firewall or network issues');
      console.log('3. Try starting the server with: cd backend && npm run dev');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('\nError setting up request:', error.message);
    }
    
    console.log('\n===== TEST FAILED =====');
  }
}

// Run the test
testLoginAPI();
