#!/usr/bin/env node

import fs from 'fs';

const jsFile = './frontend/dist/assets/index-DT2GPtWc.js';

console.log('🔍 Checking main JavaScript file for backend URLs...\n');

try {
  console.log(`📄 Reading: ${jsFile}`);
  const content = fs.readFileSync(jsFile, 'utf8');
  
  // Check for old URL pattern
  const oldUrlMatches = content.match(/ss-pt-new\.onrender\.com/g);
  const newUrlMatches = content.match(/swan-studios-api\.onrender\.com/g);
  
  console.log('\n🎯 URL ANALYSIS:');
  
  if (oldUrlMatches) {
    console.log(`❌ Found ${oldUrlMatches.length} instances of "ss-pt-new.onrender.com"`);
    console.log('   This is the PROBLEM - old URL is baked into the build!');
  } else {
    console.log('✅ No instances of old URL "ss-pt-new.onrender.com" found');
  }
  
  if (newUrlMatches) {
    console.log(`✅ Found ${newUrlMatches.length} instances of "swan-studios-api.onrender.com"`);
  } else {
    console.log('❌ No instances of correct URL "swan-studios-api.onrender.com" found');
  }
  
  // Also check for localhost patterns in case there's dev config
  const localhostMatches = content.match(/localhost:10000/g);
  if (localhostMatches) {
    console.log(`⚠️  Found ${localhostMatches.length} instances of "localhost:10000" (dev config)`);
  }
  
  console.log('\n💡 NEXT STEPS:');
  if (oldUrlMatches && oldUrlMatches.length > 0) {
    console.log('Frontend needs to be REBUILT with correct environment variables:');
    console.log('1. cd frontend');
    console.log('2. npm run build');
    console.log('3. Deploy the new dist folder');
  } else if (newUrlMatches && newUrlMatches.length > 0) {
    console.log('Frontend appears to have correct URLs - deployment issue?');
  } else {
    console.log('No backend URLs found - check build configuration');
  }
  
} catch (error) {
  console.log(`❌ Error: ${error.message}`);
}
