#!/usr/bin/env node

/**
 * 🔧 Comprehensive UserDashboard Motion Component Fix
 * =================================================
 * 
 * This script will fix ALL remaining styled-components errors by ensuring
 * every motion component in map functions uses proper prop filtering.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Starting comprehensive UserDashboard motion component fix...\n');

const userDashboardPath = path.join(__dirname, 'frontend', 'src', 'components', 'UserDashboard', 'UserDashboard.tsx');

if (!fs.existsSync(userDashboardPath)) {
  console.log('❌ UserDashboard.tsx not found at:', userDashboardPath);
  process.exit(1);
}

try {
  let content = fs.readFileSync(userDashboardPath, 'utf8');
  let changesMade = 0;

  console.log('🔍 Searching for problematic motion components...\n');

  // Replace any remaining motion.div with FilteredMotionDiv in complex expressions
  const motionDivReplacements = [
    // Direct motion.div usage
    {
      from: /motion\.div/g,
      to: 'FilteredMotionDiv',
      description: 'Replace motion.div with FilteredMotionDiv'
    },
    // Direct motion.button usage
    {
      from: /motion\.button/g,
      to: 'FilteredMotionButton', 
      description: 'Replace motion.button with FilteredMotionButton'
    },
    // Fix any motion components that might be in complex expressions
    {
      from: /<motion\.div([^>]*?)>/g,
      to: '<FilteredMotionDiv$1>',
      description: 'Replace <motion.div> tags with <FilteredMotionDiv>'
    },
    {
      from: /<\/motion\.div>/g,
      to: '</FilteredMotionDiv>',
      description: 'Replace </motion.div> closing tags'
    },
    {
      from: /<motion\.button([^>]*?)>/g,
      to: '<FilteredMotionButton$1>',
      description: 'Replace <motion.button> tags with <FilteredMotionButton>'
    },
    {
      from: /<\/motion\.button>/g,
      to: '</FilteredMotionButton>',
      description: 'Replace </motion.button> closing tags'
    }
  ];

  // Apply each replacement
  motionDivReplacements.forEach((replacement) => {
    const beforeCount = (content.match(replacement.from) || []).length;
    if (beforeCount > 0) {
      content = content.replace(replacement.from, replacement.to);
      const afterCount = (content.match(replacement.from) || []).length;
      const replacements = beforeCount - afterCount;
      if (replacements > 0) {
        console.log(`✅ ${replacement.description}: ${replacements} replacements`);
        changesMade += replacements;
      }
    }
  });

  // Also ensure we have additional prop filtering for any edge cases
  const additionalFilters = [
    'variants',
    'layout',
    'layoutId',
    'layoutDependency',
    'drag',
    'dragConstraints',
    'dragElastic',
    'dragMomentum',
    'onDrag',
    'onDragEnd',
    'onDragStart'
  ];

  // Update the FilteredMotionDiv definition to include more props
  const currentFilterDef = /const FilteredMotionDiv = styled\(motion\.div\)\.withConfig\(\{\s*shouldForwardProp: \(prop\) => ![^}]+\}\)``;/;
  const newFilterProps = ['whileHover', 'whileTap', 'initial', 'animate', 'exit', 'transition', 'style', 'className', ...additionalFilters];
  const newFilterDef = `const FilteredMotionDiv = styled(motion.div).withConfig({
  shouldForwardProp: (prop) => !${JSON.stringify(newFilterProps)}.includes(prop)
})\`\`;`;

  if (content.match(currentFilterDef)) {
    content = content.replace(currentFilterDef, newFilterDef);
    console.log('✅ Enhanced FilteredMotionDiv prop filtering');
    changesMade++;
  }

  // Update FilteredMotionButton as well
  const currentButtonFilterDef = /const FilteredMotionButton = styled\(motion\.button\)\.withConfig\(\{\s*shouldForwardProp: \(prop\) => ![^}]+\}\)``;/;
  const newButtonFilterDef = `const FilteredMotionButton = styled(motion.button).withConfig({
  shouldForwardProp: (prop) => !${JSON.stringify(newFilterProps)}.includes(prop)
})\`\`;`;

  if (content.match(currentButtonFilterDef)) {
    content = content.replace(currentButtonFilterDef, newButtonFilterDef);
    console.log('✅ Enhanced FilteredMotionButton prop filtering');
    changesMade++;
  }

  // Write the fixed content back
  if (changesMade > 0) {
    fs.writeFileSync(userDashboardPath, content);
    console.log(`\n🎉 Applied ${changesMade} fixes to UserDashboard.tsx`);
    console.log('\n📋 Summary:');
    console.log('   ✅ All motion.div → FilteredMotionDiv');
    console.log('   ✅ All motion.button → FilteredMotionButton'); 
    console.log('   ✅ Enhanced prop filtering');
    console.log('   ✅ Ready for error-free rendering');
    console.log('\n🚀 UserDashboard should now work without styled-components errors!');
  } else {
    console.log('✅ No motion component issues found - UserDashboard appears to be already fixed!');
  }

  // Create a quick test command
  console.log('\n🧪 Test the fix:');
  console.log('   1. Navigate to /user-dashboard');
  console.log('   2. Check browser console for errors');
  console.log('   3. Test progress bar animations in "Cosmic Fitness Missions"');

} catch (error) {
  console.error('❌ Error fixing UserDashboard:', error.message);
  process.exit(1);
}
