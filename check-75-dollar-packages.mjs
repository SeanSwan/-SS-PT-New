#!/usr/bin/env node
/**
 * Check for packages with $75 per session
 */

import axios from 'axios';

async function check75DollarPackages() {
  try {
    console.log('🔍 Checking for packages with $75 per session...\n');
    
    const response = await axios.get('http://localhost:3000/api/storefront');
    
    if (!response.data?.success || !response.data?.items) {
      console.log('❌ Invalid API response');
      return;
    }
    
    const items = response.data.items;
    console.log(`📦 Total packages: ${items.length}`);
    
    // Find packages with $75 per session
    const packages75 = items.filter(item => item.pricePerSession === 75);
    
    if (packages75.length > 0) {
      console.log(`\n❌ Found ${packages75.length} packages with $75 per session:\n`);
      
      packages75.forEach((pkg, index) => {
        console.log(`${index + 1}. ${pkg.name} (${pkg.packageType})`);
        console.log(`   - ID: ${pkg.id}`);
        console.log(`   - Total Price: $${pkg.displayPrice || pkg.price}`);
        console.log(`   - Price per session: $${pkg.pricePerSession}`);
        console.log(`   - Sessions: ${pkg.sessions || pkg.totalSessions}`);
        console.log('');
      });
      
      console.log('🗑️ To remove these packages:');
      console.log('   1. Run: remove-75-dollar-packages.bat');
      console.log('   2. Or manually: cd backend && node scripts/remove-75-dollar-packages.mjs');
      
    } else {
      console.log('\n✅ No packages with $75 per session found!');
      
      // Show remaining packages
      console.log(`\n📋 All packages by price per session:`);
      const byPrice = items.sort((a, b) => (b.pricePerSession || 0) - (a.pricePerSession || 0));
      
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
    
  } catch (error) {
    console.log('❌ Error checking packages:', error.message);
    console.log('\n💡 Make sure the backend is running:');
    console.log('   cd backend && npm start');
  }
}

check75DollarPackages();