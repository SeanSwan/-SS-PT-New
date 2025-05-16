#!/usr/bin/env node
/**
 * Check current packages in the StoreFront
 */

import axios from 'axios';

async function checkCurrentPackages() {
  try {
    console.log('🔍 Checking current StoreFront packages...\n');
    
    const response = await axios.get('http://localhost:3000/api/storefront');
    
    if (!response.data?.success) {
      console.log('❌ API Error:', response.data?.message || 'Unknown error');
      return;
    }
    
    const items = response.data.items || [];
    console.log(`📦 Total packages: ${items.length}`);
    
    if (items.length === 0) {
      console.log('\n✅ StoreFront is completely empty - no packages found');
      console.log('\nThis means:');
      console.log('   • No fixed packages');
      console.log('   • No monthly packages'); 
      console.log('   • No products to display');
      console.log('\nThe StoreFront will show the empty state message.');
      return;
    }
    
    // Group by package type
    const fixed = items.filter(item => item.packageType === 'fixed');
    const monthly = items.filter(item => item.packageType === 'monthly');
    
    console.log(`\n📊 Package breakdown:`);
    console.log(`   Fixed packages: ${fixed.length}`);
    console.log(`   Monthly packages: ${monthly.length}`);
    
    console.log(`\n📋 All packages:`);
    
    if (fixed.length > 0) {
      console.log('\n  Fixed Packages:');
      fixed.forEach((pkg, index) => {
        console.log(`    ${index + 1}. ${pkg.name}`);
        console.log(`       - Price: $${pkg.displayPrice || pkg.price}`);
        console.log(`       - Per session: $${pkg.pricePerSession}`);
        console.log(`       - Sessions: ${pkg.sessions}`);
      });
    }
    
    if (monthly.length > 0) {
      console.log('\n  Monthly Packages:');
      monthly.forEach((pkg, index) => {
        console.log(`    ${index + 1}. ${pkg.name}`);
        console.log(`       - Price: $${pkg.displayPrice || pkg.price}`);
        console.log(`       - Per session: $${pkg.pricePerSession}`);
        console.log(`       - Months: ${pkg.months}, Sessions: ${pkg.totalSessions}`);
      });
    }
    
    // Check for the packages we want to remove
    const targetPackages = [
      'Single Session Assessment',
      'Bronze Performance Package', 
      'Silver Elite Training'
    ];
    
    const foundTargets = items.filter(item => targetPackages.includes(item.name));
    
    if (foundTargets.length > 0) {
      console.log(`\n⚠️ Found ${foundTargets.length} packages to be removed:`);
      foundTargets.forEach(pkg => {
        console.log(`   - ${pkg.name} ($${pkg.pricePerSession}/session)`);
      });
      console.log('\n🗑️ To remove these, run: remove-all-packages.bat');
    }
    
  } catch (error) {
    console.log('❌ Error checking packages:', error.message);
    console.log('\n💡 Make sure the backend is running:');
    console.log('   cd backend && npm start');
  }
}

checkCurrentPackages();