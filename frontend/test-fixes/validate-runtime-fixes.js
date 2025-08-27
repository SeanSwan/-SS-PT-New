#!/usr/bin/env node

/**
 * Runtime Fixes Validation Script
 * Tests that all the import fixes and error handling we added will work
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Validating SwanStudios Runtime Fixes...\n');

const srcPath = path.join(__dirname, '../src');
const issues = [];
const fixes = [];

// Test 1: Check App.tsx import extensions are removed
const appPath = path.join(srcPath, 'App.tsx');
if (fs.existsSync(appPath)) {
  const appContent = fs.readFileSync(appPath, 'utf8');
  
  if (appContent.includes(".tsx';") || appContent.includes(".jsx';")) {
    issues.push('❌ App.tsx still has file extensions in imports');
  } else {
    fixes.push('✅ App.tsx import extensions removed');
  }
  
  if (appContent.includes('try {') && appContent.includes('catch (')) {
    fixes.push('✅ App.tsx has error handling added');
  } else {
    issues.push('❌ App.tsx missing error handling');
  }
}

// Test 2: Check main.jsx import extensions are removed
const mainPath = path.join(srcPath, 'main.jsx');
if (fs.existsSync(mainPath)) {
  const mainContent = fs.readFileSync(mainPath, 'utf8');
  
  if (mainContent.includes(".jsx';")) {
    issues.push('❌ main.jsx still has file extensions in imports');
  } else {
    fixes.push('✅ main.jsx import extensions removed');
  }
}

// Test 3: Check critical files exist
const criticalFiles = [
  'utils/globalIconShim.jsx',
  'context/AuthContext.tsx',
  'hooks/useBackendConnection.jsx',
  'pages/HomePage/components/HomePage.component.tsx',
  'routes/main-routes.tsx'
];

criticalFiles.forEach(file => {
  if (fs.existsSync(path.join(srcPath, file))) {
    fixes.push(`✅ Critical file exists: ${file}`);
  } else {
    issues.push(`❌ Missing critical file: ${file}`);
  }
});

// Test 4: Check HomePage component is properly structured
const homePagePath = path.join(srcPath, 'pages/HomePage/components/HomePage.component.tsx');
if (fs.existsSync(homePagePath)) {
  const homePageContent = fs.readFileSync(homePagePath, 'utf8');
  
  if (homePageContent.includes('export default HomePage')) {
    fixes.push('✅ HomePage component properly exports');
  } else {
    issues.push('❌ HomePage component export issue');
  }
  
  if (homePageContent.includes('SwanStudios')) {
    fixes.push('✅ HomePage contains SwanStudios branding');
  } else {
    issues.push('❌ HomePage missing branding');
  }
}

// Summary
console.log('FIXES APPLIED:');
fixes.forEach(fix => console.log(fix));

if (issues.length > 0) {
  console.log('\nREMAINING ISSUES:');
  issues.forEach(issue => console.log(issue));
  console.log(`\n❌ ${issues.length} issues found - additional fixes needed`);
  process.exit(1);
} else {
  console.log(`\n🎉 ALL FIXES VALIDATED! ${fixes.length} improvements applied successfully.`);
  console.log('✅ Your SwanStudios homepage should now render properly!');
  process.exit(0);
}
