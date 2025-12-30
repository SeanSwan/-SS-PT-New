/**
 * Test Storefront API Endpoints
 * ==============================
 * Tests actual HTTP endpoints to verify purchase flow works
 */

import http from 'http';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(JSON.stringify(postData));
    }

    req.end();
  });
}

async function testAPIEndpoints() {
  console.log('🧪 TESTING STOREFRONT API ENDPOINTS');
  console.log('='.repeat(70));
  console.log('Server: http://localhost:5000\n');

  try {
    // Test 1: GET /api/storefront (list all packages)
    console.log('📦 Test 1: GET /api/storefront');
    const storefrontResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/storefront',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`   Status: ${storefrontResponse.statusCode}`);
    if (storefrontResponse.statusCode === 200 && storefrontResponse.body) {
      const packages = Array.isArray(storefrontResponse.body)
        ? storefrontResponse.body
        : storefrontResponse.body.data || storefrontResponse.body.packages || [];
      console.log(`   ✅ Found ${packages.length} packages`);
      packages.slice(0, 3).forEach(p => {
        console.log(`      - ${p.name}: $${p.totalCost || p.price}`);
      });
    } else {
      console.log(`   ❌ Failed: ${JSON.stringify(storefrontResponse.body)}`);
    }

    // Test 2: GET /api/storefront/calculate-price?sessions=25
    console.log('\n💰 Test 2: GET /api/storefront/calculate-price?sessions=25');
    const pricingResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/storefront/calculate-price?sessions=25',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`   Status: ${pricingResponse.statusCode}`);
    if (pricingResponse.statusCode === 200) {
      console.log(`   ✅ Pricing calculated:`);
      console.log(`      Response: ${JSON.stringify(pricingResponse.body, null, 2)}`);
    } else {
      console.log(`   ❌ Failed: ${JSON.stringify(pricingResponse.body)}`);
    }

    // Test 3: GET /api/storefront/:id (get specific package)
    console.log('\n🎯 Test 3: GET /api/storefront/50 (Silver Swan Wing)');
    const packageResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/storefront/50',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`   Status: ${packageResponse.statusCode}`);
    if (packageResponse.statusCode === 200) {
      console.log(`   ✅ Package found:`);
      console.log(`      Name: ${packageResponse.body.name || packageResponse.body.data?.name}`);
      console.log(`      Price: $${packageResponse.body.totalCost || packageResponse.body.data?.totalCost || packageResponse.body.price}`);
    } else {
      console.log(`   ❌ Failed: ${JSON.stringify(packageResponse.body)}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));

    const allPassed =
      storefrontResponse.statusCode === 200 &&
      pricingResponse.statusCode === 200 &&
      packageResponse.statusCode === 200;

    if (allPassed) {
      console.log('✅ All API endpoints working correctly');
      console.log('✅ Storefront purchase flow ready for testing\n');
    } else {
      console.log('⚠️  Some endpoints failed - check server logs\n');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('   Make sure the backend server is running: npm start');
    process.exit(1);
  }
}

testAPIEndpoints();
