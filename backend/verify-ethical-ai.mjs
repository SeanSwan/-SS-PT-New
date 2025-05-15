#!/usr/bin/env node
/**
 * Verify EthicalAIReview.mjs file syntax
 */

import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'services', 'ai', 'EthicalAIReview.mjs');

console.log('Checking EthicalAIReview.mjs...');
console.log('File path:', filePath);

try {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find the problematic line
  const lines = content.split('\n');
  const problematicLineIndex = lines.findIndex(line => 
    line.includes("girls can") || line.includes("boys don")
  );
  
  if (problematicLineIndex !== -1) {
    console.log(`\nFound line at index ${problematicLineIndex + 1}:`);
    console.log(lines[problematicLineIndex]);
    
    // Check surrounding lines for context
    console.log('\nSurrounding context:');
    for (let i = Math.max(0, problematicLineIndex - 2); 
         i <= Math.min(lines.length - 1, problematicLineIndex + 2); 
         i++) {
      const marker = i === problematicLineIndex ? '>>> ' : '    ';
      console.log(`${marker}${i + 1}: ${lines[i]}`);
    }
  }
  
  // Try to import the module to check for syntax errors
  console.log('\nAttempting to import the module...');
  
  // Use dynamic import to test
  import(filePath)
    .then(() => {
      console.log('✓ File imported successfully - no syntax errors!');
    })
    .catch(error => {
      console.error('✗ Syntax error found:');
      console.error(error.message);
      
      // Extract line number from error if possible
      const match = error.message.match(/:(\d+)/);
      if (match) {
        const lineNum = parseInt(match[1]) - 1;
        console.log(`\nError at line ${lineNum + 1}:`);
        console.log(lines[lineNum]);
      }
    });
    
} catch (error) {
  console.error('Error reading file:', error.message);
}
