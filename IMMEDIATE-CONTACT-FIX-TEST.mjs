/**
 * IMMEDIATE CONTACT FORM FIX VERIFICATION
 * =====================================
 * Tests the contact form API directly to confirm it's working
 * before rebuilding and redeploying frontend
 */

console.log('🧪 CONTACT FORM API TEST - Starting verification...\n');

// Test data
const testContact = {
  name: 'Test User Fix',
  email: 'test@example.com',
  message: 'This is a test message to verify the contact form API is working correctly.',
  consultationType: 'general',
  priority: 'normal'
};

// Test the production backend URL
const BACKEND_URL = 'https://ss-pt-new.onrender.com';
const CONTACT_API_URL = `${BACKEND_URL}/api/contact`;

async function testContactAPI() {
  try {
    console.log(`📍 Testing: ${CONTACT_API_URL}`);
    console.log(`📦 Test Data:`, JSON.stringify(testContact, null, 2));
    console.log('');

    // Make the API call
    const response = await fetch(CONTACT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'SwanStudios-ContactTest/1.0'
      },
      body: JSON.stringify(testContact)
    });

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📊 Response Headers:`, Object.fromEntries(response.headers));

    const responseData = await response.json();
    console.log(`📋 Response Data:`, JSON.stringify(responseData, null, 2));

    if (response.ok && responseData.success) {
      console.log('\n✅ SUCCESS: Contact API is working perfectly!');
      console.log('📧 Email notifications:', responseData.notifications?.email?.success ? '✅ Working' : '❌ Failed');
      console.log('📱 SMS notifications:', responseData.notifications?.sms?.success ? '✅ Working' : '❌ Failed');
      console.log(`💾 Contact saved with ID: ${responseData.contact?.id}`);
      
      return true;
    } else {
      console.log('\n❌ FAILED: Contact API returned error');
      return false;
    }

  } catch (error) {
    console.error('\n💥 ERROR: Failed to test contact API');
    console.error('Error details:', error.message);
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('🔌 Connection failed - backend server may be down');
    }
    
    return false;
  }
}

async function testHealthEndpoint() {
  try {
    console.log('\n🏥 Testing health endpoint...');
    const healthUrl = `${BACKEND_URL}/api/contact/health`;
    
    const response = await fetch(healthUrl);
    const data = await response.json();
    
    console.log(`Health Check: ${response.status} - ${data.message}`);
    console.log(`Total contacts in DB: ${data.totalContacts}`);
    
    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error.message);
    return false;
  }
}

// Run the tests
async function runTests() {
  console.log('🎯 CONTACT FORM DIAGNOSTIC SUMMARY');
  console.log('=' .repeat(50));
  
  const healthOk = await testHealthEndpoint();
  const contactOk = await testContactAPI();
  
  console.log('\n📋 DIAGNOSTIC RESULTS:');
  console.log(`🏥 Backend Health: ${healthOk ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
  console.log(`📧 Contact API: ${contactOk ? '✅ WORKING' : '❌ BROKEN'}`);
  
  if (healthOk && contactOk) {
    console.log('\n🎉 BACKEND IS WORKING PERFECTLY!');
    console.log('🔧 Issue is confirmed to be in frontend environment configuration.');
    console.log('🚀 Proceed with frontend rebuild and redeploy.');
  } else {
    console.log('\n⚠️ BACKEND ISSUES DETECTED!');
    console.log('🔍 Check backend server status before proceeding with frontend fixes.');
  }
  
  console.log('\n📍 Next Steps:');
  console.log('1. Run: npm run build (in frontend folder)');
  console.log('2. Deploy frontend to production');
  console.log('3. Test contact form on https://sswanstudios.com/contact');
}

runTests().catch(console.error);
