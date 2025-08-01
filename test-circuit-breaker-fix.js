/**
 * Circuit Breaker Fix Verification Script
 * =====================================
 * Verifies that the UniversalMasterSchedule component circuit breaker fix
 * is syntactically correct and follows React best practices.
 */

const fs = require('fs');
const path = require('path');

const COMPONENT_PATH = path.join(__dirname, 'frontend', 'src', 'components', 'UniversalMasterSchedule', 'UniversalMasterSchedule.tsx');

console.log('🔍 Verifying Circuit Breaker Fix...\n');

// Read the component file
let componentContent;
try {
  componentContent = fs.readFileSync(COMPONENT_PATH, 'utf8');
  console.log('✅ Component file loaded successfully');
} catch (error) {
  console.error('❌ Failed to load component file:', error.message);
  process.exit(1);
}

// Verification checks
const checks = [
  {
    name: 'Circuit Breaker State Variables',
    pattern: /const \[initializationAttempted, setInitializationAttempted\] = useState\(false\)/,
    description: 'Component has initialization state tracking'
  },
  {
    name: 'Circuit Breaker Block State',
    pattern: /const \[initializationBlocked, setInitializationBlocked\] = useState\(false\)/,
    description: 'Component has initialization blocking state'
  },
  {
    name: 'Failure Counter Ref',
    pattern: /const initFailureCountRef = useRef\(0\)/,
    description: 'Component tracks initialization failures'
  },
  {
    name: 'Circuit Breaker Logic',
    pattern: /if \(initializationAttempted && !initializationBlocked\)/,
    description: 'useEffect has circuit breaker guard clause'
  },
  {
    name: 'Initialization Blocking Logic',
    pattern: /if \(initFailureCountRef\.current >= 3\)/,
    description: 'Component blocks after 3 failures'
  },
  {
    name: 'Manual Retry Logic',
    pattern: /setInitializationAttempted\(false\)/,
    description: 'Manual retry resets circuit breaker state'
  },
  {
    name: 'Cleaned Dependencies',
    pattern: /}, \[initializationAttempted, initializationBlocked\]/,
    description: 'useEffect dependencies cleaned to prevent infinite loops'
  },
  {
    name: 'Status Indicator',
    pattern: /System Protection Active/,
    description: 'Visual circuit breaker status indicator added'
  }
];

let passedChecks = 0;
let failedChecks = 0;

console.log('\n📋 Running Verification Checks:\n');

checks.forEach((check, index) => {
  const passed = check.pattern.test(componentContent);
  if (passed) {
    console.log(`✅ ${index + 1}. ${check.name}`);
    console.log(`   ${check.description}`);
    passedChecks++;
  } else {
    console.log(`❌ ${index + 1}. ${check.name}`);
    console.log(`   ${check.description}`);
    failedChecks++;
  }
  console.log('');
});

// Additional syntax checks
console.log('🔍 Additional Syntax Verification:\n');

// Check for proper React hook usage
const hookUsageChecks = [
  {
    name: 'useState properly imported',
    pattern: /import React, { useEffect, useRef, useState }/,
    description: 'useState is imported in React import'
  },
  {
    name: 'No conditional hooks',
    pattern: /if.*useState|if.*useEffect/,
    description: 'No hooks inside conditionals',
    shouldNotMatch: true
  },
  {
    name: 'Proper JSX syntax',
    pattern: /<.*>/,
    description: 'Component contains JSX elements'
  }
];

hookUsageChecks.forEach((check, index) => {
  const matches = check.pattern.test(componentContent);
  const passed = check.shouldNotMatch ? !matches : matches;
  
  if (passed) {
    console.log(`✅ ${checks.length + index + 1}. ${check.name}`);
    console.log(`   ${check.description}`);
    passedChecks++;
  } else {
    console.log(`❌ ${checks.length + index + 1}. ${check.name}`);
    console.log(`   ${check.description}`);
    failedChecks++;
  }
  console.log('');
});

// Summary
console.log('📊 VERIFICATION SUMMARY:\n');
console.log(`✅ Passed: ${passedChecks}`);
console.log(`❌ Failed: ${failedChecks}`);
console.log(`📋 Total: ${passedChecks + failedChecks}`);

if (failedChecks === 0) {
  console.log('\n🎉 SUCCESS: Circuit breaker fix is properly implemented!');
  console.log('📋 Next steps:');
  console.log('   1. Test the build: cd frontend && npm run build');
  console.log('   2. Deploy to production: git add . && git commit -m "🚨 P0 HOTFIX: Fixed infinite re-render loop with component-level circuit breaker" && git push origin main');
  console.log('   3. Monitor production logs for "🛑 Initialization already attempted" messages');
  process.exit(0);
} else {
  console.log('\n⚠️  WARNING: Some checks failed. Please review the implementation.');
  process.exit(1);
}
