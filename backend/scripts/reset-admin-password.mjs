/**
 * Admin Password Reset Script
 * 
 * This script resets the password for an admin user in the database.
 * Run with: node reset-admin-password.mjs [username] [new-password]
 * 
 * Example: node reset-admin-password.mjs ogpswan NewPassword123!
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import sequelize from '../database.mjs';
import User from '../models/User.mjs';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRootDir = path.resolve(__dirname, '../..');

// Load environment variables
const envPath = path.resolve(projectRootDir, '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}`);
  dotenv.config(); // Try default location
}

/**
 * Reset the password for a specific user
 * @param {string} username - The username to reset password for
 * @param {string} newPassword - The new password
 * @param {boolean} forceAdmin - If true, ensures the user has admin role
 */
async function resetPassword(username, newPassword, forceAdmin = false) {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully');
    
    // Find the user
    const user = await User.findOne({ where: { username } });
    
    if (!user) {
      console.error(`User "${username}" not found`);
      process.exit(1);
    }
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update user
    const updates = { password: hashedPassword };
    
    // If forceAdmin is true, ensure the user has admin role
    if (forceAdmin && user.role !== 'admin') {
      updates.role = 'admin';
      console.log(`Setting user role to admin`);
    }
    
    await user.update(updates);
    
    console.log(`Password for ${username} (${user.firstName} ${user.lastName}) reset successfully`);
    console.log(`User role: ${user.role}`);
    
    // Close the database connection
    await sequelize.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Get arguments from command line
const args = process.argv.slice(2);
const username = args[0] || process.env.ADMIN_USERNAME || 'ogpswan';
const newPassword = args[1] || 'SwanStudios2025!';
const forceAdmin = true; // Default to forcing admin role

// Validate input
if (!username) {
  console.error('Error: Username is required');
  process.exit(1);
}

if (!newPassword) {
  console.error('Error: New password is required');
  process.exit(1);
}

// Password strength check
if (newPassword.length < 8) {
  console.warn('Warning: Password is less than 8 characters');
}

// Run the script
console.log(`Resetting password for user: ${username}`);
resetPassword(username, newPassword, forceAdmin)
  .then(() => {
    console.log('Password reset successful');
    console.log(`New login credentials:\nUsername: ${username}\nPassword: ${newPassword}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed to reset password:', err);
    process.exit(1);
  });
