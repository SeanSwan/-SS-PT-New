/**
 * Test production login endpoint
 * Tests direct login to production backend
 */

import axios from 'axios';

const PROD_URL = 'https://ss-pt-new.onrender.com';

async function testLogin() {
  try {
    console.log('🧪 Testing login to:', PROD_URL);
    console.log('👤 Credentials: admin / admin123\n');

    const response = await axios.post(`${PROD_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    console.log('✅ Login Response Status:', response.status);
    console.log('📦 Response Data:\n');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n✅ Login successful!');
      console.log('👤 User:', response.data.user);
      console.log('🔑 Token:', response.data.token ? `${response.data.token.substring(0, 20)}...` : 'MISSING');
      console.log('🔄 Refresh Token:', response.data.refreshToken ? `${response.data.refreshToken.substring(0, 20)}...` : 'MISSING');

      // Check if all required fields are present
      const user = response.data.user;
      const requiredFields = ['id', 'email', 'username', 'firstName', 'lastName', 'role'];
      const missingFields = requiredFields.filter(field => !user[field]);

      if (missingFields.length > 0) {
        console.log('\n⚠️  Missing user fields:', missingFields);
      } else {
        console.log('\n✅ All required user fields present');
      }
    } else {
      console.log('\n❌ Login failed:', response.data.message);
    }

  } catch (error) {
    console.error('❌ Login Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testLogin();
