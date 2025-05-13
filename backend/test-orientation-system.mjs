// test-orientation-system.mjs
// Script to test the orientation system functionality

import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

console.log('🧪 Testing Orientation System');
console.log(`📡 API URL: ${API_URL}`);
console.log('=' .repeat(50));

// Test data
const testOrientation = {
  fullName: 'Test User',
  email: 'test@swanstudios.com',
  phone: '(555) 123-4567',
  healthInfo: 'No major health issues. Previous experience with fitness training.',
  waiverInitials: 'TU',
  trainingGoals: 'Improve overall fitness and build strength',
  experienceLevel: 'Intermediate'
};

async function testPublicSubmission() {
  console.log('\n1. Testing public orientation submission...');
  
  try {
    const response = await fetch(`${API_URL}/orientation/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testOrientation),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Public submission successful');
      console.log('📊 Response:', {
        id: data.data?.orientation?.id,
        status: data.data?.orientation?.status,
        message: data.message
      });
      return data.data?.orientation?.id;
    } else {
      console.log('❌ Public submission failed');
      console.log('📊 Error:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return null;
  }
}

async function testDuplicateSubmission() {
  console.log('\n2. Testing duplicate submission prevention...');
  
  try {
    const response = await fetch(`${API_URL}/orientation/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testOrientation),
    });
    
    const data = await response.json();
    
    if (response.status === 409) {
      console.log('✅ Duplicate prevention working');
      console.log('📊 Response:', data.message);
    } else {
      console.log('❌ Duplicate prevention not working');
      console.log('📊 Response:', data);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

async function testValidationErrors() {
  console.log('\n3. Testing form validation...');
  
  const invalidData = {
    fullName: '',
    email: 'invalid-email',
    phone: '',
    healthInfo: '',
    waiverInitials: ''
  };
  
  try {
    const response = await fetch(`${API_URL}/orientation/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidData),
    });
    
    const data = await response.json();
    
    if (response.status === 400) {
      console.log('✅ Validation working correctly');
      console.log('📊 Validation errors:', data.errors?.length || 'Unknown');
    } else {
      console.log('❌ Validation not working');
      console.log('📊 Response:', data);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

async function runAllTests() {
  console.log('🔄 Starting orientation system tests...\n');
  
  // Test 1: Public submission
  const orientationId = await testPublicSubmission();
  
  // Test 2: Duplicate prevention
  await testDuplicateSubmission();
  
  // Test 3: Validation
  await testValidationErrors();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Tests completed!');
  
  if (orientationId) {
    console.log(`\n💡 Test orientation created with ID: ${orientationId}`);
    console.log('   You can view it in the admin dashboard at:');
    console.log(`   ${BASE_URL}/dashboard/client-orientation`);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});