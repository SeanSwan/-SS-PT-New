/**
 * Test Registration Script
 * This script tests the user registration endpoint directly without going through the frontend.
 * It helps identify potential issues with the registration process.
 */

import 'dotenv/config';
import axios from 'axios';
import util from 'util';

// Configure axios for detailed logging
axios.interceptors.request.use(request => {
  console.log('Starting Request:', {
    url: request.url,
    method: request.method,
    data: request.data
  });
  return request;
});

axios.interceptors.response.use(
  response => {
    console.log('Response Received:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
    return response;
  },
  error => {
    console.error('Response Error:', {
      message: error.message,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : 'No response data'
    });
    return Promise.reject(error);
  }
);

// Test data
const testUser = {
  firstName: "Test",
  lastName: "User",
  email: "testuser@example.com",
  username: "testuser",
  password: "TestUser123!",
  phone: "555-555-5555",
  dateOfBirth: "1990-01-01",
  gender: "male",
  weight: "75",
  height: "180",
  fitnessGoal: "muscle-gain",
  trainingExperience: "beginner",
  healthConcerns: "none",
  emergencyContact: "Emergency Contact 555-555-5555"
};

async function testRegistration() {
  // Try multiple potential ports to find the correct one
  const portOptions = [3000, 5000, 8000, 10000];
  let succeeded = false;
  
  // Get API URL from environment or try multiple ports
  const API_URL = process.env.API_URL;
  
  try {
    console.log('Testing registration with data:', util.inspect(testUser, { colors: true, depth: null }));
    
    // If API_URL is set, use that directly
    if (API_URL) {
      const apiUrl = `${API_URL}/api/auth/register`;
      console.log(`Sending request to configured URL: ${apiUrl}`);
      const response = await sendRequest(apiUrl);
      return response;
    }
    
    // Otherwise try multiple ports
    for (const port of portOptions) {
      const baseUrl = `http://localhost:${port}`;
      const apiUrl = `${baseUrl}/api/auth/register`;
      
      try {
        console.log(`Trying port ${port}: ${apiUrl}`);
        const response = await sendRequest(apiUrl);
        console.log(`Success on port ${port}!`);
        return response;
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log(`No server found on port ${port}, trying next port...`);
          continue;
        }
        // If we get a different error, it means the server is responding
        // but there's a problem with the request or processing
        console.log(`Server found on port ${port} but returned error:`, error.message);
        throw error;
      }
    }
    
    // If we get here, none of the ports worked
    throw new Error(`Could not connect to server on any port: ${portOptions.join(', ')}`);
  } catch (error) {
    console.error('Registration failed!');
    
    if (error.response) {
      console.error('Server responded with error:');
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Data:', util.inspect(error.response.data, { colors: true, depth: null }));
    } else {
      console.error('Error details:', error.message);
    }
    
    return { success: false, error };
  }
}

async function sendRequest(apiUrl) {
  const response = await axios.post(apiUrl, testUser, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  console.log('Registration successful!');
  console.log('Response:', util.inspect(response.data, { colors: true, depth: null }));
  
  return { success: true, data: response.data };
}

// Run the test
testRegistration().then(result => {
  console.log('Test completed with result:', result.success ? 'SUCCESS' : 'FAILURE');
  process.exit(0);
}).catch(err => {
  console.error('Unexpected error during test:', err);
  process.exit(1);
});
