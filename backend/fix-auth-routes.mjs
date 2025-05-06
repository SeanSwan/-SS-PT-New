/**
 * Fix Auth Routes Script
 * =====================
 * This script ensures that all routes are properly registered
 * and fixes authentication issues with client progress routes.
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
async function updateFile(filePath, findText, replaceText) {
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
    if (!content.includes(findText)) {
      console.error(`Find text not found in ${filePath}`);
      return false;
    }
    
    // Replace the text
    const updatedContent = content.replace(findText, replaceText);
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
  console.log('🔧 Running Fix Auth Routes Script...');
  
  // 1. Ensure client progress route uses standard middleware
  console.log('\nChecking client progress routes middleware...');
  
  const clientProgressRoutesPath = path.join(__dirname, 'routes', 'clientProgressRoutes.mjs');
  
  // Update imports
  await updateFile(
    clientProgressRoutesPath,
    `import { authenticateUser, authorizeRoles } from '../middleware/nasmAuthMiddleware.mjs';`,
    `import { protect, authorize } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';`
  );
  
  // Update route handler middleware
  const routeHandlers = [
    {
      find: `router.get('/', 
  authenticateUser, 
  authorizeRoles(['client']),`,
      replace: `router.get('/', 
  protect, 
  authorize(['client']),`
    },
    {
      find: `router.put('/',
  authenticateUser,
  authorizeRoles(['client']),`,
      replace: `router.put('/',
  protect,
  authorize(['client']),`
    },
    {
      find: `router.get('/leaderboard',
  authenticateUser,`,
      replace: `router.get('/leaderboard',
  protect,`
    },
    {
      find: `router.get('/:userId',
  authenticateUser,
  authorizeRoles(['trainer', 'admin']),`,
      replace: `router.get('/:userId',
  protect,
  authorize(['trainer', 'admin']),`
    },
    {
      find: `router.put('/:userId',
  authenticateUser,
  authorizeRoles(['trainer', 'admin']),`,
      replace: `router.put('/:userId',
  protect,
  authorize(['trainer', 'admin']),`
    }
  ];
  
  for (const { find, replace } of routeHandlers) {
    await updateFile(clientProgressRoutesPath, find, replace);
  }
  
  // 2. Ensure API routes are properly registered
  console.log('\nChecking API route registrations...');
  
  const apiRoutesPath = path.join(__dirname, 'routes', 'api.mjs');
  
  await updateFile(
    apiRoutesPath,
    `import { Router } from 'express';
import { getUsers } from '../controllers/userController.mjs';
import workoutRoutes from './workoutRoutes.mjs';`,
    `import { Router } from 'express';
import { getUsers } from '../controllers/userController.mjs';
import workoutRoutes from './workoutRoutes.mjs';
import clientProgressRoutes from './clientProgressRoutes.mjs';
import exerciseRoutes from './exerciseRoutes.mjs';`
  );
  
  await updateFile(
    apiRoutesPath,
    `// Mount workout routes
router.use('/workouts', workoutRoutes);`,
    `// Mount workout routes
router.use('/workouts', workoutRoutes);

// Mount client progress routes
router.use('/client-progress', clientProgressRoutes);

// Mount exercise routes
router.use('/exercises', exerciseRoutes);`
  );
  
  // 3. Ensure clientProgress uses level 0 as default
  console.log('\nChecking default client progress level setting...');
  
  await updateFile(
    clientProgressRoutesPath,
    `        defaults: {
          userId: req.user.id,
          overallLevel: 1,
          experiencePoints: 0
          // All other fields have default values in the model
        }`,
    `        defaults: {
          userId: req.user.id,
          overallLevel: 0,
          experiencePoints: 0
          // All other fields have default values in the model
        }`
  );
  
  console.log('\n✅ Fix Auth Routes Script completed successfully.');
  console.log('Please restart your server for the changes to take effect.');
}

// Run the main function
main().catch(error => {
  console.error('❌ Error running fix script:', error);
  process.exit(1);
});
