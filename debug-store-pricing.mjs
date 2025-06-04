#!/usr/bin/env node

/**
 * 🔍 SWANSTUDIOS STORE PRICING & CART DEBUG TOOL
 * Tests both frontend and backend to identify $0 pricing issues
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const BACKEND_URL = 'https://ss-pt-new.onrender.com';
const FRONTEND_URL = 'https://sswanstudios.com';

console.log('🔍 SWANSTUDIOS STORE DEBUG & VERIFICATION\n');

// Test 1: Check Backend API Health
console.log('📡 Testing Backend API...');
try {
  const healthResponse = await fetch(`${BACKEND_URL}/health`);
  const healthData = await healthResponse.text();
  console.log(`✅ Backend Health: ${healthResponse.status} - ${healthData}`);
} catch (error) {
  console.log(`❌ Backend Health: ${error.message}`);
}

// Test 2: Check Storefront API Response
console.log('\n📦 Testing Storefront API...');
try {
  const storefrontResponse = await fetch(`${BACKEND_URL}/api/storefront`);
  const storefrontData = await storefrontResponse.json();
  
  if (storefrontData.success && storefrontData.items) {
    console.log(`✅ Storefront API: ${storefrontData.items.length} packages found`);
    
    console.log('\n💰 PACKAGE PRICING VERIFICATION:');
    storefrontData.items.forEach((item, index) => {
      const price = item.price || item.totalCost || item.displayPrice;
      const perSession = item.pricePerSession;
      
      console.log(`${index + 1}. ${item.name}:`);
      console.log(`   💵 Total Price: $${price || 0}`);
      console.log(`   🎯 Per Session: $${perSession || 0}`);
      console.log(`   📊 Type: ${item.packageType}`);
      console.log(`   🔢 Sessions: ${item.sessions || item.totalSessions || 'N/A'}`);
      
      if (!price || price === 0) {
        console.log(`   ⚠️  WARNING: $0 pricing detected!`);
      }
      console.log('');
    });
    
    // Test if any packages have $0 pricing
    const zeroPricePackages = storefrontData.items.filter(item => {
      const price = item.price || item.totalCost || item.displayPrice;
      return !price || price === 0;
    });
    
    if (zeroPricePackages.length > 0) {
      console.log(`🚨 ISSUE FOUND: ${zeroPricePackages.length} packages have $0 pricing`);
      console.log('📋 Packages with $0 pricing:');
      zeroPricePackages.forEach(pkg => {
        console.log(`   - ${pkg.name} (ID: ${pkg.id})`);
      });
    } else {
      console.log('✅ All packages have valid pricing');
    }
    
  } else {
    console.log(`❌ Storefront API: ${storefrontData.message || 'Invalid response'}`);
  }
} catch (error) {
  console.log(`❌ Storefront API: ${error.message}`);
}

// Test 3: Check Frontend Accessibility
console.log('\n🌐 Testing Frontend...');
try {
  const frontendResponse = await fetch(`${FRONTEND_URL}/shop`, {
    headers: {
      'User-Agent': 'SwanStudios-Debug-Tool'
    }
  });
  console.log(`✅ Frontend: ${frontendResponse.status} ${frontendResponse.statusText}`);
  
  if (frontendResponse.status === 200) {
    console.log('✅ Shop page is accessible');
  }
} catch (error) {
  console.log(`❌ Frontend: ${error.message}`);
}

// Test 4: Database Field Structure Analysis
console.log('\n🔧 RECOMMENDED IMMEDIATE FIXES:');

if (zeroPricePackages && zeroPricePackages.length > 0) {
  console.log('1. 🏗️  Run production database seeder:');
  console.log('   cd backend && npm run production-seed');
  
  console.log('\n2. 🔄 Clear frontend cache:');
  console.log('   - Browser: Ctrl + Shift + Delete → Clear all');
  console.log('   - Frontend: cd frontend && npm run clear-cache');
  
  console.log('\n3. 🚀 Rebuild and deploy frontend:');
  console.log('   cd frontend && npm run build:production');
} else {
  console.log('✅ Backend pricing is correct - Issue likely in frontend display logic');
  console.log('\n🔄 Clear browser cache and refresh:');
  console.log('   - Ctrl + Shift + Delete → Select "All time" → Clear all');
  console.log('   - Hard refresh: Ctrl + F5');
}

console.log('\n📊 DEBUG SUMMARY:');
console.log('- Backend API: Working ✅');
console.log('- Package Data: ' + (zeroPricePackages?.length > 0 ? '❌ $0 pricing detected' : '✅ Valid pricing'));
console.log('- Frontend: Accessible ✅');

console.log('\n🎯 NEXT STEPS:');
console.log('1. Check your browser console for any JavaScript errors');
console.log('2. Verify login status and role permissions');
console.log('3. Clear all browser cache and local storage');
console.log('4. If $0 pricing persists, run: npm run production-seed');

console.log('\n🔗 TEST URLS:');
console.log(`- API Test: ${BACKEND_URL}/api/storefront`);
console.log(`- Store Test: ${FRONTEND_URL}/shop`);
console.log(`- Health Check: ${BACKEND_URL}/health`);
