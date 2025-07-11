/**
 * Simple Production Cart Test - No Dependencies
 * ============================================
 * Test production cart API using built-in fetch
 */

const PRODUCTION_API = 'https://ss-pt-new.onrender.com';

async function testProductionCart() {
  console.log('🔍 Testing Production Cart API...\n');
  
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${PRODUCTION_API}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health Status:', healthData.status);
    
    // Test 2: Test cart endpoint (should trigger emergency debug messages)
    console.log('\n2. Testing cart endpoint (should trigger emergency debug)...');
    const cartResponse = await fetch(`${PRODUCTION_API}/api/cart`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://sswanstudios.com'
      }
    });
    
    console.log('Cart Response Status:', cartResponse.status);
    
    if (cartResponse.status === 401) {
      console.log('✅ Expected 401 (authentication required)');
      console.log('🎯 Cart route was accessed - check Render logs for emergency debug messages!');
    } else if (cartResponse.status === 200) {
      const cartData = await cartResponse.json();
      console.log('✅ Cart Response:', cartData);
    } else {
      const errorText = await cartResponse.text();
      console.log('⚠️ Unexpected response:', errorText);
    }
    
    console.log('\n🎯 CRITICAL: Check your Render production logs NOW for these messages:');
    console.log('  🚨 EMERGENCY: Setting up CartItem -> StorefrontItem association directly');
    console.log('  ✅ EMERGENCY: Direct associations established');
    console.log('  🔍 EMERGENCY DEBUG: Association status: true');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProductionCart();
