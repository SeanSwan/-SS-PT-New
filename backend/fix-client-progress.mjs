/**
 * Fix ClientProgress Import Issues
 * ===============================
 * This script fixes the import issues with ClientProgress in routes by
 * rewriting the import statements with direct imports instead of using
 * the associations module.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name correctly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to routes directory
const routesDir = path.join(__dirname, 'routes');

// Function to process a file
async function processFile(filePath) {
  try {
    // Read the file content
    const content = fs.readFileSync(filePath, 'utf8');

    // Check if it contains the problematic import
    if (content.includes("import { ClientProgress") || 
        content.includes("import {ClientProgress")) {
      
      console.log(`\nFixing imports in ${filePath}...`);
      
      // Replace the problematic import with direct imports
      let fixedContent = content.replace(
        /import\s*\{\s*ClientProgress(,\s*[^}]+)?\s*\}\s*from\s*['"]\.\.\/models\/associations\.mjs['"]/g,
        (match, otherImports) => {
          // If there are other imports in the same statement
          if (otherImports) {
            // Keep the other imports from associations, but use direct import for ClientProgress
            return `import ClientProgress from '../models/ClientProgress.mjs';\nimport ${otherImports.trim()} from '../models/associations.mjs'`;
          } else {
            return `import ClientProgress from '../models/ClientProgress.mjs';`;
          }
        }
      );
      
      // Additional handling for specific User import case
      if (fixedContent.includes("import { User }") || 
          fixedContent.includes("import {User}")) {
        fixedContent = fixedContent.replace(
          /import\s*\{\s*User\s*\}\s*from\s*['"]\.\.\/models\/associations\.mjs['"]/g,
          "import User from '../models/User.mjs';"
        );
      }
      
      // Write the fixed content back to the file
      fs.writeFileSync(filePath, fixedContent);
      console.log(`✅ Fixed imports in ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Function to process all route files
async function fixClientProgressImports() {
  console.log("=== Fixing ClientProgress Import Issues ===");
  
  try {
    // Get all .mjs files in the routes directory
    const files = fs.readdirSync(routesDir)
      .filter(file => file.endsWith('.mjs'))
      .map(file => path.join(routesDir, file));
    
    let fixedCount = 0;
    
    // Process each file
    for (const file of files) {
      const fixed = await processFile(file);
      if (fixed) fixedCount++;
    }
    
    if (fixedCount > 0) {
      console.log(`\n✅ Fixed imports in ${fixedCount} file(s)`);
    } else {
      console.log("\n✅ No files needed fixing");
    }
    
  } catch (error) {
    console.error("❌ Error fixing imports:", error.message);
  }
}

// Run the fix function
fixClientProgressImports();
