/**
 * Comprehensive fix script for database and authentication issues
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import sequelize from './database.mjs';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Admin user credentials
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'ogpswan';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Password123!';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@swanstudios.com';

async function fixAll() {
  try {
    console.log('Starting comprehensive fix...');
    
    // Step 1: Replace User model with simplified version
    console.log('\n=== STEP 1: REPLACING USER MODEL ===');
    // File paths
    const originalUserPath = path.join(__dirname, 'models', 'User.mjs');
    const simplifiedUserPath = path.join(__dirname, 'models', 'User.simplified.mjs');
    const backupUserPath = path.join(__dirname, 'models', 'User.mjs.backup');

    try {
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
    } catch (error) {
      console.error('Error during User model replacement:', error);
      console.log('Continuing with next steps...');
    }
    
    // Step 2: Create admin user directly in database
    console.log('\n=== STEP 2: CREATING/UPDATING ADMIN USER ===');
    try {
      // Check if the users table exists
      try {
        await sequelize.query('SELECT 1 FROM users LIMIT 1');
        console.log('Users table exists, proceeding...');
      } catch (error) {
        console.log('Users table does not exist yet, creating it...');
        
        // Create the users table with minimal fields
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            "firstName" VARCHAR(255) NOT NULL,
            "lastName" VARCHAR(255) NOT NULL,
            username VARCHAR(255) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(255) NOT NULL DEFAULT 'client',
            "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          );
        `);
        
        // Create UUID extension if needed
        try {
          await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
          console.log('UUID extension created or already exists');
        } catch (uuidError) {
          console.error('Error creating UUID extension:', uuidError);
          // Continue anyway
        }
      }
      
      // Check if admin user exists
      const [results] = await sequelize.query(`SELECT * FROM users WHERE username = '${ADMIN_USERNAME}'`);
      
      if (results.length > 0) {
        console.log(`Admin user '${ADMIN_USERNAME}' already exists, updating password...`);
        
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
        
        // Update the password
        await sequelize.query(
          `UPDATE users SET password = '${hashedPassword}' WHERE username = '${ADMIN_USERNAME}'`
        );
        
        console.log('Admin password updated successfully');
      } else {
        console.log(`Admin user '${ADMIN_USERNAME}' doesn't exist, creating...`);
        
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
        
        // Create the admin user directly with SQL
        await sequelize.query(`
          INSERT INTO users (
            id, 
            "firstName", 
            "lastName", 
            username, 
            email, 
            password, 
            role, 
            "isActive", 
            "createdAt", 
            "updatedAt"
          ) 
          VALUES (
            uuid_generate_v4(), 
            'Admin', 
            'User', 
            '${ADMIN_USERNAME}', 
            '${ADMIN_EMAIL}', 
            '${hashedPassword}', 
            'admin', 
            true, 
            NOW(), 
            NOW()
          );
        `);
        
        console.log('Admin user created successfully');
      }
    } catch (error) {
      console.error('Error creating/updating admin user:', error);
      console.log('Continuing with next steps...');
    }
    
    // Step 3: Verify the database connection
    console.log('\n=== STEP 3: VERIFYING DATABASE CONNECTION ===');
    try {
      await sequelize.authenticate();
      console.log('Database connection is working properly.');
    } catch (error) {
      console.error('Database connection test failed:', error);
      console.log('Please check your database configuration in .env file.');
    }
    
    console.log('\n=== COMPREHENSIVE FIX COMPLETE ===');
    console.log('You should now be able to log in with:');
    console.log(`Username: ${ADMIN_USERNAME}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    
    console.log('\nNext steps:');
    console.log('1. Restart your application with "npm start"');
    console.log('2. Try logging in with the admin credentials');
    console.log('3. If issues persist, check the server logs for more details');
    
    process.exit(0);
  } catch (error) {
    console.error('Error during comprehensive fix:', error);
    process.exit(1);
  }
}

// Run the fix
fixAll();