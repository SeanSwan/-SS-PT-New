// Production-ready login test to identify the exact issue
// This mimics what the frontend would send
const testLoginDirect = async () => {
  console.log('🔍 Testing SwanStudios Login API...\n');
  
  const loginData = {
    username: 'admin',
    password: 'admin123'
  };
  
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'SwanStudios-Test/1.0'
    },
    body: JSON.stringify(loginData)
  };
  
  try {
    console.log('📤 Sending request to: http://localhost:10000/api/auth/login');
    console.log('📝 Request data:', { username: loginData.username, password: '****' });
    
    // Using node's built-in fetch (Node 18+) or you can use node-fetch
    const response = await fetch('http://localhost:10000/api/auth/login', requestOptions);
    
    console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📥 Response Headers:`, Object.fromEntries(response.headers));
    
    // Get response text first
    const responseText = await response.text();
    console.log(`📥 Raw Response: ${responseText}\n`);
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ LOGIN SUCCESS!');
        console.log('👤 User Info:', {
          id: data.user?.id,
          username: data.user?.username,
          email: data.user?.email,
          role: data.user?.role
        });
        console.log('🔑 Token received:', data.token ? 'Yes' : 'No');
      } catch (parseError) {
        console.log('⚠️ Response is OK but not valid JSON');
      }
    } else {
      console.log('❌ LOGIN FAILED!');
      try {
        const errorData = JSON.parse(responseText);
        console.log('💥 Error Details:', errorData);
        
        if (response.status === 500) {
          console.log('\n🔧 DEBUG SUGGESTIONS for 500 error:');
          console.log('1. Check server logs for detailed error');
          console.log('2. Verify database connection');
          console.log('3. Check if User model fields match database schema');
          console.log('4. Verify test user exists in database');
        }
      } catch (parseError) {
        console.log('💥 Could not parse error response as JSON');
        console.log('💥 Raw error response:', responseText);
      }
    }
    
  } catch (networkError) {
    console.error('🚫 Network Error:');
    console.error('Error:', networkError.message);
    console.error('Code:', networkError.code);
    
    if (networkError.code === 'ECONNREFUSED') {
      console.log('\n💡 SERVER NOT RUNNING:');
      console.log('1. Navigate to: C:\\Users\\ogpsw\\Desktop\\quick-pt\\SS-PT\\backend');
      console.log('2. Run: npm start');
      console.log('3. Or run: node server.mjs');
      console.log('4. Make sure it starts on port 10000');
    } else if (networkError.code === 'ENOTFOUND') {
      console.log('\n💡 DNS ISSUE:');
      console.log('Try using 127.0.0.1 instead of localhost');
    }
  }
};

// Run the test
testLoginDirect().catch(console.error);