#!/usr/bin/env node

/**
 * SwanStudios Homepage Dependencies Diagnostic - ES Module Version
 * Identifies exactly which component is causing the blank page issue
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 SWANSTUDIOS HOMEPAGE DIAGNOSTIC');
console.log('==================================\n');

const srcPath = path.join(__dirname, 'frontend/src');
const issues = [];
const warnings = [];
const found = [];

// Check if critical files exist
const criticalFiles = [
  // Main routing and app files
  { file: 'main.jsx', critical: true },
  { file: 'App.tsx', critical: true },
  { file: 'routes/main-routes.tsx', critical: true },
  
  // Layout and structure
  { file: 'components/Layout/layout.tsx', critical: true },
  { file: 'components/Header/header.tsx', critical: true },
  
  // HomePage component
  { file: 'pages/HomePage/components/HomePage.component.tsx', critical: true },
  
  // Context providers (critical for app startup)
  { file: 'context/AuthContext.tsx', critical: true },
  { file: 'context/CartContext.tsx', critical: true },
  { file: 'context/ThemeContext/index.ts', critical: true },
  { file: 'context/ToastContext.jsx', critical: true },
  { file: 'context/SessionContext.tsx', critical: true },
  { file: 'context/ConfigContext.tsx', critical: true },
  
  // Header dependencies
  { file: 'components/ShoppingCart/ShoppingCart.tsx', critical: true },
  { file: 'components/DashboardSelector/DashboardSelector.tsx', critical: true },
  { file: 'components/UserSwitcher/UserSwitcher.tsx', critical: true },
  { file: 'components/Header/EnhancedNotificationSection.tsx', critical: false },
  { file: 'components/Header/EnhancedNotificationSectionWrapper.tsx', critical: false },
  
  // Redux store
  { file: 'redux/store.ts', critical: true },
  { file: 'store/slices/authSlice.ts', critical: true },
  { file: 'store/slices/notificationSlice.ts', critical: false },
  
  // Utilities
  { file: 'utils/globalIconShim.jsx', critical: false },
  { file: 'utils/notificationInitializer.ts', critical: false },
  { file: 'utils/mockDataHelper.ts', critical: false },
  
  // Error handling
  { file: 'routes/error-boundary.tsx', critical: true }
];

console.log('📋 CHECKING CRITICAL FILES:');
console.log('===========================\n');

criticalFiles.forEach(({ file, critical }) => {
  const fullPath = path.join(srcPath, file);
  if (fs.existsSync(fullPath)) {
    found.push(`✅ ${file}${critical ? ' (CRITICAL)' : ''}`);
  } else {
    const message = `❌ MISSING: ${file}${critical ? ' (CRITICAL - WILL CAUSE BLANK PAGE)' : ''}`;
    if (critical) {
      issues.push(message);
    } else {
      warnings.push(message);
    }
  }
});

found.forEach(f => console.log(f));

if (warnings.length > 0) {
  console.log('\n⚠️  NON-CRITICAL MISSING FILES:');
  console.log('================================');
  warnings.forEach(w => console.log(w));
}

if (issues.length > 0) {
  console.log('\n💀 CRITICAL MISSING FILES (BLANK PAGE CAUSE):');
  console.log('=============================================');
  issues.forEach(i => console.log(i));
}

console.log('\n🔍 CHECKING IMPORT PATTERNS:');
console.log('============================\n');

// Check main files for import issues
const filesToCheck = [
  'App.tsx',
  'routes/main-routes.tsx', 
  'components/Layout/layout.tsx',
  'components/Header/header.tsx'
];

filesToCheck.forEach(file => {
  const fullPath = path.join(srcPath, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    
    console.log(`📄 ${file}:`);
    
    // Check for problematic import patterns
    if (content.includes('.tsx\'') || content.includes('.jsx\'')) {
      issues.push(`❌ ${file} contains file extensions in imports`);
    } else {
      console.log(`  ✅ No file extensions in imports`);
    }
    
    // Check for specific problematic imports
    const problematicImports = [
      'import.*from.*undefined',
      'import.*from.*null',
      'import.*from.*""'
    ];
    
    problematicImports.forEach(pattern => {
      if (new RegExp(pattern).test(content)) {
        issues.push(`❌ ${file} has problematic import: ${pattern}`);
      }
    });
    
    console.log(`  ✅ No obviously broken imports detected\n`);
  } else {
    issues.push(`❌ Cannot check ${file} - file missing`);
  }
});

console.log('🔍 CHECKING COMPONENT EXPORTS:');
console.log('==============================\n');

// Check if components properly export default
const componentsToCheck = [
  'pages/HomePage/components/HomePage.component.tsx',
  'components/Header/header.tsx',
  'components/Layout/layout.tsx',
  'components/ShoppingCart/ShoppingCart.tsx'
];

componentsToCheck.forEach(file => {
  const fullPath = path.join(srcPath, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    
    if (content.includes('export default')) {
      console.log(`✅ ${file} has default export`);
    } else {
      issues.push(`❌ ${file} missing default export`);
    }
  }
});

console.log('\n🎯 DIAGNOSIS SUMMARY:');
console.log('====================\n');

if (issues.length === 0) {
  console.log('🎉 NO CRITICAL ISSUES FOUND!');
  console.log('The blank page issue may be caused by:');
  console.log('1. Runtime JavaScript errors (check browser console)');
  console.log('2. Context provider initialization failures');
  console.log('3. Network/API call failures during startup');
  console.log('4. Theme or styling conflicts');
  console.log('\n💡 NEXT STEPS:');
  console.log('- Check browser developer console for JavaScript errors');
  console.log('- Test with network disabled to see if API calls are hanging');
  console.log('- Try running: npm run build to check for build-time errors');
} else {
  console.log(`💀 FOUND ${issues.length} CRITICAL ISSUES:`);
  issues.forEach(issue => console.log(issue));
  console.log('\n🔧 FIX THESE ISSUES FIRST - THEY WILL CAUSE BLANK PAGE');
}

if (warnings.length > 0) {
  console.log(`\n⚠️  Found ${warnings.length} non-critical warnings that should be addressed.`);
}

console.log('\n' + '='.repeat(50));
process.exit(issues.length > 0 ? 1 : 0);
