/**
 * Fix API Endpoints Script
 * =======================
 * This script addresses specific API endpoint issues,
 * including the 403 Forbidden for client-progress and
 * 404 Not Found for exercises/recommended endpoints.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to ensure a file exists
async function ensureFileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    console.error(`File does not exist: ${filePath}`);
    return false;
  }
}

// Function to update a file with find and replace
async function updateFile(filePath, findText, replaceText, exactMatch = true) {
  if (!(await ensureFileExists(filePath))) {
    return false;
  }

  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Check if the content already matches what we want
    if (content.includes(replaceText)) {
      console.log(`File ${filePath} already has the desired content.`);
      return true;
    }
    
    // Does the find text exist?
    if (exactMatch && !content.includes(findText)) {
      console.error(`Find text not found in ${filePath}`);
      return false;
    }
    
    // Replace the text
    let updatedContent;
    if (exactMatch) {
      updatedContent = content.replace(findText, replaceText);
    } else {
      // Use regex for non-exact matches
      const regex = new RegExp(findText, 'g');
      updatedContent = content.replace(regex, replaceText);
    }
    
    await fs.writeFile(filePath, updatedContent, 'utf8');
    console.log(`Updated ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error updating file ${filePath}:`, error);
    return false;
  }
}

// Main function
async function main() {
  console.log('🔧 Running Fix API Endpoints Script...');
  
  // 1. Fix the client progress routes authentication middleware
  console.log('\nFixing client progress routes...');
  
  const clientProgressRoutesPath = path.join(__dirname, 'routes', 'clientProgressRoutes.mjs');
  
  // Check if the file uses the nasmAuthMiddleware
  const clientProgressContent = await fs.readFile(clientProgressRoutesPath, 'utf8');
  if (clientProgressContent.includes('nasmAuthMiddleware')) {
    // Update all instances of nasmAuthMiddleware to authMiddleware
    await updateFile(
      clientProgressRoutesPath,
      'import { authenticateUser, authorizeRoles } from \'../middleware/nasmAuthMiddleware.mjs\';',
      'import { protect, authorize } from \'../middleware/authMiddleware.mjs\';\nimport logger from \'../utils/logger.mjs\';'
    );
    
    // Update middleware usage
    await updateFile(
      clientProgressRoutesPath,
      'authenticateUser',
      'protect',
      false
    );
    
    await updateFile(
      clientProgressRoutesPath,
      'authorizeRoles',
      'authorize',
      false
    );
  }
  
  // 2. Fix the exercise routes endpoint to match what the frontend expects
  console.log('\nFixing exercise routes...');
  
  const exerciseRoutesPath = path.join(__dirname, 'routes', 'exerciseRoutes.mjs');
  
  // Check if the file has the wrong endpoint
  const exerciseContent = await fs.readFile(exerciseRoutesPath, 'utf8');
  if (exerciseContent.includes('/recommendations')) {
    // Update the endpoint to match what the frontend expects
    await updateFile(
      exerciseRoutesPath,
      'router.get(\'/recommendations\'',
      'router.get(\'/recommended\'',
      false
    );
    
    await updateFile(
      exerciseRoutesPath,
      'router.get(\'/recommendations/:userId\'',
      'router.get(\'/recommended/:userId\'',
      false
    );

    await updateFile(
      exerciseRoutesPath,
      '@route GET /api/exercises/recommendations',
      '@route GET /api/exercises/recommended',
      false
    );
  }
  
  // 3. Ensure the API routes are properly registered
  console.log('\nChecking API route registrations...');
  
  const apiRoutesPath = path.join(__dirname, 'routes', 'api.mjs');
  
  // Update imports if needed
  await updateFile(
    apiRoutesPath,
    'import { Router } from \'express\';\nimport { getUsers } from \'../controllers/userController.mjs\';\nimport workoutRoutes from \'./workoutRoutes.mjs\';',
    'import { Router } from \'express\';\nimport { getUsers } from \'../controllers/userController.mjs\';\nimport workoutRoutes from \'./workoutRoutes.mjs\';\nimport clientProgressRoutes from \'./clientProgressRoutes.mjs\';\nimport exerciseRoutes from \'./exerciseRoutes.mjs\';',
    false
  );
  
  // Update mount routes if needed
  const apiContent = await fs.readFile(apiRoutesPath, 'utf8');
  if (!apiContent.includes('router.use(\'/client-progress\'')) {
    await updateFile(
      apiRoutesPath,
      'router.use(\'/workouts\', workoutRoutes);',
      'router.use(\'/workouts\', workoutRoutes);\n\n// Mount client progress routes\nrouter.use(\'/client-progress\', clientProgressRoutes);\n\n// Mount exercise routes\nrouter.use(\'/exercises\', exerciseRoutes);',
      true
    );
  }
  
  // 4. Ensure default client progress level is set to 0 instead of 1
  console.log('\nChecking default client progress level setting...');
  
  await updateFile(
    clientProgressRoutesPath,
    'overallLevel: 1',
    'overallLevel: 0',
    false
  );
  
  console.log('\n✅ Fix API Endpoints Script completed successfully.');
  console.log('Please restart your server for the changes to take effect.');
  console.log('If you continue to have issues, check your browser console for specific error messages.');
}

// Run the main function
main().catch(error => {
  console.error('❌ Error running fix script:', error);
  process.exit(1);
});
