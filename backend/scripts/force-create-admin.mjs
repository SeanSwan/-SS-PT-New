// backend/scripts/force-create-admin.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { QueryTypes } from 'sequelize';
import crypto from 'crypto';

// --- Environment Loading ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRootDir = path.resolve(__dirname, '..', '..'); // Go up two levels
const envPath = path.resolve(projectRootDir, '.env');

if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}.`);
  dotenv.config(); // Try default
}

// --- Imports (AFTER dotenv) ---
import sequelize from '../database.mjs'; // Import configured sequelize instance

// --- Config ---
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'password123';
const ADMIN_EMAIL = 'admin@swanstudios.com';
const ADMIN_FIRST_NAME = 'Admin';
const ADMIN_LAST_NAME = 'User';

// --- Main Function ---
async function forceCreateAdmin() {
  console.log('--- FORCE CREATE ADMIN USER ---');
  
  try {
    // 1. Connect to DB
    console.log('\nConnecting to database...');
    await sequelize.authenticate(); // Test connection
    console.log('✅ Database connection successful.');
    
    // 2. Check if the users table exists
    console.log('Checking for users table...');
    const tableCheck = await sequelize.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_name = 'users'`,
      { type: QueryTypes.SELECT }
    );
    
    if (tableCheck.length === 0) {
      throw new Error('Users table does not exist! Run db:reset first.');
    }
    console.log('✅ Users table exists.');
    
    // 3. Check if admin user already exists
    console.log('Checking if admin user already exists...');
    const existingAdmin = await sequelize.query(
      `SELECT id, username FROM users WHERE username = :username`,
      {
        replacements: { username: ADMIN_USERNAME },
        type: QueryTypes.SELECT
      }
    );
    
    if (existingAdmin.length > 0) {
      console.log(`Admin user '${ADMIN_USERNAME}' already exists with ID: ${existingAdmin[0].id}.`);
      console.log('Updating password instead of creating new user...');
      
      // 4a. Update existing admin's password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
      
      await sequelize.query(
        `UPDATE users
         SET password = :password,
             "updatedAt" = NOW()
         WHERE username = :username`,
        {
          replacements: {
            username: ADMIN_USERNAME,
            password: hashedPassword
          },
          type: QueryTypes.UPDATE
        }
      );
      
      console.log(`✅ Updated password for existing admin user '${ADMIN_USERNAME}'.`);
    } else {
      // 4b. Create new admin user
      console.log(`Creating new admin user '${ADMIN_USERNAME}'...`);
      
      // Generate password hash
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
      
      // Generate UUID for ID
      const uuid = crypto.randomUUID();
      
      await sequelize.query(
        `INSERT INTO users (
           id,
           username,
           email,
           "firstName",
           "lastName",
           password,
           role,
           "isActive",
           "createdAt",
           "updatedAt"
         ) VALUES (
           :id,
           :username,
           :email,
           :firstName,
           :lastName,
           :password,
           'admin',
           TRUE,
           NOW(),
           NOW()
         )`,
        {
          replacements: {
            id: uuid,
            username: ADMIN_USERNAME,
            email: ADMIN_EMAIL,
            firstName: ADMIN_FIRST_NAME,
            lastName: ADMIN_LAST_NAME,
            password: hashedPassword
          },
          type: QueryTypes.INSERT
        }
      );
      
      console.log(`✅ Created new admin user '${ADMIN_USERNAME}'.`);
    }
    
    // 5. Success message
    console.log('\n🔐 ADMIN USER READY! 🔐');
    console.log('-------------------------------------');
    console.log(`USERNAME: ${ADMIN_USERNAME}`);
    console.log(`PASSWORD: ${ADMIN_PASSWORD}`);
    console.log('-------------------------------------');
    console.log('\nUse these credentials to log in.');
    
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    console.error('Admin user creation failed.');
    if (error.stack && process.env.NODE_ENV !== 'production') {
      console.error("\nStack Trace:");
      console.error(error.stack);
    }
    process.exitCode = 1; // Indicate failure
  } finally {
    // Always close the database connection
    await sequelize.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the function
forceCreateAdmin();
