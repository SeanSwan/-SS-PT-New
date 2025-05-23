/**
 * Ensure Admin User Script
 * 
 * This script checks if the admin user exists, and creates one if it doesn't.
 * Used during deployment to ensure there's always an admin user available.
 */

import sequelize from '../database.mjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import setupAssociations from '../setupAssociations.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Default admin user configuration (override with environment variables)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@swanstudios.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Admin';
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'User';

async function ensureAdminExists() {
  try {
    console.log('Setting up model associations...');
    await setupAssociations();
    
    // Get the User model from Sequelize
    const User = sequelize.models.User;
    if (!User) {
      throw new Error('User model not found. Make sure models are properly loaded.');
    }
    
    console.log(`Checking if admin user '${ADMIN_USERNAME}' exists...`);
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({
      where: {
        username: ADMIN_USERNAME
      }
    });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }
    
    console.log('Admin user not found. Creating new admin user...');
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
    
    // Create admin user
    const newAdmin = await User.create({
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      firstName: ADMIN_FIRST_NAME,
      lastName: ADMIN_LAST_NAME,
      role: 'admin', // Make sure this matches your role enum
      status: 'active',
      isVerified: true,
      profileImage: null
    });
    
    console.log('✅ Admin user created successfully');
    console.log(`Username: ${ADMIN_USERNAME}`);
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log('Role: admin');
    
    return newAdmin;
  } catch (error) {
    console.error('❌ Error ensuring admin exists:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// Run as standalone script
async function main() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    await ensureAdminExists();
    
    console.log('Admin user verification completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

// Allow importing in render-start.sh
export default ensureAdminExists;

// Run directly if called as script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
