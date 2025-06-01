/**
 * Emergency Fix Script for UserDashboard.tsx Styled Components Syntax Error
 * This script will fix the ProfileContainer styled component syntax issue
 */

const fs = require('fs');
const path = require('path');

console.log('🚨 EMERGENCY STYLED COMPONENTS SYNTAX FIX');
console.log('Fixing ProfileContainer in UserDashboard.tsx');

// Read the problematic file
try {
  const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'UserDashboard', 'UserDashboard.tsx');
  let content = fs.readFileSync(filePath, 'utf8');
  
  console.log('✅ File read successfully');
  
  // The issue is that the line ending with })<{ performanceLevel?: string }>` 
  // is missing the template literal backtick to start the CSS
  
  // Find and replace the problematic ProfileContainer definition
  const problemPattern = /const ProfileContainer = styled\(motion\.div\)\.withConfig\(\{\s*shouldForwardProp:[\s\S]*?\}\)<\{\s*performanceLevel\?\:\s*string\s*\}>\s*`/;
  
  const fixedProfileContainer = `const ProfileContainer = styled(motion.div).withConfig({
  shouldForwardProp: (prop) => ![
    'whileHover', 'whileTap', 'initial', 'animate', 'exit', 'transition', 
    'performanceLevel', 'enableLuxury', 'devicePerformance'
  ].includes(prop as string)
})<{ performanceLevel?: string }>\``;

  if (problemPattern.test(content)) {
    content = content.replace(problemPattern, fixedProfileContainer);
    
    // Write the fixed content back
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log('✅ FIXED! ProfileContainer styled component syntax corrected');
    console.log('📝 Ensured proper template literal backtick is present');
    console.log('🚀 Build should now succeed!');
    console.log('');
    console.log('Next steps:');
    console.log('1. git add .');
    console.log('2. git commit -m "Fix ProfileContainer styled-components syntax error"');
    console.log('3. git push origin main');
    console.log('4. Monitor Render deployment');
  } else {
    console.log('❓ Could not find the exact ProfileContainer pattern');
    console.log('💡 Creating a simple manual fix script...');
    
    // Alternative approach: search for any line that matches the error pattern
    const lines = content.split('\n');
    let lineFixed = false;
    
    for (let i = 0; i < lines.length; i++) {
      // Look for line containing })<{ performanceLevel?: string }>
      if (lines[i].includes('})<{ performanceLevel?: string }>') && 
          !lines[i].endsWith('`') &&
          i + 1 < lines.length && 
          lines[i + 1].trim().startsWith('min-height: 100vh;')) {
        
        console.log(`Found error at line ${i + 1}: "${lines[i]}"`);
        
        // Fix by ensuring it ends with backtick
        lines[i] = lines[i].trim() + '`';
        lineFixed = true;
        
        console.log(`Fixed to: "${lines[i]}"`);
        break;
      }
    }
    
    if (lineFixed) {
      const fixedContent = lines.join('\n');
      fs.writeFileSync(filePath, fixedContent, 'utf8');
      console.log('✅ FIXED using line-by-line approach!');
    } else {
      console.log('❌ Could not automatically fix the issue');
      console.log('');
      console.log('MANUAL FIX REQUIRED:');
      console.log('1. Open: frontend/src/components/UserDashboard/UserDashboard.tsx');
      console.log('2. Find line ~332 with: })<{ performanceLevel?: string }>');
      console.log('3. Ensure it ends with a backtick: })<{ performanceLevel?: string }>`');
      console.log('4. Save and test build');
    }
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('');
  console.log('MANUAL FIX INSTRUCTIONS:');
  console.log('1. Open frontend/src/components/UserDashboard/UserDashboard.tsx');
  console.log('2. Go to line 332 (the ProfileContainer styled component)');
  console.log('3. Find: })<{ performanceLevel?: string }>` (without backtick)');
  console.log('4. Change to: })<{ performanceLevel?: string }>` (with backtick)');
  console.log('5. Save file and run: npm run build');
}
