/**
 * Emergency Fix: Styled Components Syntax Error in UserDashboard.tsx
 * Fix the missing backtick in ProfileContainer styled component
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'UserDashboard', 'UserDashboard.tsx');

console.log('🚨 Emergency Styled Components Syntax Fix');
console.log('Target file:', filePath);

try {
  // Read the file
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find and fix the ProfileContainer syntax error
  // The error is on line 332 where the template literal is missing the opening backtick
  const lines = content.split('\n');
  
  // Find the problematic line
  let fixedContent = content;
  let foundError = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for the specific error pattern
    if (line.includes('})<{ performanceLevel?: string }>`') && 
        i + 1 < lines.length && 
        lines[i + 1].trim().startsWith('min-height: 100vh;')) {
      
      console.log(`Found error at line ${i + 1}: ${line}`);
      console.log(`Next line ${i + 2}: ${lines[i + 1]}`);
      
      // Fix the line by adding the missing backtick
      lines[i] = line.replace('})<{ performanceLevel?: string }>`', '})<{ performanceLevel?: string }>`');
      foundError = true;
      
      console.log(`Fixed line ${i + 1}: ${lines[i]}`);
      break;
    }
  }
  
  if (foundError) {
    // Reconstruct the content
    fixedContent = lines.join('\n');
    
    // Write the fixed content back
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    
    console.log('✅ Fixed styled-components syntax error!');
    console.log('📝 The missing backtick has been added to the ProfileContainer styled component');
    console.log('🚀 You can now run `npm run build` to test the fix');
  } else {
    console.log('❓ Could not find the specific error pattern');
    console.log('💡 Looking for alternative error patterns...');
    
    // Alternative search patterns
    const errorPatterns = [
      /}><.*>\`\s*min-height: 100vh;/,
      /}><.*>.*min-height: 100vh;/,
      /styled\(.*\)\.withConfig.*}><.*>/
    ];
    
    for (let i = 0; i < lines.length; i++) {
      for (const pattern of errorPatterns) {
        if (pattern.test(lines[i] + ' ' + (lines[i + 1] || ''))) {
          console.log(`Found potential error at line ${i + 1}: ${lines[i]}`);
          console.log(`Next line: ${lines[i + 1] || 'undefined'}`);
        }
      }
    }
  }
  
} catch (error) {
  console.error('❌ Error fixing file:', error.message);
  
  // Provide manual fix instructions
  console.log('\n📋 Manual Fix Instructions:');
  console.log('1. Open: frontend/src/components/UserDashboard/UserDashboard.tsx');
  console.log('2. Find line 332 (around the ProfileContainer styled component)');
  console.log('3. Look for: })<{ performanceLevel?: string }>`');
  console.log('4. Replace with: })<{ performanceLevel?: string }>`');
  console.log('5. Save the file and run: npm run build');
}
