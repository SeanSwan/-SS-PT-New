/**
 * Quick Admin Password Reset
 * 
 * This script automatically resets the admin password using credentials from .env
 * Run with: node quick-admin-reset.mjs
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

// Load environment variables from project root
const envPath = path.resolve(projectRootDir, '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}`);
  dotenv.config(); // Try default location
}

/**
 * Reset the admin password or create admin if not exists
 */
async function resetOrCreateAdmin() {
  try {
    // Extract admin credentials from environment variables
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminFirstName = process.env.ADMIN_FIRST_NAME;
    const adminLastName = process.env.ADMIN_LAST_NAME;
    
    // New fixed password that will be set
    const newPassword = 'Admin123!';
    
    if (!adminUsername) {
      console.error('ADMIN_USERNAME not found in environment variables');
      process.exit(1);
    }
    
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully');
    
    // Find the admin user
    let user = await User.findOne({ where: { username: adminUsername } });
    
    // If user exists, reset password
    if (user) {
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Update user
      await user.update({ 
        password: hashedPassword,
        role: 'admin' // Ensure role is admin
      });
      
      console.log(`Password for ${user.username} (${user.firstName} ${user.lastName}) reset successfully`);
    } 
    // Otherwise create a new admin user
    else {
      if (!adminEmail || !adminFirstName || !adminLastName) {
        console.warn('Admin email, first name, or last name not found in env vars. Using defaults.');
      }
      
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Create new admin user
      user = await User.create({
        username: adminUsername,
        email: adminEmail || 'admin@swanstudios.com',
        firstName: adminFirstName || 'Admin',
        lastName: adminLastName || 'User',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        lastActive: new Date()
      });
      
      console.log(`New admin user created: ${user.username}`);
    }
    
    // Display login information
    console.log('\n========== LOGIN INFORMATION ==========');
    console.log(`Username: ${user.username}`);
    console.log(`Password: ${newPassword}`);
    console.log('======================================\n');
    
    // Close the database connection
    await sequelize.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the script
console.log('Starting admin password reset process...');
resetOrCreateAdmin()
  .then(() => {
    console.log('Admin access restored successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed to reset admin password:', err);
    process.exit(1);
  });
