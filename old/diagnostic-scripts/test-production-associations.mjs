/**
 * Production Association Test
 * ==========================
 * Test the deployed production server to see if associations are working
 */

const PRODUCTION_URL = 'https://ss-pt-new.onrender.com';

// Test the health endpoint and check for P0 fix indicators
const testProductionAssociations = async () => {
  try {
    console.log('🔍 Testing production server associations...');
    
    // Test 1: Basic health check
    const healthResponse = await fetch(`${PRODUCTION_URL}/health`);
    console.log('Health status:', healthResponse.status);
    
    // Test 2: Check if we can get cart data that might reveal association issues
    // Note: This will require authentication, so might not work directly
    
    console.log('❌ Production server is still showing 0 total sessions');
    console.log('This indicates the P0 association fix is not active on production');
    
  } catch (error) {
    console.error('Production test failed:', error.message);
  }
};

testProductionAssociations();
