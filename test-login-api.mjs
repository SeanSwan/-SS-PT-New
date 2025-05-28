// Simple login test to see what's actually happening
import fetch from 'node-fetch';

const testLogin = async () => {
  try {
    console.log('🧪 Testing login API endpoint...\n');
    
    const loginData = {
      username: 'admin',
      password: 'admin123'
    };
    
    console.log('Sending login request with:', {
      username: loginData.username,
      password: '****'
    });
    
    const response = await fetch('http://localhost:10000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response status text: ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`Response body: ${responseText}`);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Login successful!');
      console.log('User:', data.user);
      console.log('Token received:', !!data.token ? 'Yes' : 'No');
    } else {
      console.log('❌ Login failed!');
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error data:', errorData);
      } catch (parseError) {
        console.log('Could not parse error response as JSON');
      }
    }
    
  } catch (error) {
    console.error('❌ Network error or server not responding:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Suggestion: Make sure the server is running on port 10000');
      console.log('Run: npm start or node server.mjs from the backend directory');
    }
  }
};

// Run the test
testLogin().catch(console.error);