/**
 * Server Status Check Script
 * This script checks if the SwanStudios server is running on various ports
 * and tests basic endpoints to verify server functionality.
 */

import 'dotenv/config';
import axios from 'axios';
import util from 'util';

// Configure axios for detailed logging
axios.interceptors.request.use(request => {
  console.log('Starting Request:', {
    url: request.url,
    method: request.method
  });
  return request;
});

axios.interceptors.response.use(
  response => {
    console.log('Response Received:', {
      status: response.status,
      statusText: response.statusText
    });
    return response;
  },
  error => {
    if (error.response) {
      console.error('Response Error:', {
        message: error.message,
        status: error.response.status,
        statusText: error.response.statusText
      });
    } else if (error.request) {
      console.error('No Response:', {
        message: error.message,
        code: error.code
      });
    } else {
      console.error('Request Error:', {
        message: error.message
      });
    }
    return Promise.reject(error);
  }
);

// Ports to check
const portOptions = [3000, 5000, 8000, 10000];

/**
 * Check if server is running on a specific port
 * @param {number} port - Port to check
 * @returns {Promise<object>} - Result with status and details
 */
async function checkPort(port) {
  const baseUrl = `http://localhost:${port}`;
  
  try {
    console.log(`\n=== Checking server on port ${port} ===`);
    const healthUrl = `${baseUrl}/api/health`;
    console.log(`Testing health endpoint: ${healthUrl}`);
    
    const response = await axios.get(healthUrl, { timeout: 5000 });
    console.log(`Server is UP on port ${port}!`);
    console.log('Health check response:', util.inspect(response.data, { colors: true, depth: 2 }));
    
    return { 
      port, 
      status: 'UP', 
      data: response.data 
    };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(`No server running on port ${port}`);
      return { port, status: 'DOWN', reason: 'Connection refused' };
    }
    
    if (error.code === 'ETIMEDOUT') {
      console.log(`Connection timed out on port ${port}`);
      return { port, status: 'UNKNOWN', reason: 'Connection timed out' };
    }
    
    if (error.response) {
      // Server is running but returned an error
      console.log(`Server on port ${port} returned status ${error.response.status}`);
      return { 
        port, 
        status: 'ERROR', 
        statusCode: error.response.status,
        data: error.response.data
      };
    }
    
    console.log(`Unknown error checking port ${port}: ${error.message}`);
    return { port, status: 'ERROR', reason: error.message };
  }
}

/**
 * Try to access various API endpoints to check server functionality
 * @param {number} port - Port where server is running
 */
async function checkEndpoints(port) {
  const baseUrl = `http://localhost:${port}`;
  
  console.log(`\n=== Testing API endpoints on port ${port} ===`);
  
  const endpoints = [
    { path: '/', name: 'Root' },
    { path: '/health', name: 'Health' },
    { path: '/api/health', name: 'API Health' },
    { path: '/api/auth/validate-token', name: 'Auth Validation' },
    { path: '/api/storefront', name: 'Storefront' }
  ];
  
  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint.path}`;
    try {
      console.log(`Testing ${endpoint.name} endpoint: ${url}`);
      const response = await axios.get(url, { timeout: 5000 });
      console.log(`✅ ${endpoint.name} endpoint is UP! Status: ${response.status}`);
    } catch (error) {
      if (error.response) {
        console.log(`⚠️ ${endpoint.name} endpoint responded with status ${error.response.status}`);
      } else {
        console.log(`❌ ${endpoint.name} endpoint failed: ${error.message}`);
      }
    }
  }
}

/**
 * Main function to check server status on multiple ports
 */
async function checkServerStatus() {
  console.log('==================================================');
  console.log('SWAN STUDIOS SERVER STATUS CHECK');
  console.log('==================================================');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`Checking ports: ${portOptions.join(', ')}`);
  console.log('--------------------------------------------------');
  
  let activePort = null;
  
  // Check all ports first
  for (const port of portOptions) {
    const result = await checkPort(port);
    if (result.status === 'UP') {
      activePort = port;
      break; // Found a working server, no need to check more ports
    }
  }
  
  // If a server is found, test its endpoints
  if (activePort) {
    await checkEndpoints(activePort);
  } else {
    console.log('\n❌ No server is running on any of the checked ports!');
    console.log('Make sure your backend server is started with:');
    console.log('  npm run start-backend');
  }
  
  console.log('\n==================================================');
  console.log(`Check completed at: ${new Date().toISOString()}`);
  
  if (activePort) {
    console.log(`✅ SwanStudios server is UP and running on port ${activePort}`);
    console.log(`Access at: http://localhost:${activePort}/`);
  } else {
    console.log('❌ SwanStudios server is DOWN');
    console.log('Check your server logs for errors and restart the server');
  }
  console.log('==================================================');
}

// Run the check
checkServerStatus().catch(err => {
  console.error('Unexpected error during server check:', err);
  process.exit(1);
});
