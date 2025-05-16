#!/usr/bin/env node
/**
 * Quick test to check for duplicate packages
 */

import axios from 'axios';

async function checkDuplicates() {
  try {
    console.log('🔍 Checking StoreFront for duplicates...\n');
    
    const response = await axios.get('http://localhost:3000/api/storefront');
    
    if (!response.data?.success || !response.data?.items) {
      console.log('❌ Invalid API response');
      return;
    }
    
    const items = response.data.items;
    console.log(`📦 Total items received: ${items.length}`);
    
    // Group by name and type to find duplicates
    const groups = {};
    const duplicates = [];
    
    items.forEach(item => {
      const key = `${item.name}-${item.packageType}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });
    
    // Check for duplicates
    Object.entries(groups).forEach(([key, group]) => {
      if (group.length > 1) {
        duplicates.push({ key, items: group });
      }
    });
    
    if (duplicates.length > 0) {
      console.log(`\n❌ Found ${duplicates.length} sets of duplicates:\n`);
      
      duplicates.forEach((dup, index) => {
        console.log(`${index + 1}. ${dup.key.replace('-', ' (')})`);
        dup.items.forEach(item => {
          console.log(`   - ID: ${item.id}, Price: $${item.displayPrice || item.price}, Order: ${item.displayOrder || 'N/A'}`);
        });
        console.log('');
      });
      
      console.log('🔧 To fix this issue:');
      console.log('   1. Run: fix-duplicate-packages.bat');
      console.log('   2. Or manually: cd backend && node scripts/remove-duplicate-storefront-items.mjs');
      
    } else {
      console.log('\n✅ No duplicates found!');
      
      // Show summary by type
      const fixed = items.filter(item => item.packageType === 'fixed');
      const monthly = items.filter(item => item.packageType === 'monthly');
      
      console.log(`\n📊 Package Summary:`);
      console.log(`   Fixed packages: ${fixed.length}`);
      console.log(`   Monthly packages: ${monthly.length}`);
      console.log(`   Total unique: ${fixed.length + monthly.length}`);
      
      console.log(`\n📋 All packages:`);
      [...fixed, ...monthly].forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name} (${item.packageType}) - $${item.displayPrice || item.price}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Error checking duplicates:', error.message);
    console.log('\n💡 Make sure the backend is running:');
    console.log('   cd backend && npm start');
  }
}

checkDuplicates();