/**
 * StoreFront API Debugging Script
 * This script tests the storefront API endpoints and provides detailed debug information
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000';

const testStorefrontAPI = async () => {
  console.log('🔍 Testing StoreFront API Endpoints...\n');
  
  try {
    // Test 1: Check if server is running
    console.log('Test 1: Checking server health...');
    try {
      const healthCheck = await axios.get(`${API_BASE_URL}/health`);
      console.log('✅ Server health check passed:', healthCheck.status);
      console.log('Server info:', healthCheck.data);
    } catch (error) {
      console.log('❌ Server health check failed:', error.message);
      console.log('Make sure the backend server is running on port 5000');
      return;
    }
    
    // Test 2: Test storefront endpoint
    console.log('\nTest 2: Testing /api/storefront endpoint...');
    try {
      const storefrontResponse = await axios.get(`${API_BASE_URL}/api/storefront`);
      console.log('✅ Storefront API response:', storefrontResponse.status);
      console.log('Data received:', JSON.stringify(storefrontResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Storefront API failed:', error.message);
      if (error.response) {
        console.log('Response status:', error.response.status);
        console.log('Response data:', error.response.data);
      }
    }
    
    // Test 3: Test with query parameters (as used in frontend)
    console.log('\nTest 3: Testing with query parameters...');
    try {
      const queryResponse = await axios.get(`${API_BASE_URL}/api/storefront?sortBy=displayOrder&sortOrder=ASC`);
      console.log('✅ Query parameter test passed:', queryResponse.status);
      console.log('Items count:', queryResponse.data.items?.length || 0);
    } catch (error) {
      console.log('❌ Query parameter test failed:', error.message);
    }
    
    // Test 4: Check database connection (if possible)
    console.log('\nTest 4: Checking database status...');
    try {
      const dbCheck = await axios.get(`${API_BASE_URL}/api/debug/database-status`);
      console.log('✅ Database check passed:', dbCheck.status);
      console.log('Database info:', dbCheck.data);
    } catch (error) {
      console.log('❌ Database check not available (may not be implemented)');
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
  }
};

// Run the test
testStorefrontAPI();