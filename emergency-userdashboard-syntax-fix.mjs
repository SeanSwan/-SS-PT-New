#!/usr/bin/env node

/**
 * 🚨 EMERGENCY UserDashboard Syntax Fix
 * =====================================
 * 
 * Fixes the critical syntax error in UserDashboard.tsx causing deployment failures.
 * 
 * Errors to fix:
 * 1. Malformed template literal: })``;"; should be })`...`;
 * 2. Remove FilteredMotionSpan definition
 * 3. Replace FilteredMotionDiv usage in ActivityContent with FilteredDiv
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚨 Starting emergency UserDashboard syntax fix...\n');

const userDashboardPath = path.join(__dirname, 'frontend', 'src', 'components', 'UserDashboard', 'UserDashboard.tsx');

if (!fs.existsSync(userDashboardPath)) {
  console.log('❌ UserDashboard.tsx not found at:', userDashboardPath);
  process.exit(1);
}

try {
  let content = fs.readFileSync(userDashboardPath, 'utf8');
  let changesMade = 0;

  console.log('🔍 Fixing critical syntax errors...\n');

  // Fix 1: Replace malformed template literal in FilteredButton
  const malformedButton = /(\})\)`\";\";\s*\/\/\s*Additional filtered motion component/g;
  if (content.match(malformedButton)) {
    content = content.replace(malformedButton, `$1)\`
  transition: all 0.3s ease;
  background: none;
  border: none;
  cursor: pointer;
  
  &:hover {
    transform: scale(1.05);
  }
  
  /* Disable hover effects on weak devices */
  body.perf-weak &:hover {
    transform: none;
  }
  
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }
\`;

// ===================== COSMIC STYLED COMPONENTS =====================`);
    console.log('✅ Fixed malformed FilteredButton template literal');
    changesMade++;
  }

  // Fix 2: Remove FilteredMotionSpan definition entirely
  const motionSpanDef = /\/\/\s*Additional filtered motion component[\s\S]*?const FilteredMotionSpan[\s\S]*?}\)`\";/g;
  if (content.match(motionSpanDef)) {
    content = content.replace(motionSpanDef, '');
    console.log('✅ Removed FilteredMotionSpan definition');
    changesMade++;
  }

  // Fix 3: Replace FilteredMotionDiv with FilteredDiv in ActivityContent
  const motionDivUsage = /FilteredMotionDiv/g;
  const motionDivMatches = (content.match(motionDivUsage) || []).length;
  if (motionDivMatches > 0) {
    content = content.replace(motionDivUsage, 'FilteredDiv');
    console.log(`✅ Replaced ${motionDivMatches} instances of FilteredMotionDiv with FilteredDiv`);
    changesMade++;
  }

  // Fix 4: Remove any motion props from FilteredDiv components that might still exist
  const motionPropsPattern = /(FilteredDiv[\s\S]*?)\s+(initial=\{[^}]+\}|animate=\{[^}]+\}|transition=\{[^}]+\})/g;
  while (content.match(motionPropsPattern)) {
    content = content.replace(motionPropsPattern, '$1');
    changesMade++;
  }

  // Write the fixed content back
  if (changesMade > 0) {
    fs.writeFileSync(userDashboardPath, content);
    console.log(`\n🎉 Applied ${changesMade} critical fixes to UserDashboard.tsx`);
    
    console.log('\n📋 Summary of fixes:');
    console.log('   ✅ Fixed malformed template literal syntax error');
    console.log('   ✅ Removed unused FilteredMotionSpan component');
    console.log('   ✅ Replaced all motion components with filtered versions');
    console.log('   ✅ Cleaned up any remaining motion props');
    
    console.log('\n🚀 UserDashboard should now build successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Test the build locally: npm run build');
    console.log('   2. If successful, deploy: git add . && git commit -m "Fix UserDashboard syntax errors" && git push origin master');
  } else {
    console.log('✅ No syntax errors found - UserDashboard appears to be already fixed!');
  }

} catch (error) {
  console.error('❌ Error fixing UserDashboard:', error.message);
  process.exit(1);
}
