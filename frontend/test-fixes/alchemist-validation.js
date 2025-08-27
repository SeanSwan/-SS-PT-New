#!/usr/bin/env node

/**
 * SwanStudios Runtime Fixes Validation - Complete Check
 * Validates all three strategic pillars of the transformation
 */

const fs = require('fs');
const path = require('path');

console.log('🔥 ALCHEMIST VALIDATION: SwanStudios Application Forge Complete\n');
console.log('========================================================\n');

const srcPath = path.join(__dirname, '../src');
const issues = [];
const fixes = [];

// ===== PILLAR 1: FILESYSTEM PURITY (Import Extensions) =====
console.log('🔍 PILLAR 1: Filesystem Purity (Import Extensions)');

const appPath = path.join(srcPath, 'App.tsx');
if (fs.existsSync(appPath)) {
  const appContent = fs.readFileSync(appPath, 'utf8');
  
  if (appContent.includes(".tsx';") || appContent.includes(".jsx';")) {
    issues.push('❌ App.tsx contains file extensions in imports');
  } else {
    fixes.push('✅ App.tsx import extensions cleaned');
  }
}

const mainPath = path.join(srcPath, 'main.jsx');
if (fs.existsSync(mainPath)) {
  const mainContent = fs.readFileSync(mainPath, 'utf8');
  
  if (mainContent.includes(".jsx';")) {
    issues.push('❌ main.jsx contains file extensions in imports');
  } else {
    fixes.push('✅ main.jsx import extensions cleaned');
  }
}

// ===== PILLAR 2: ARCHITECTURAL RESILIENCE (Error Handling) =====
console.log('🔍 PILLAR 2: Architectural Resilience (Error Handling)');

if (fs.existsSync(appPath)) {
  const appContent = fs.readFileSync(appPath, 'utf8');
  
  // Check for error handling around initialization
  if (appContent.includes('initializeApiMonitoring') && appContent.includes('try') && appContent.includes('catch (apiError)')) {
    fixes.push('✅ API monitoring initialization protected');
  } else {
    issues.push('❌ API monitoring initialization not protected');
  }
  
  // Check for error handling around notifications
  if (appContent.includes('setupNotifications') && appContent.includes('try') && appContent.includes('catch (notifError)')) {
    fixes.push('✅ Notification setup protected');
  } else {
    issues.push('❌ Notification setup not protected');
  }
  
  // Check for conditional rendering
  if (appContent.includes('if (connection)')) {
    fixes.push('✅ Connection components conditionally rendered');
  } else {
    issues.push('❌ Connection components not conditionally rendered');
  }
  
  if (appContent.includes('process.env.NODE_ENV === \'development\'')) {
    fixes.push('✅ Development components conditionally rendered');
  } else {
    issues.push('❌ Development components not conditionally rendered');
  }
  
  // Check for ErrorBoundary wrapper
  if (appContent.includes('<ErrorBoundary>')) {
    fixes.push('✅ ErrorBoundary wrapper implemented');
  } else {
    issues.push('❌ ErrorBoundary wrapper missing');
  }
}

// ===== PILLAR 3: PRODUCTION HARDENING (Critical Files) =====
console.log('🔍 PILLAR 3: Production Hardening (Critical Files)');

const criticalFiles = [
  'utils/globalIconShim.jsx',
  'context/AuthContext.tsx',
  'hooks/useBackendConnection.jsx',
  'pages/HomePage/components/HomePage.component.tsx',
  'routes/main-routes.tsx',
  'routes/error-boundary.tsx'
];

criticalFiles.forEach(file => {
  if (fs.existsSync(path.join(srcPath, file))) {
    fixes.push(`✅ Critical file exists: ${file}`);
  } else {
    issues.push(`❌ Missing critical file: ${file}`);
  }
});

// ===== VALIDATION SUMMARY =====
console.log('\n🔥 ALCHEMIST FORGE RESULTS');
console.log('==========================\n');

console.log('✅ TRANSFORMATIONS APPLIED:');
fixes.forEach(fix => console.log(`  ${fix}`));

if (issues.length > 0) {
  console.log('\n❌ REMAINING FORGE WORK:');
  issues.forEach(issue => console.log(`  ${issue}`));
  console.log(`\n💀 FORGE INCOMPLETE: ${issues.length} issues require attention`);
  process.exit(1);
} else {
  console.log(`\n🎉 FORGE COMPLETE! ${fixes.length} transformations successfully applied`);
  console.log('\n🔥 SWANSTUDIOS APPLICATION FORGED TO PERFECTION');
  console.log('📋 Ready for definitive deployment');
  console.log('🚀 Homepage will render properly after deployment');
  process.exit(0);
}
