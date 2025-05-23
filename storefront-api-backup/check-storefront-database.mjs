#!/usr/bin/env node

import StorefrontItem from './backend/models/StorefrontItem.mjs';
import './backend/models/index.mjs';

async function checkStorefrontDatabase() {
  try {
    console.log('🔍 Checking current storefront database state...\n');
    
    // Get all packages
    const allPackages = await StorefrontItem.findAll({
      order: [['packageType', 'ASC'], ['displayOrder', 'ASC']]
    });
    
    console.log(`📦 Total packages found: ${allPackages.length}\n`);
    
    if (allPackages.length === 0) {
      console.log('🚨 NO PACKAGES FOUND IN DATABASE');
      console.log('The storefront appears to be empty.');
      return;
    }
    
    // Group by type
    const fixedPackages = allPackages.filter(p => p.packageType === 'fixed');
    const monthlyPackages = allPackages.filter(p => p.packageType === 'monthly');
    
    console.log('=== CURRENT PACKAGES IN DATABASE ===\n');
    
    if (fixedPackages.length > 0) {
      console.log('📦 Fixed Session Packages:');
      fixedPackages.forEach((pkg, index) => {
        console.log(`${index + 1}. [ID: ${pkg.id}] ${pkg.name}`);
        console.log(`   - Sessions: ${pkg.sessions}`);
        console.log(`   - Price per session: $${pkg.pricePerSession}`);
        console.log(`   - Total price: $${pkg.price}`);
        console.log(`   - Theme: ${pkg.theme || 'none'}`);
        console.log(`   - Display order: ${pkg.displayOrder || 'none'}`);
        console.log('');
      });
    }
    
    if (monthlyPackages.length > 0) {
      console.log('📅 Monthly Packages:');
      monthlyPackages.forEach((pkg, index) => {
        console.log(`${index + 1}. [ID: ${pkg.id}] ${pkg.name}`);
        console.log(`   - Months: ${pkg.months}`);
        console.log(`   - Total sessions: ${pkg.totalSessions}`);
        console.log(`   - Sessions per week: ${pkg.sessionsPerWeek}`);
        console.log(`   - Price per session: $${pkg.pricePerSession}`);
        console.log(`   - Total price: $${pkg.price}`);
        console.log(`   - Theme: ${pkg.theme || 'none'}`);
        console.log(`   - Display order: ${pkg.displayOrder || 'none'}`);
        console.log('');
      });
    }
    
    // Look for duplicates
    console.log('🔍 Checking for duplicates...');
    const nameCount = new Map();
    const sessionCount = new Map();
    const monthCount = new Map();
    
    allPackages.forEach(pkg => {
      // Check name duplicates
      nameCount.set(pkg.name, (nameCount.get(pkg.name) || 0) + 1);
      
      // Check session/month duplicates
      if (pkg.packageType === 'fixed' && pkg.sessions) {
        const key = `fixed-${pkg.sessions}`;
        sessionCount.set(key, (sessionCount.get(key) || 0) + 1);
      }
      if (pkg.packageType === 'monthly' && pkg.months) {
        const key = `monthly-${pkg.months}`;
        monthCount.set(key, (monthCount.get(key) || 0) + 1);
      }
    });
    
    let duplicatesFound = false;
    
    // Check name duplicates
    for (const [name, count] of nameCount) {
      if (count > 1) {
        console.log(`❌ DUPLICATE NAME: ${name} (appears ${count} times)`);
        duplicatesFound = true;
      }
    }
    
    // Check session duplicates
    for (const [key, count] of sessionCount) {
      if (count > 1) {
        console.log(`❌ DUPLICATE SESSIONS: ${key} (appears ${count} times)`);
        duplicatesFound = true;
      }
    }
    
    // Check month duplicates
    for (const [key, count] of monthCount) {
      if (count > 1) {
        console.log(`❌ DUPLICATE MONTHS: ${key} (appears ${count} times)`);
        duplicatesFound = true;
      }
    }
    
    if (!duplicatesFound) {
      console.log('✅ No duplicates found');
    }
    
    // Check expected packages
    console.log('\n🎯 Checking for expected 8 packages...');
    
    const expectedFixed = [1, 8, 20, 50];
    const expectedMonthly = [3, 6, 9, 12];
    
    console.log('Expected fixed sessions:', expectedFixed);
    const foundFixed = fixedPackages.map(p => p.sessions).sort((a, b) => a - b);
    console.log('Found fixed sessions:', foundFixed);
    
    console.log('Expected monthly periods:', expectedMonthly);
    const foundMonthly = monthlyPackages.map(p => p.months).sort((a, b) => a - b);
    console.log('Found monthly periods:', foundMonthly);
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total packages: ${allPackages.length}`);
    console.log(`Fixed packages: ${fixedPackages.length}`);
    console.log(`Monthly packages: ${monthlyPackages.length}`);
    console.log(`Duplicates: ${duplicatesFound ? 'YES' : 'NO'}`);
    
    if (allPackages.length === 8 && fixedPackages.length === 4 && monthlyPackages.length === 4 && !duplicatesFound) {
      console.log('✅ Database looks correct!');
    } else {
      console.log('❌ Database issues detected - needs fixing');
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

checkStorefrontDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
