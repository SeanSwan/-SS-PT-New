/**
 * Fix All Model Import Issues
 * ==========================
 * This script fixes import issues for all models in controllers and routes
 * by replacing association imports with direct model imports.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name correctly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Commonly used models that might be imported from associations
const COMMON_MODELS = [
  'User',
  'ClientProgress',
  'Achievement',
  'WorkoutPlan',
  'WorkoutSession',
  'WorkoutExercise',
  'Exercise',
  'Set',
  'Gamification',
  'MuscleGroup',
  'Equipment',
  'StorefrontItem',
  'ShoppingCart',
  'CartItem',
  'Order',
  'OrderItem',
  'FoodProduct',
  'FoodIngredient',
  'FoodScanHistory'
];

// Models that are created in the associations file and shouldn't be directly imported
const JUNCTION_MODELS = [
  'ExerciseMuscleGroup',
  'ExerciseEquipment',
  'UserAchievement',
  'WorkoutPlanDayExercise'
];

// Directories to scan
const DIRS_TO_SCAN = [
  path.join(__dirname, 'routes'),
  path.join(__dirname, 'controllers'),
  path.join(__dirname, 'middleware'),
  path.join(__dirname, 'services')
];

// Function to process a file
async function processFile(filePath) {
  try {
    // Read the file content
    const content = fs.readFileSync(filePath, 'utf8');
    let fileModified = false;
    let fixedContent = content;

    // Find all import statements from associations.mjs
    const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]\.\.\/models\/associations\.mjs['"]/g;
    let match;
    let importedModels = [];
    
    // Collect all imported models
    while ((match = importRegex.exec(content)) !== null) {
      const importedItems = match[1].split(',').map(item => item.trim());
      importedModels = [...importedModels, ...importedItems];
    }
    
    // Reset regex
    importRegex.lastIndex = 0;
    
    // If no imports from associations, skip this file
    if (importedModels.length === 0) {
      return false;
    }
    
    console.log(`\nProcessing ${filePath}...`);
    console.log(`Found imported models: ${importedModels.join(', ')}`);
    
    // Create new import statements for direct imports
    let directImports = [];
    let associationImports = [];
    
    importedModels.forEach(model => {
      // Clean up model name (remove whitespace)
      const modelName = model.trim();
      
      // Skip empty entries
      if (!modelName) return;
      
      // Check if it's a common model that should be directly imported
      if (COMMON_MODELS.includes(modelName)) {
        directImports.push(modelName);
      } else if (JUNCTION_MODELS.includes(modelName)) {
        // These models should still be imported from associations
        associationImports.push(modelName);
      } else {
        // Unknown model, assume it needs to be imported from associations
        console.log(`Warning: Unknown model "${modelName}" will be imported from associations`);
        associationImports.push(modelName);
      }
    });
    
    // Replace all association imports with direct imports
    if (directImports.length > 0 || associationImports.length > 0) {
      // Remove all existing imports from associations.mjs
      fixedContent = fixedContent.replace(importRegex, '');
      
      // Add new import statements at the top of the file
      let newImports = '';
      
      // Add direct imports
      directImports.forEach(model => {
        newImports += `import ${model} from '../models/${model}.mjs';\n`;
      });
      
      // Add association imports if needed
      if (associationImports.length > 0) {
        newImports += `import { ${associationImports.join(', ')} } from '../models/associations.mjs';\n`;
      }
      
      // Find a good position to insert imports (after existing imports)
      const lastImportMatch = /^import .+$/m.exec(fixedContent);
      if (lastImportMatch) {
        const lastImportPos = fixedContent.lastIndexOf(lastImportMatch[0]) + lastImportMatch[0].length;
        fixedContent = fixedContent.substring(0, lastImportPos) + '\n' + newImports + fixedContent.substring(lastImportPos);
      } else {
        // If no imports found, add at the beginning
        fixedContent = newImports + fixedContent;
      }
      
      fileModified = true;
    }
    
    // Write the fixed content back to the file if modified
    if (fileModified) {
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

// Function to scan directories recursively
async function scanDirectory(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let fixedCount = 0;
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recurse into subdirectories
        fixedCount += await scanDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.mjs') || entry.name.endsWith('.js'))) {
        // Process JavaScript/ESM files
        const fixed = await processFile(fullPath);
        if (fixed) fixedCount++;
      }
    }
    
    return fixedCount;
  } catch (error) {
    console.error(`❌ Error scanning directory ${dir}:`, error.message);
    return 0;
  }
}

// Main function to fix all imports
async function fixAllImports() {
  console.log("=== Fixing All Model Import Issues ===");
  
  try {
    let totalFixed = 0;
    
    // Process each directory
    for (const dir of DIRS_TO_SCAN) {
      if (fs.existsSync(dir)) {
        console.log(`\nScanning directory: ${dir}`);
        const fixed = await scanDirectory(dir);
        totalFixed += fixed;
      }
    }
    
    if (totalFixed > 0) {
      console.log(`\n✅ Fixed imports in ${totalFixed} file(s) across all directories`);
    } else {
      console.log("\n✅ No files needed fixing");
    }
    
  } catch (error) {
    console.error("\n❌ Error fixing imports:", error.message);
  }
}

// Run the fix function
fixAllImports();
