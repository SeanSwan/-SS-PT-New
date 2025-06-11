#!/usr/bin/env node
/**
 * Quick Storefront API Test - No Dependencies Version
 * ==================================================
 * Tests the storefront API to check current pricing data
 * Uses built-in Node.js http module (no external dependencies)
 */

import http from 'http';

console.log('🌐 TESTING STOREFRONT API FOR PRICING ISSUES');
console.log('============================================');
console.log('');

async function testStorefrontAPI() {
  try {
    console.log('📡 Connecting to: http://localhost:10000/api/storefront');
    
    // Use Node.js built-in http module
    const options = {
      hostname: 'localhost',
      port: 10000,
      path: '/api/storefront',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({ statusCode: res.statusCode, data: jsonData });
          } catch (parseError) {
            resolve({ statusCode: res.statusCode, data: data, error: 'Invalid JSON' });
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
    
    if (response.statusCode !== 200) {
      console.log(`❌ HTTP Error: ${response.statusCode}`);
      console.log('Response:', response.data);
      return;
    }
    
    const data = response.data;
    
    if (data.success) {
      console.log(`✅ API Response Success: ${data.items.length} packages found`);
      console.log('');
      console.log('💰 CURRENT PRICING DATA:');
      console.log('========================');
      
      if (data.items.length === 0) {
        console.log('❌ NO PACKAGES FOUND!');
        console.log('This is the root cause of $0 pricing issue.');
        console.log('The database has no storefront packages.');
        console.log('');
        console.log('🔧 SOLUTION: Run FIX-PRICING-NOW.bat to create packages');
      } else {
        let allPricesValid = true;
        let totalRevenue = 0;
        
        data.items.forEach((item, index) => {
          const price = parseFloat(item.price || 0);
          const pricePerSession = parseFloat(item.pricePerSession || 0);
          const displayPrice = parseFloat(item.displayPrice || 0);
          
          console.log(`${index + 1}. 📦 ${item.name}`);
          console.log(`   💰 Price: $${price}`);
          console.log(`   💰 Display Price: $${displayPrice}`);
          console.log(`   💰 Per Session: $${pricePerSession}`);
          console.log(`   📊 Type: ${item.packageType}`);
          console.log(`   ✅ Active: ${item.isActive}`);
          console.log('');
          
          if (price <= 0 || pricePerSession <= 0) {
            allPricesValid = false;
            console.log(`   ❌ INVALID PRICING for ${item.name}`);
          }
          
          totalRevenue += price;
        });
        
        console.log('📊 SUMMARY:');
        console.log(`   Total packages: ${data.items.length}`);
        console.log(`   Total revenue potential: $${totalRevenue.toFixed(2)}`);
        console.log(`   All prices valid: ${allPricesValid ? 'YES ✅' : 'NO ❌'}`);
        
        if (!allPricesValid) {
          console.log('');
          console.log('🔧 SOLUTION: Run FIX-PRICING-NOW.bat to fix pricing');
        } else {
          console.log('');
          console.log('🎉 PRICING DATA IS CORRECT!');
          console.log('If frontend shows $0, the issue is in the frontend display logic.');
        }
      }
    } else {
      console.log('❌ API Error Response:', data.message);
    }
    
  } catch (error) {
    console.log('❌ CONNECTION ERROR:', error.message);
    console.log('');
    console.log('This usually means:');
    console.log('1. Backend server is not running');
    console.log('2. Backend is running on different port');
    console.log('3. Database connection issues');
    console.log('');
    console.log('💡 SOLUTIONS:');
    console.log('- Start backend: npm run start (in backend directory)');
    console.log('- Check if server is running on port 10000');
    console.log('- Verify database connection');
    console.log('- Run the emergency pricing fix: FIX-PRICING-NOW.bat');
  }
}

// Add some environment info
console.log(`🔍 Current time: ${new Date().toISOString()}`);
console.log(`🔍 Node version: ${process.version}`);
console.log('');

testStorefrontAPI().then(() => {
  console.log('');
  console.log('🏁 API test completed');
}).catch(error => {
  console.error('💥 Test failed:', error);
});
