/**
 * BROWSER DEBUG HELPER
 * ====================
 * Add this to browser console to debug the pricing issue
 */

// Copy this entire script and paste into browser console (F12) while on /shop page

console.log('🔍 SWANSTUDIOS STORE DEBUGGING IN BROWSER');
console.log('=========================================');

// Check what component is loaded
console.log('1. 📋 COMPONENT CHECK:');
const componentName = document.querySelector('title')?.textContent;
console.log(`   Page title: ${componentName}`);

// Check for API calls in network
console.log('\n2. 🌐 NETWORK MONITORING:');
console.log('   Open Network tab and look for these requests:');
console.log('   - /api/storefront (should return package data)');
console.log('   - Any 404 or 500 errors');

// Check local storage for auth
console.log('\n3. 🔐 AUTH CHECK:');
const token = localStorage.getItem('token') || localStorage.getItem('authToken');
console.log(`   Auth token present: ${!!token}`);
console.log(`   Token length: ${token ? token.length : 0}`);

// Check if there are any error messages in console
console.log('\n4. ❌ ERROR CHECK:');
console.log('   Look for any red error messages in this console');
console.log('   Common issues:');
console.log('   - "Failed to fetch" = Backend not running');
console.log('   - "401 Unauthorized" = Auth problem');
console.log('   - "404 Not Found" = API endpoint missing');

// Check current packages displayed
console.log('\n5. 📦 PACKAGE DISPLAY CHECK:');
const priceElements = document.querySelectorAll('[aria-live="polite"]');
console.log(`   Found ${priceElements.length} price display areas`);

priceElements.forEach((el, i) => {
  const text = el.textContent || el.innerText;
  console.log(`   Price area ${i + 1}: "${text.substring(0, 50)}..."`);
});

// Check for hardcoded vs API data
console.log('\n6. 🎯 DATA SOURCE CHECK:');
console.log('   If you see "Click to reveal" but prices are $0 when revealed,');
console.log('   the issue is likely:');
console.log('   a) API is not returning data');
console.log('   b) API is returning data with $0 prices');
console.log('   c) Frontend is not processing API response correctly');

console.log('\n🔧 NEXT STEPS:');
console.log('1. Check Network tab for /api/storefront request');
console.log('2. If no request seen, the frontend is not calling the API');
console.log('3. If request fails, backend is not running');
console.log('4. If request succeeds but returns $0, database issue');
console.log('5. If request succeeds with correct prices, frontend parsing issue');

// Add a helper function to manually test the API
window.testStorefrontAPI = async function() {
  console.log('🧪 MANUAL API TEST:');
  try {
    const response = await fetch('/api/storefront');
    const data = await response.json();
    console.log('✅ API Response:', data);
    if (data.items) {
      console.log('📦 Packages found:');
      data.items.forEach(item => {
        console.log(`   ${item.name}: $${item.price || item.displayPrice || 0}`);
      });
    }
  } catch (error) {
    console.log('❌ API Test Failed:', error.message);
  }
};

console.log('\n🧪 Run testStorefrontAPI() to manually test the API');
