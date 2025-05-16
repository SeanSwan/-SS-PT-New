#!/usr/bin/env node
/**
 * Check for packages with sessions below $140
 */

import axios from 'axios';

async function checkPackagesBelow140() {
  try {
    console.log('🔍 Checking for packages with price per session below $140...\n');
    
    const response = await axios.get('http://localhost:3000/api/storefront');
    
    if (!response.data?.success || !response.data?.items) {
      console.log('❌ Invalid API response');
      return;
    }
    
    const items = response.data.items;
    console.log(`📦 Total packages: ${items.length}`);
    
    // Find packages with price per session below $140
    const packagesBelow140 = items.filter(item => {
      const pricePerSession = parseFloat(item.pricePerSession);
      return pricePerSession < 140;
    });
    
    if (packagesBelow140.length > 0) {
      console.log(`\n❌ Found ${packagesBelow140.length} packages with price per session below $140:\n`);
      
      packagesBelow140.forEach((pkg, index) => {
        console.log(`${index + 1}. ${pkg.name} (${pkg.packageType})`);
        console.log(`   - ID: ${pkg.id}`);
        console.log(`   - Total Price: $${pkg.displayPrice || pkg.price}`);
        console.log(`   - Price per session: $${pkg.pricePerSession}`);
        console.log(`   - Sessions: ${pkg.sessions || pkg.totalSessions}`);
        console.log('');
      });
      
      console.log('📋 These packages need to be removed or updated.');
      
    } else {
      console.log('\n✅ No packages with price per session below $140 found!');
      
      // Show all packages by price per session
      console.log(`\n📋 All packages by price per session (lowest to highest):`);
      const byPrice = items.sort((a, b) => 
        (parseFloat(a.pricePerSession) || 0) - (parseFloat(b.pricePerSession) || 0)
      );
      
      byPrice.forEach((pkg, index) => {
        console.log(`${index + 1}. ${pkg.name} - $${pkg.pricePerSession}/session (${pkg.packageType})`);
      });
    }
    
    // Summary by package type
    const fixed = items.filter(item => item.packageType === 'fixed');
    const monthly = items.filter(item => item.packageType === 'monthly');
    
    console.log(`\n📊 Summary:`);
    console.log(`   Fixed packages: ${fixed.length}`);
    console.log(`   Monthly packages: ${monthly.length}`);
    console.log(`   Total: ${items.length}`);
    
    // Minimum price per session
    const minPrice = Math.min(...items.map(item => parseFloat(item.pricePerSession) || 0));
    console.log(`   Minimum price per session: $${minPrice}`);
    
  } catch (error) {
    console.log('❌ Error checking packages:', error.message);
    console.log('\n💡 Make sure the backend is running:');
    console.log('   cd backend && npm start');
  }
}

checkPackagesBelow140();