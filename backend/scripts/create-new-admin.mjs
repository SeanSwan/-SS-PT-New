/**
 * Create New Admin User Script
 * 
 * This script creates a completely new admin user with random credentials
 * as a last resort when other methods fail.
 * 
 * Run with: node create-new-admin.mjs
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import sequelize from '../database.mjs';
import crypto from 'crypto';

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
 * Generate a random string
 * @param {number} length - Length of string to generate
 * @returns {string} Random string
 */
function generateRandomString(length = 8) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

/**
 * Create a new admin user
 */
async function createNewAdmin() {
  try {
    console.log('\n===== CREATING NEW ADMIN USER =====\n');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Import User model dynamically
    const UserModule = await import('../models/User.mjs');
    const User = UserModule.default;
    
    // Generate unique credentials
    const timestamp = Date.now().toString().slice(-4);
    const username = `admin${timestamp}`;
    const password = `Admin${generateRandomString(8)}!`;
    const email = `admin${timestamp}@swanstudios.com`;
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create the new admin user
    const newAdmin = await User.create({
      username,
      email,
      firstName: 'Admin',
      lastName: 'User',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      lastActive: new Date()
    });
    
    console.log('✅ New admin user created successfully');
    
    // Display login information
    console.log('\n======= LOGIN INFORMATION =======');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log(`Email: ${email}`);
    console.log('=================================');
    
    // Save credentials to a file for reference
    const credentialsPath = path.resolve(__dirname, 'admin-credentials.txt');
    const credentialsData = `
Admin Credentials
===============================
Username: ${username}
Password: ${password}
Email: ${email}
Created: ${new Date().toISOString()}
===============================
Keep this information secure!
`;
    
    fs.writeFileSync(credentialsPath, credentialsData);
    console.log(`\nCredentials saved to: ${credentialsPath}`);
    
    // Close database connection
    await sequelize.close();
    console.log('\nDatabase connection closed');
    
    console.log('\n===== PROCESS COMPLETE =====\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.name === 'SequelizeConnectionError') {
      console.log('\nDatabase connection failed. Please check:');
      console.log('1. Database server is running');
      console.log('2. Database credentials in .env file are correct');
    }
    
    process.exit(1);
  }
}

// Run the function
createNewAdmin();
