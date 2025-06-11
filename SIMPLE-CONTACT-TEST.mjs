/**
 * SIMPLE CONTACT FORM TEST (No external dependencies)
 * ==================================================
 * Tests contact API using built-in Node.js capabilities
 */

console.log('🧪 SIMPLE CONTACT API TEST - Starting...\n');

const testData = JSON.stringify({
  name: 'Test User',
  email: 'test@example.com', 
  message: 'Test message from Node.js script',
  consultationType: 'general',
  priority: 'normal'
});

const options = {
  hostname: 'ss-pt-new.onrender.com',
  port: 443,
  path: '/api/contact',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData)
  }
};

// Use built-in https module
import https from 'https';

const req = https.request(options, (res) => {
  console.log(`📊 Status: ${res.statusCode}`);
  console.log(`📊 Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('📋 Response:', JSON.stringify(response, null, 2));
      
      if (res.statusCode === 200 && response.success) {
        console.log('\n✅ SUCCESS: Contact API is working!');
      } else {
        console.log('\n❌ FAILED: Contact API returned error');
      }
    } catch (e) {
      console.log('\n📄 Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('\n💥 ERROR:', error.message);
});

req.write(testData);
req.end();
