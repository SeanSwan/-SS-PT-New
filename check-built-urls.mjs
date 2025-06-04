#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const distDir = './frontend/dist/assets';

function searchForUrls(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Search for specific URL patterns
    const patterns = [
      /https:\/\/ss-pt-new\.onrender\.com/g,
      /https:\/\/swan-studios-api\.onrender\.com/g,
      /ss-pt-new\.onrender\.com/g,
      /swan-studios-api\.onrender\.com/g
    ];
    
    const results = [];
    
    patterns.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        const patternNames = [
          'https://ss-pt-new.onrender.com',
          'https://swan-studios-api.onrender.com', 
          'ss-pt-new.onrender.com',
          'swan-studios-api.onrender.com'
        ];
        results.push(`Found ${matches.length} instances of "${patternNames[index]}" in ${path.basename(filePath)}`);
      }
    });
    
    return results;
  } catch (error) {
    return [`Error reading ${filePath}: ${error.message}`];
  }
}

console.log('🔍 Checking built frontend assets for backend URLs...\n');

if (!fs.existsSync(distDir)) {
  console.log('❌ Frontend dist/assets directory not found');
  process.exit(1);
}

const files = fs.readdirSync(distDir);
const jsFiles = files.filter(file => file.endsWith('.js') && !file.endsWith('.map'));

console.log(`📁 Checking ${jsFiles.length} JavaScript files in ${distDir}...\n`);

let foundAnyOldUrl = false;
let foundAnyNewUrl = false;

jsFiles.forEach(file => {
  const filePath = path.join(distDir, file);
  const results = searchForUrls(filePath);
  
  if (results.length > 0) {
    console.log(`📄 ${file}:`);
    results.forEach(result => {
      console.log(`  ${result}`);
      if (result.includes('ss-pt-new.onrender.com')) {
        foundAnyOldUrl = true;
      }
      if (result.includes('swan-studios-api.onrender.com')) {
        foundAnyNewUrl = true;
      }
    });
    console.log('');
  }
});

console.log('\n🎯 SUMMARY:');
if (foundAnyOldUrl) {
  console.log('❌ PROBLEM: Found old backend URL (ss-pt-new.onrender.com) in built files');
  console.log('   This explains why the frontend is calling the wrong backend!');
} else {
  console.log('✅ No old backend URL found in built files');
}

if (foundAnyNewUrl) {
  console.log('✅ Found correct backend URL (swan-studios-api.onrender.com) in built files');
} else {
  console.log('❌ PROBLEM: Correct backend URL not found in built files');
}

if (foundAnyOldUrl) {
  console.log('\n💡 SOLUTION: Frontend needs to be rebuilt and redeployed with correct configuration');
  console.log('   1. Run: cd frontend && npm run build');
  console.log('   2. Redeploy the dist folder to the static hosting service');
}
