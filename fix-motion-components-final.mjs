#!/usr/bin/env node

/**
 * Complete Motion Components Fix for UserDashboard.tsx
 * ==================================================
 * 
 * This script will completely replace ALL motion components with properly filtered
 * styled-components versions to eliminate the styled-components error.
 */

import fs from 'fs';

const USERDASHBOARD_PATH = './frontend/src/components/UserDashboard/UserDashboard.tsx';

console.log('🔧 Starting comprehensive motion components fix...');

try {
  if (!fs.existsSync(USERDASHBOARD_PATH)) {
    console.error('❌ UserDashboard.tsx not found!');
    process.exit(1);
  }

  let content = fs.readFileSync(USERDASHBOARD_PATH, 'utf8');
  console.log('📖 File read successfully');

  // Create backup
  const backupPath = USERDASHBOARD_PATH + '.backup-motion-fix-' + Date.now();
  fs.writeFileSync(backupPath, content);
  console.log('💾 Backup created:', backupPath);

  // Step 1: Replace the motion component definitions with regular styled components
  content = content.replace(
    /\/\/ ===================== MOTION COMPONENTS WITH PROPER PROP FILTERING =====================[\s\S]*?}\`\`;/,
    `// ===================== FILTERED STYLED COMPONENTS (NO MOTION) =====================

// Create properly filtered div components for use in map functions
const FilteredDiv = styled.div.withConfig({
  shouldForwardProp: (prop) => ![
    'whileHover', 'whileTap', 'initial', 'animate', 'exit', 'transition', 
    'style', 'className', 'variants', 'layout', 'layoutId', 'drag', 
    'dragConstraints', 'onDrag', 'onDragEnd', 'onDragStart', 'dragElastic',
    'dragMomentum', 'layoutDependency'
  ].includes(prop)
}\`
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
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

const FilteredButton = styled.button.withConfig({
  shouldForwardProp: (prop) => ![
    'whileHover', 'whileTap', 'initial', 'animate', 'exit', 'transition', 
    'style', 'className', 'variants', 'layout', 'layoutId', 'drag', 
    'dragConstraints', 'onDrag', 'onDragEnd', 'onDragStart', 'dragElastic',
    'dragMomentum', 'layoutDependency'
  ].includes(prop)
}\`
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  /* Disable hover effects on weak devices */
  body.perf-weak &:hover {
    transform: none;
  }
  
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover, &:active {
      transform: none;
    }
  }
\`;

// Additional filtered styled component for any other elements
const FilteredSpan = styled.span.withConfig({
  shouldForwardProp: (prop) => ![
    'whileHover', 'whileTap', 'initial', 'animate', 'exit', 'transition', 
    'style', 'className', 'variants', 'layout', 'layoutId', 'drag', 
    'dragConstraints', 'onDrag', 'onDragEnd', 'onDragStart', 'dragElastic',
    'dragMomentum', 'layoutDependency'
  ].includes(prop)
}\`
  transition: all 0.3s ease;
\`;`
  );

  // Step 2: Replace ALL FilteredMotionDiv with FilteredDiv
  content = content.replace(/FilteredMotionDiv/g, 'FilteredDiv');
  
  // Step 3: Replace ALL FilteredMotionButton with FilteredButton  
  content = content.replace(/FilteredMotionButton/g, 'FilteredButton');
  
  // Step 4: Replace ALL FilteredMotionSpan with FilteredSpan
  content = content.replace(/FilteredMotionSpan/g, 'FilteredSpan');

  // Step 5: Remove motion props from components in a more targeted way
  // Remove motion props from FilteredDiv components
  content = content.replace(
    /<FilteredDiv\s*([^>]*?)(?:initial|animate|whileHover|whileTap|transition|variants|layout|layoutId|drag)\s*=\s*\{[^}]*\}([^>]*?)>/g,
    '<FilteredDiv$1$2>'
  );

  // Remove motion props from FilteredButton components
  content = content.replace(
    /<FilteredButton\s*([^>]*?)(?:initial|animate|whileHover|whileTap|transition|variants|layout|layoutId|drag)\s*=\s*\{[^}]*\}([^>]*?)>/g,
    '<FilteredButton$1$2>'
  );

  // Step 6: Clean up any remaining motion syntax throughout the file
  // Remove individual motion props that might still be hanging around
  const motionProps = [
    'initial', 'animate', 'whileHover', 'whileTap', 'transition', 
    'variants', 'layout', 'layoutId', 'drag', 'dragConstraints',
    'onDrag', 'onDragEnd', 'onDragStart', 'dragElastic', 'dragMomentum'
  ];

  motionProps.forEach(prop => {
    // Remove these props from any component
    const regex = new RegExp(`\\s*${prop}\\s*=\\s*\\{[^}]*\\}`, 'g');
    content = content.replace(regex, '');
  });

  // Step 7: Remove any orphaned motion syntax like conditional spread operators
  content = content.replace(/\s*\.\.\.(enableLuxuryAnimations \? \{[^}]*\} : \{\})/g, '');

  // Step 8: Fix specific progress bar that was using motion
  content = content.replace(
    /<FilteredDiv[^>]*initial=\{[^}]*\}[^>]*animate=\{[^}]*\}[^>]*transition=\{[^}]*\}[^>]*style=\{[^}]*\}[^>]*\/>/g,
    '<FilteredDiv style={{height: "100%", background: theme.gradients.primary, borderRadius: "4px"}} />'
  );

  // Write the fixed file
  fs.writeFileSync(USERDASHBOARD_PATH, content);
  
  console.log('✅ Motion components fix completed successfully!');
  console.log('📋 Changes made:');
  console.log('   - Replaced all FilteredMotionDiv with FilteredDiv');
  console.log('   - Replaced all FilteredMotionButton with FilteredButton'); 
  console.log('   - Replaced all FilteredMotionSpan with FilteredSpan');
  console.log('   - Removed all motion props from map functions');
  console.log('   - Added CSS transitions for smooth interactions');
  console.log('   - Fixed styled-components prop filtering');
  console.log('');
  console.log('🔧 The styled-components error should now be resolved!');
  console.log(`💾 Backup saved as: ${backupPath}`);

} catch (error) {
  console.error('❌ Error fixing motion components:', error);
  process.exit(1);
}