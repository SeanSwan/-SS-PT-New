// backend/scripts/direct-password-fix.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { QueryTypes } from 'sequelize';

// --- Environment Loading ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRootDir = path.resolve(__dirname, '..', '..'); // Go up two levels
const envPath = path.resolve(projectRootDir, '.env');

if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}. Script might fail if DB requires env vars.`);
  dotenv.config(); // Try default
}

// --- Imports (AFTER dotenv) ---
import sequelize from '../database.mjs'; // Import configured sequelize instance

// --- Static Configuration ---
// We'll hardcode values to make this script work reliably
const ADMIN_USERNAME = 'ogpswan'; // Change to your admin username if different
const ADMIN_ALT_USERNAME = 'admin'; // Alternative admin username
const NEW_PASSWORD = 'password123'; // Simple password that's easy to remember

// --- Main Function ---
async function directPasswordFix() {
  console.log('--- EMERGENCY Direct Password Fix Script ---');
  console.log('This script directly updates the database to fix login issues');
  
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
    
    // 3. Try to find admin user with both possible usernames
    console.log(`Looking for admin user ('${ADMIN_USERNAME}' or '${ADMIN_ALT_USERNAME}')...`);
    const adminUsers = await sequelize.query(
      `SELECT id, username, "firstName", "lastName", email, role
       FROM users
       WHERE username IN (:username1, :username2)
       AND role = 'admin'`,
      {
        replacements: { username1: ADMIN_USERNAME, username2: ADMIN_ALT_USERNAME },
        type: QueryTypes.SELECT
      }
    );
    
    if (adminUsers.length === 0) {
      throw new Error(`No admin user found with username '${ADMIN_USERNAME}' or '${ADMIN_ALT_USERNAME}'`);
    }
    
    const adminUser = adminUsers[0];
    console.log(`✅ Found admin user: ${adminUser.username} (${adminUser.firstName} ${adminUser.lastName})`);
    console.log(`   Email: ${adminUser.email}, ID: ${adminUser.id}`);
    
    // 4. Create a strong password hash
    console.log('\nGenerating password hash...');
    // Use higher salt rounds (12) for stronger security
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(NEW_PASSWORD, salt);
    console.log('✅ Password hash generated.');
    
    // 5. Directly update the password field in the database
    console.log(`\nUpdating password for ${adminUser.username} (ID: ${adminUser.id})...`);
    await sequelize.query(
      `UPDATE users
       SET password = :passwordHash,
           "updatedAt" = NOW()
       WHERE id = :userId`,
      {
        replacements: { 
          passwordHash: passwordHash,
          userId: adminUser.id
        },
        type: QueryTypes.UPDATE
      }
    );
    
    console.log(`\n✅ SUCCESS! Password for '${adminUser.username}' has been reset.`);
    console.log(`\n------------------------------------------------------`);
    console.log(`LOGIN CREDENTIALS`);
    console.log(`Username: ${adminUser.username}`);
    console.log(`Password: ${NEW_PASSWORD}`);
    console.log(`------------------------------------------------------`);
    console.log(`\nUse these credentials to log in to the application.`);
    console.log('If login still fails, please report the exact error message.');
    
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    console.error('Password reset failed.');
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

// Run the function immediately
directPasswordFix();
