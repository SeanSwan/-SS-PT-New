#!/usr/bin/env node

/**
 * Complete Motion Components Fix for UserDashboard.tsx
 * ==================================================
 * 
 * This script will completely replace ALL motion components with properly filtered
 * styled-components versions to eliminate the styled-components error.
 * 
 * Error: An error occurred. See https://github.com/styled-components/styled-components/blob/main/packages/styled-components/src/utils/errors.md#12
 * 
 * The issue is that motion components from framer-motion are conflicting with 
 * styled-components prop forwarding, especially in map functions.
 */

import fs from 'fs';
import path from 'path';

const USERDASHBOARD_PATH = './frontend/src/components/UserDashboard/UserDashboard.tsx';

function fixMotionComponents() {
  try {
    console.log('🔧 Starting comprehensive motion components fix...');
    
    if (!fs.existsSync(USERDASHBOARD_PATH)) {
      console.error('❌ UserDashboard.tsx not found!');
      return;
    }

    let content = fs.readFileSync(USERDASHBOARD_PATH, 'utf8');
    console.log('📖 File read successfully');

    // Create backup
    const backupPath = USERDASHBOARD_PATH + '.backup-motion-fix';
    fs.writeFileSync(backupPath, content);
    console.log('💾 Backup created');

    // Step 1: Replace the filtered motion component definitions with proper non-motion versions
    const motionComponentsReplace = `// ===================== FILTERED STYLED COMPONENTS (NO MOTION) =====================

// Create properly filtered div components for use in map functions
const FilteredDiv = styled.div.withConfig({
  shouldForwardProp: (prop) => ![
    'whileHover', 'whileTap', 'initial', 'animate', 'exit', 'transition', 
    'style', 'className', 'variants', 'layout', 'layoutId', 'drag', 
    'dragConstraints', 'onDrag', 'onDragEnd', 'onDragStart', 'dragElastic',
    'dragMomentum', 'layoutDependency'
  ].includes(prop)
})\`\`;

const FilteredButton = styled.button.withConfig({
  shouldForwardProp: (prop) => ![
    'whileHover', 'whileTap', 'initial', 'animate', 'exit', 'transition', 
    'style', 'className', 'variants', 'layout', 'layoutId', 'drag', 
    'dragConstraints', 'onDrag', 'onDragEnd', 'onDragStart', 'dragElastic',
    'dragMomentum', 'layoutDependency'
  ].includes(prop)
})\`\`;

// Additional filtered styled component for any other elements
const FilteredSpan = styled.span.withConfig({
  shouldForwardProp: (prop) => ![
    'whileHover', 'whileTap', 'initial', 'animate', 'exit', 'transition', 
    'style', 'className', 'variants', 'layout', 'layoutId', 'drag', 
    'dragConstraints', 'onDrag', 'onDragEnd', 'onDragStart', 'dragElastic',
    'dragMomentum', 'layoutDependency'
  ].includes(prop)
})\`\`;`;

    // Replace the existing filtered motion components section
    content = content.replace(
      /\/\/ ===================== MOTION COMPONENTS WITH PROPER PROP FILTERING =====================[\s\S]*?shouldForwardProp.*?\}\`\`;/,
      motionComponentsReplace
    );

    // Step 2: Replace ALL FilteredMotionDiv with FilteredDiv
    content = content.replace(/FilteredMotionDiv/g, 'FilteredDiv');
    
    // Step 3: Replace ALL FilteredMotionButton with FilteredButton  
    content = content.replace(/FilteredMotionButton/g, 'FilteredButton');
    
    // Step 4: Replace ALL FilteredMotionSpan with FilteredSpan
    content = content.replace(/FilteredMotionSpan/g, 'FilteredSpan');

    // Step 5: Remove motion props from FilteredDiv components in map functions
    // This regex finds FilteredDiv components and removes motion-specific props
    content = content.replace(
      /(\s*)<FilteredDiv\s*\n?\s*[^>]*?(whileHover|whileTap|initial|animate|exit|transition|variants|layout|layoutId|drag)\s*=\s*\{[^}]*\}[^>]*>/g,
      (match, indent) => {
        // Extract just the opening tag without motion props
        const basicDiv = match
          .replace(/\s*(whileHover|whileTap|initial|animate|exit|transition|variants|layout|layoutId|drag)\s*=\s*\{[^}]*\}/g, '')
          .replace(/\s+>/g, '>');
        return basicDiv;
      }
    );

    // Step 6: Remove motion props from FilteredButton components
    content = content.replace(
      /(\s*)<FilteredButton\s*\n?\s*[^>]*?(whileHover|whileTap|initial|animate|exit|transition|variants|layout|layoutId|drag)\s*=\s*\{[^}]*\}[^>]*>/g,
      (match, indent) => {
        const basicButton = match
          .replace(/\s*(whileHover|whileTap|initial|animate|exit|transition|variants|layout|layoutId|drag)\s*=\s*\{[^}]*\}/g, '')
          .replace(/\s+>/g, '>');
        return basicButton;
      }
    );

    // Step 7: Fix specific problematic instances in the map functions
    // Fix the progress bar animation
    content = content.replace(
      /<FilteredDiv\s*initial=\{[^}]*\}\s*animate=\{[^}]*\}\s*transition=\{[^}]*\}\s*style=\{[^}]*\}\s*\/>/g,
      '<FilteredDiv style={{height: "100%", background: theme.gradients.primary, borderRadius: "4px"}} />'
    );

    // Step 8: Add CSS transitions where motion was removed for smooth interactions
    const cssTransitionNote = `
    /* Note: Removed framer-motion to fix styled-components conflicts.
     * Smooth interactions are now handled via CSS transitions in styled components */`;

    content = content.replace(
      /\/\* Respect system reduced motion preference \*\//,
      cssTransitionNote + '\n    /* Respect system reduced motion preference */'
    );

    // Step 9: Ensure hover effects use CSS instead of motion
    content = content.replace(
      /whileHover=\{\{ scale: 1\.(\d+) \}\}/g,
      '' // Remove whileHover scale effects
    );

    // Step 10: Add proper CSS hover transitions to FilteredDiv and FilteredButton
    const enhancedFilters = `// ===================== FILTERED STYLED COMPONENTS (NO MOTION) =====================

// Create properly filtered div components for use in map functions
const FilteredDiv = styled.div.withConfig({
  shouldForwardProp: (prop) => ![
    'whileHover', 'whileTap', 'initial', 'animate', 'exit', 'transition', 
    'style', 'className', 'variants', 'layout', 'layoutId', 'drag', 
    'dragConstraints', 'onDrag', 'onDragEnd', 'onDragStart', 'dragElastic',
    'dragMomentum', 'layoutDependency'
  ].includes(prop)
})\`
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
})\`
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
})\`
  transition: all 0.3s ease;
\`;`;

    content = content.replace(
      /\/\/ ===================== FILTERED STYLED COMPONENTS \(NO MOTION\) =====================[\s\S]*?transition: all 0\.3s ease;\s*\}\`\`;/,
      enhancedFilters
    );

    // Step 11: Clean up any remaining motion props in component usage
    content = content.replace(
      /\s*(whileHover|whileTap|initial|animate|exit|transition|variants|layout|layoutId|drag)\s*=\s*\{[^}]*\}/g,
      ''
    );

    // Step 12: Clean up any orphaned motion syntax
    content = content.replace(/\s*\.\.\.(enableLuxuryAnimations \? \{[^}]*\} : \{\})/g, '');

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
  }
}

// Run the fix
fixMotionComponents();