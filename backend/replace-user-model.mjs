/**
 * Script to back up and replace the User model
 */
import fs from 'fs';
import path from 'path';

// Get the current directory
const currentDir = path.dirname(new URL(import.meta.url).pathname);

// File paths
const originalUserPath = path.join(currentDir, 'models', 'User.mjs');
const simplifiedUserPath = path.join(currentDir, 'models', 'User.simplified.mjs');
const backupUserPath = path.join(currentDir, 'models', 'User.mjs.backup');

try {
  console.log('Starting User model replacement...');
  
  // Check if simplified user model exists
  if (!fs.existsSync(simplifiedUserPath)) {
    throw new Error('Simplified User model not found. Make sure User.simplified.mjs exists.');
  }
  
  // Check if original model exists
  if (fs.existsSync(originalUserPath)) {
    // Create a backup if not already exists
    if (!fs.existsSync(backupUserPath)) {
      console.log('Backing up original User model...');
      fs.copyFileSync(originalUserPath, backupUserPath);
      console.log('Original User model backed up to User.mjs.backup');
    } else {
      console.log('Backup already exists, skipping backup step');
    }
    
    // Delete the original file
    fs.unlinkSync(originalUserPath);
    console.log('Original User model deleted');
  }
  
  // Copy the simplified model to the original location
  fs.copyFileSync(simplifiedUserPath, originalUserPath);
  console.log('Simplified User model copied to User.mjs');
  
  console.log('User model replacement completed successfully!');
} catch (error) {
  console.error('Error during User model replacement:', error);
}